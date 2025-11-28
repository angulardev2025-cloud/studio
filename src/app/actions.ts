
'use server';

import { sub } from 'date-fns';
import { channelUrls } from '@/lib/channels';
import type { FetcherState, VideoData, ChannelData } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const OFFLINE_DATA_PATH = path.join(process.cwd(), 'src', 'data', 'youtube-feed.json');
const CHANNEL_CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'channel-cache.json');

// --- Channel Cache Helpers ---
type ChannelCacheEntry = { 
  channelId: string;
  type: 'handle' | 'username' | 'id';
  title?: string;
  thumbnailUrl?: string;
};

type ChannelCache = {
  [key: string]: ChannelCacheEntry;
};

async function readChannelCache(): Promise<ChannelCache> {
  try {
    await fs.access(CHANNEL_CACHE_PATH);
    const fileContent = await fs.readFile(CHANNEL_CACHE_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    return {};
  }
}

async function writeChannelCache(cache: ChannelCache): Promise<void> {
  try {
    const directory = path.dirname(CHANNEL_CACHE_PATH);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(CHANNEL_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write channel cache:', error);
  }
}


// --- Offline Video Data Helpers ---
async function readOfflineData(): Promise<VideoData[]> {
  try {
    await fs.access(OFFLINE_DATA_PATH);
    const fileContent = await fs.readFile(OFFLINE_DATA_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    return [];
  }
}

async function writeOfflineData(data: VideoData[]): Promise<void> {
  try {
    const directory = path.dirname(OFFLINE_DATA_PATH);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(OFFLINE_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write offline data:', error);
  }
}

// Helper function to extract channel ID or handle from URL
const getChannelIdentifier = (url: string): { id: string; type: 'id' | 'handle' | 'username' } | null => {
  try {
    const urlObj = new URL(url);
    const pathname = decodeURIComponent(urlObj.pathname);

    const channelIdMatch = pathname.match(/\/channel\/(UC[\w-]{22,24})/);
    if (channelIdMatch?.[1]) {
      return { id: channelIdMatch[1], type: 'id' };
    }

    const handleMatch = pathname.match(/\/@([\w.-]+)/) || pathname.match(/\/%40([\w.-]+)/);
    if (handleMatch?.[1]) {
      return { id: handleMatch[1], type: 'handle' };
    }
    
    const userOrCNameMatch = pathname.match(/\/(?:user|c)\/([\w.-]+)/);
    if (userOrCNameMatch?.[1]) {
      return { id: userOrCNameMatch[1], type: 'username' };
    }
    
    const customNameMatch = pathname.match(/^\/([\w.-]+)$/);
    if (customNameMatch?.[1] && !customNameMatch[1].startsWith('@')) {
       return { id: customNameMatch[1], type: 'username' };
    }


    return null;
  } catch (error) {
    console.error(`Error parsing channel URL "${url}":`, error);
    return null;
  }
};


// Helper to fetch data from YouTube API
async function fetchApi(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } }); 
  if (!response.ok) {
     if (response.status === 403) {
      try {
        const errorData = await response.json();
        const reason = errorData.error?.errors?.[0]?.reason;
        if (reason === 'quotaExceeded') {
          throw new Error('The YouTube API daily quota has been exceeded. Please try again tomorrow.');
        }
      } catch (e) {
      }
      throw new Error('Access to the YouTube API was denied. Please ensure your YT_API_KEY is correct and that the YouTube Data API v3 is enabled in your Google Cloud project.');
    }
    try {
        const errorData = await response.json();
        console.error('YouTube API Error:', errorData);
        throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
    } catch (jsonError) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }
  }
  return response.json();
}


// Fetches all videos for a single channel playlist
async function fetchVideosForPlaylist(playlistId: string, channelTitle: string, apiKey: string, hits: { count: number }): Promise<VideoData[]> {
    const fourWeeksAgo = sub(new Date(), { weeks: 4 });
    let allVideoItems: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
        try {
            hits.count++;
            const playlistData = await fetchApi('playlistItems', {
                part: 'snippet',
                playlistId: playlistId,
                maxResults: '50',
                pageToken: nextPageToken || '',
                key: apiKey,
            });

            if (playlistData.items) {
                allVideoItems.push(...playlistData.items);
            }
            
            if (playlistData.items && playlistData.items.length > 0) {
                const lastItem = playlistData.items[playlistData.items.length - 1];
                if (lastItem.snippet?.publishedAt) {
                    const publishedAt = new Date(lastItem.snippet.publishedAt);
                    if (publishedAt < fourWeeksAgo) {
                        nextPageToken = undefined;
                    } else {
                        nextPageToken = playlistData.nextPageToken;
                    }
                } else {
                     nextPageToken = playlistData.nextPageToken;
                }
            } else {
                 nextPageToken = playlistData.nextPageToken;
            }

        } catch (error) {
            console.error(`Error fetching playlist items for playlist ${playlistId}:`, error);
            break; 
        }
    } while (nextPageToken);

    const recentVideoItems = allVideoItems.filter(item => {
        if (!item.snippet?.publishedAt) return false;
        const publishedAt = new Date(item.snippet.publishedAt);
        return publishedAt >= fourWeeksAgo;
    });

    return recentVideoItems
        .filter(item => item.snippet?.resourceId?.videoId)
        .map((item: any) => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            publishedAt: item.snippet.publishedAt,
            thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            uploader: channelTitle,
            shareLink: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        }));
}

