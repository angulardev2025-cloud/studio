
'use server';

import { sub } from 'date-fns';
import { channelUrls } from '@/lib/channels';
import type { FetcherState, VideoData } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const OFFLINE_DATA_PATH = path.join(process.cwd(), 'src', 'data', 'youtube-feed.json');

// Helper to read data from the offline JSON file
async function readOfflineData(): Promise<VideoData[]> {
  try {
    await fs.access(OFFLINE_DATA_PATH);
    const fileContent = await fs.readFile(OFFLINE_DATA_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // If the file doesn't exist, return an empty array
    return [];
  }
}

// Helper to write data to the offline JSON file
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

    // Matches /channel/UC...
    const channelIdMatch = pathname.match(/\/channel\/(UC[\w-]{24})/);
    if (channelIdMatch?.[1]) {
      return { id: channelIdMatch[1], type: 'id' };
    }

    // Matches /@handle or /%40handle
    const handleMatch = pathname.match(/\/@([\w.-]+)/) || pathname.match(/\/%40([\w.-]+)/);
    if (handleMatch?.[1]) {
      return { id: handleMatch[1], type: 'handle' };
    }
    
    // Matches /user/username or /c/channelname
    const userOrCNameMatch = pathname.match(/\/(?:user|c)\/([\w.-]+)/);
    if (userOrCNameMatch?.[1]) {
      return { id: userOrCNameMatch[1], type: 'username' };
    }
    
    // Matches /channelname (less specific, last resort for things like /beebomco)
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

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } }); // Cache for 1 hour
  if (!response.ok) {
     if (response.status === 403) {
      try {
        const errorData = await response.json();
        const reason = errorData.error?.errors?.[0]?.reason;
        if (reason === 'quotaExceeded') {
          throw new Error('The YouTube API daily quota has been exceeded. Please try again tomorrow.');
        }
      } catch (e) {
        // If parsing the 403 error fails, fall through to the generic 403 message
      }
      throw new Error('Access to the YouTube API was denied. Please ensure your YT_API_KEY is correct and that the YouTube Data API v3 is enabled in your Google Cloud project.');
    }
    try {
        const errorData = await response.json();
        console.error('YouTube API Error:', errorData);
        throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
    } catch (jsonError) {
        // If parsing JSON fails, throw a more generic error with the status text
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }
  }
  return response.json();
}


// Fetches all videos for a single channel playlist
async function fetchVideosForPlaylist(playlistId: string, channelTitle: string, apiKey: string, hits: { count: number }): Promise<VideoData[]> {
    const twoWeeksAgo = sub(new Date(), { weeks: 2 });
    let allVideoItems: any[] = [];
    let nextPageToken: string | undefined = undefined;
    let shouldStop = false;

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
              for (const item of playlistData.items) {
                  if (item.snippet?.publishedAt) {
                    const publishedAt = new Date(item.snippet.publishedAt);
                    if (publishedAt < twoWeeksAgo) {
                        shouldStop = true;
                        break;
                    }
                    allVideoItems.push(item);
                  }
              }
            }
            
            if (shouldStop) break;

            nextPageToken = playlistData.nextPageToken;
        } catch (error) {
            console.error(`Error fetching playlist items for playlist ${playlistId}:`, error);
            // Stop paginating for this playlist if an error occurs
            break; 
        }
    } while (nextPageToken);

    return allVideoItems
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

// Main server action to fetch, combine, and sort videos from all channels
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

  try {
    // Step 1: Separate identifiers by type
    const idsToFetch: string[] = [];
    const usernamesToFetch: string[] = [];
    const handlesToFetch: string[] = [];
    
    channelUrls.forEach(url => {
        const identifier = getChannelIdentifier(url);
        if (identifier) {
            if (identifier.type === 'id') idsToFetch.push(identifier.id);
            else if (identifier.type === 'username') usernamesToFetch.push(identifier.id);
            else if (identifier.type === 'handle') handlesToFetch.push(identifier.id);
        } else {
            console.warn(`Could not identify channel from URL: ${url}`);
        }
    });

    const channelDetailsMap = new Map<string, { title: string; uploadsPlaylistId: string }>();

    // Step 2: Batch fetch for IDs
    if (idsToFetch.length > 0) {
        const idChunks = [];
        for (let i = 0; i < idsToFetch.length; i += 50) {
            idChunks.push(idsToFetch.slice(i, i + 50));
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

    // Step 3: Batch fetch for usernames
     if (usernamesToFetch.length > 0) {
        for (const user of usernamesToFetch) {
             try {
                hits.count++;
                const data = await fetchApi('channels', { part: 'snippet,contentDetails', forUsername: user, key: apiKey });
                if (data.items && data.items.length > 0) {
                    const item = data.items[0];
                    if (item.id && item.snippet?.title && item.contentDetails?.relatedPlaylists?.uploads) {
                        channelDetailsMap.set(item.id, {
                            title: item.snippet.title,
                            uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
                        });
                    }
                }
             } catch (error) {
                console.error(`Failed to fetch details for username ${user}:`, error);
             }
        }
    }
    

    // Step 4: Fetch handles one by one using search (unfortunately, no batch endpoint for handles)
    for (const handle of handlesToFetch) {
        try {
            hits.count++;
            const searchData = await fetchApi('search', {
                part: 'snippet',
                q: `@${handle}`,
                type: 'channel',
                maxResults: '1',
                key: apiKey,
            });
            if (searchData.items?.length > 0 && searchData.items[0].id.channelId) {
                const channelId = searchData.items[0].id.channelId;
                const channelTitle = searchData.items[0].snippet.title;
                // Now fetch contentDetails for the uploads playlist
                hits.count++;
                const channelData = await fetchApi('channels', {
                    part: 'contentDetails',
                    id: channelId,
                    key: apiKey
                });
                if (channelData.items?.length > 0 && channelData.items[0].contentDetails?.relatedPlaylists?.uploads) {
                    channelDetailsMap.set(channelId, {
                        title: channelTitle,
                        uploadsPlaylistId: channelData.items[0].contentDetails.relatedPlaylists.uploads,
                    });
                }
            } else {
                 console.warn(`Could not resolve handle: @${handle}`);
            }
        } catch (error) {
            console.error(`Failed to fetch details for handle @${handle}:`, error);
        }
    }

    // Step 5: Fetch videos from all resolved playlists in parallel
    const playlistPromises = Array.from(channelDetailsMap.values()).map(details => 
        fetchVideosForPlaylist(details.uploadsPlaylistId, details.title, apiKey, hits)
    );

    const allFetchedVideos = (await Promise.all(playlistPromises)).flat();
    
    // Step 6: Merge, sort, and save
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