async function getOfflineFetcherState(): Promise<FetcherState> {
    const offlineData = await readOfflineData();
    if (offlineData.length === 0) {
        return { data: [], error: null, message: 'Offline cache is empty. Click "Fetch Videos" to populate it.', hits: 0 };
    }
    return { data: offlineData, error: null, message: 'Loaded videos from offline cache.', hits: 0 };
}


export async function fetchYouTubeFeed({ offline = false }: { offline?: boolean } = {}): Promise<FetcherState> {
  if (offline) {
    return getOfflineFetcherState();
  }

  const apiKey = process.env.YT_API_KEY;
  const hits = { count: 0 };

  if (!apiKey) {
    return { data: null, error: 'YouTube API key (YT_API_KEY) is not configured in environment variables.', message: null, hits: hits.count };
  }

  if (!channelUrls || channelUrls.length === 0) {
    return { data: [], error: null, message: 'No channels configured.', hits: hits.count };
  }
  
  const existingOfflineData = await readOfflineData();
  const channelCache = await readChannelCache();
  let cacheNeedsUpdate = false;

  try {
    const idsToFetch = new Set<string>();
    const usernamesToFetch = new Set<string>();
    const handlesToFetch = new Set<string>();

    channelUrls.forEach(url => {
        const identifier = getChannelIdentifier(url);
        if (identifier) {
            const cacheKey = identifier.id;
            if (channelCache[cacheKey]) {
                idsToFetch.add(channelCache[cacheKey].channelId);
            } else if (identifier.type === 'id') {
                idsToFetch.add(identifier.id);
            } else if (identifier.type === 'username') {
                usernamesToFetch.add(identifier.id);
            } else if (identifier.type === 'handle') {
                handlesToFetch.add(identifier.id);
            }
        } else {
            console.warn(`Could not identify channel from URL: ${url}`);
        }
    });

    const channelDetailsMap = new Map<string, { title: string; uploadsPlaylistId: string }>();

    // Step 1: Resolve usernames to channel IDs
    for (const user of usernamesToFetch) {
        try {
            hits.count++;
            const data = await fetchApi('channels', { part: 'id', forUsername: user, key: apiKey });
            if (data.items && data.items.length > 0) {
                const channelId = data.items[0].id;
                idsToFetch.add(channelId);
                channelCache[user] = { channelId, type: 'username' };
                cacheNeedsUpdate = true;
            } else {
                console.warn(`Could not resolve username: ${user}`);
            }
        } catch (error) {
            console.error(`Failed to fetch details for username ${user}:`, error);
        }
    }

    // Step 2: Resolve handles to channel IDs (expensive)
    for (const handle of handlesToFetch) {
        try {
            hits.count++;
            const searchData = await fetchApi('search', {
                part: 'snippet', q: `@${handle}`, type: 'channel', maxResults: '1', key: apiKey,
            });
            if (searchData.items?.length > 0 && searchData.items[0].id.channelId) {
                const channelId = searchData.items[0].id.channelId;
                idsToFetch.add(channelId);
                channelCache[handle] = { channelId, type: 'handle' };
                cacheNeedsUpdate = true;
            } else {
                console.warn(`Could not resolve handle: @${handle}`);
            }
        } catch (error) {
            console.error(`Failed to fetch details for handle @${handle}:`, error);
        }
    }

    // Step 3: Batch fetch details for all collected IDs
    const idArray = Array.from(idsToFetch);
    if (idArray.length > 0) {
        const idChunks = [];
        for (let i = 0; i < idArray.length; i += 50) {
            idChunks.push(idArray.slice(i, i + 50));
        }
        for (const chunk of idChunks) {
            hits.count++;
            const data = await fetchApi('channels', { part: 'snippet,contentDetails', id: chunk.join(','), key: apiKey });
            if (data.items) {
                data.items.forEach((item: any) => {
                    if (item.id && item.snippet?.title && item.contentDetails?.relatedPlaylists?.uploads) {
                        channelDetailsMap.set(item.id, {
                            title: item.snippet.title,
                            uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
                        });
                    }
                });
            }
        }
    }
    
    // Update cache if new items were added
    if (cacheNeedsUpdate) {
        await writeChannelCache(channelCache);
    }

    // Step 4: Fetch videos from all resolved playlists in parallel
    const playlistPromises = Array.from(channelDetailsMap.values()).map(details =>
        fetchVideosForPlaylist(details.uploadsPlaylistId, details.title, apiKey, hits)
    );

    const allFetchedVideos = (await Promise.all(playlistPromises)).flat();
    
    // Step 5: Merge, sort, and save
    const combinedVideos = [...existingOfflineData, ...allFetchedVideos];
    const uniqueVideosMap = new Map<string, VideoData>();
    combinedVideos.forEach(video => {
      uniqueVideosMap.set(video.id, video);
    });
    const allUniqueVideos = Array.from(uniqueVideosMap.values());
    allUniqueVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    await writeOfflineData(allUniqueVideos);

    return { data: allUniqueVideos, error: null, message: `Successfully fetched ${allFetchedVideos.length} new videos from ${channelDetailsMap.size} channels. Total unique videos: ${allUniqueVideos.length}.`, hits: hits.count };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    console.error("Error in fetchYouTubeFeed:", errorMessage);
    
    if (errorMessage.includes('quota has been exceeded') || errorMessage.includes('Access to the YouTube API was denied')) {
        console.log('API key or quota error detected. Falling back to offline data.');
        return { data: existingOfflineData, error: `API Error: ${errorMessage}`, message: 'Displaying data from offline cache due to API error.', hits: hits.count };
    }
    
    return { data: existingOfflineData, error: `API Error: ${errorMessage}`, message: 'An error occurred. Displaying data from offline cache.', hits: hits.count };
  }
}


export async function fetchChannelDetails(): Promise<{ channels: ChannelData[] }> {
    const apiKey = process.env.YT_API_KEY;
    if (!apiKey) {
      throw new Error('YouTube API key (YT_API_KEY) is not configured.');
    }
  
    const channelCache = await readChannelCache();
    let cacheNeedsUpdate = false;
    const hits = { count: 0 };
  
    // Identify channels that need fetching
    const channelsToFetchDetailsFor = new Set<string>();
    const identifiers = channelUrls.map(getChannelIdentifier).filter(Boolean) as { id: string; type: 'id' | 'handle' | 'username' }[];
  
    for (const identifier of identifiers) {
      const cacheKey = identifier.id;
      if (!channelCache[cacheKey] || !channelCache[cacheKey].thumbnailUrl || !channelCache[cacheKey].title) {
        if (identifier.type === 'id') {
          channelsToFetchDetailsFor.add(identifier.id);
        } else {
            // This will be resolved later if not in cache
            channelsToFetchDetailsFor.add(cacheKey);
        }
      }
    }
  
    // Resolve handles/usernames to IDs if needed
    const resolvedIds = new Set<string>();
    for (const key of channelsToFetchDetailsFor) {
      if (channelCache[key]) {
        resolvedIds.add(channelCache[key].channelId);
      } else {
        const identifier = getChannelIdentifier(channelUrls.find(url => url.includes(key)) || '');
        if (!identifier) continue;
  
        let channelId: string | null = null;
        if (identifier.type === 'id') {
            channelId = identifier.id;
        } else if (identifier.type === 'username') {
          hits.count++;
          const data = await fetchApi('channels', { part: 'id', forUsername: identifier.id, key: apiKey });
          channelId = data.items?.[0]?.id;
        } else if (identifier.type === 'handle') {
          hits.count++;
          const data = await fetchApi('search', { part: 'id', q: `@${identifier.id}`, type: 'channel', key: apiKey });
          channelId = data.items?.[0]?.id.channelId;
        }
  
        if (channelId) {
          resolvedIds.add(channelId);
          channelCache[key] = { ...(channelCache[key] || {type: identifier.type}), channelId };
          cacheNeedsUpdate = true;
        }
      }
    }
  
    // Batch fetch details for all required IDs
    const idArray = Array.from(resolvedIds);
    if (idArray.length > 0) {
        const idChunks = [];
        for (let i = 0; i < idArray.length; i += 50) {
            idChunks.push(idArray.slice(i, i + 50));
        }

        for (const chunk of idChunks) {
            hits.count++;
            const data = await fetchApi('channels', { part: 'snippet', id: chunk.join(','), key: apiKey });
            if (data.items) {
                data.items.forEach((item: any) => {
                    const originalKey = Object.keys(channelCache).find(key => channelCache[key].channelId === item.id) || item.id;
                    channelCache[originalKey] = {
                        ...channelCache[originalKey],
                        channelId: item.id,
                        title: item.snippet.title,
                        thumbnailUrl: item.snippet.thumbnails.default.url
                    };
                    cacheNeedsUpdate = true;
                });
            }
        }
    }
  
    if (cacheNeedsUpdate) {
      await writeChannelCache(channelCache);
    }
  
    // Construct the final list from URLs and cache
    const detailedChannels: ChannelData[] = channelUrls.map(url => {
      const identifier = getChannelIdentifier(url);
      const cacheKey = identifier?.id || '';
      const cacheEntry = channelCache[cacheKey];
      
      const getTitleFromUrl = (url:string) => {
        try {
            const path = new URL(url).pathname;
            const parts = path.split('/').filter(p => p);
            return parts.length > 0 ? (parts[parts.length - 1].startsWith('@') ? parts[parts.length - 1] : parts[parts.length-1]) : url;
        } catch { return url; }
      }
  
      return {
        url,
        title: cacheEntry?.title || getTitleFromUrl(url),
        thumbnailUrl: cacheEntry?.thumbnailUrl || 'https://placehold.co/88x88/cccccc/333333?text=?',
      };
    }).sort((a,b) => a.title.localeCompare(b.title));
  
    return { channels: detailedChannels };
  }
