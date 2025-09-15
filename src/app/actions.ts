
'use server';

import { sub } from 'date-fns';
import { channelUrls } from '@/lib/channels';
import type { FetcherState, VideoData } from '@/lib/types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Helper function to extract channel ID or handle from URL
const getChannelIdentifier = (url: string): { id: string; type: 'id' | 'handle' | 'username', channelUrl: string } | null => {
  try {
    const urlObj = new URL(url);
    const pathname = decodeURIComponent(urlObj.pathname);

    // Matches /channel/UC...
    const channelIdMatch = pathname.match(/\/channel\/(UC[\w-]{24})/);
    if (channelIdMatch?.[1]) {
      return { id: channelIdMatch[1], type: 'id', channelUrl: url };
    }

    // Matches /@handle or /%40handle
    const handleMatch = pathname.match(/\/@([\w.-]+)/) || pathname.match(/\/%40([\w.-]+)/);
    if (handleMatch?.[1]) {
      return { id: handleMatch[1], type: 'handle', channelUrl: url };
    }

    // Matches /user/username or /c/channelname
    const userOrCNameMatch = pathname.match(/\/(?:user|c)\/([\w.-]+)/);
    if (userOrCNameMatch?.[1]) {
      return { id: userOrCNameMatch[1], type: 'username', channelUrl: url };
    }
    
    // Matches /channelname (less specific, last resort for things like /beebomco)
    const customNameMatch = pathname.match(/^\/([\w.-]+)$/);
    if (customNameMatch?.[1] && !customNameMatch[1].startsWith('@')) {
       return { id: customNameMatch[1], type: 'username', channelUrl: url };
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
async function fetchVideosForPlaylist(playlistId: string, channelTitle: string, channelUrl: string, apiKey: string, hits: { count: number }): Promise<VideoData[]> {
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
            channelUrl: channelUrl,
        }));
}

async function getOfflineFetcherState(): Promise<FetcherState> {
    return { data: [], error: null, message: 'Offline mode uses previously fetched data. Click "Fetch Videos" to get the latest content.', hits: 0 };
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

  try {
    // Step 1: Separate identifiers by type
    const idsToFetch: {id: string, channelUrl: string}[] = [];
    const usernamesToFetch: {id: string, channelUrl: string}[] = [];
    const handlesToFetch: {id: string, channelUrl: string}[] = [];
    
    channelUrls.forEach(url => {
        const identifier = getChannelIdentifier(url);
        if (identifier) {
            if (identifier.type === 'id') idsToFetch.push({id: identifier.id, channelUrl: identifier.channelUrl});
            else if (identifier.type === 'username') usernamesToFetch.push({id: identifier.id, channelUrl: identifier.channelUrl});
            else if (identifier.type === 'handle') handlesToFetch.push({id: identifier.id, channelUrl: identifier.channelUrl});
        } else {
            console.warn(`Could not identify channel from URL: ${url}`);
        }
    });

    const channelDetailsMap = new Map<string, { title: string; uploadsPlaylistId: string, channelUrl: string }>();

    // Step 2: Batch fetch for IDs
    if (idsToFetch.length > 0) {
        const idChunks = [];
        for (let i = 0; i < idsToFetch.length; i += 50) {
            idChunks.push(idsToFetch.slice(i, i + 50));
        }
        for (const chunk of idChunks) {
            hits.count++;
            const data = await fetchApi('channels', { part: 'snippet,contentDetails', id: chunk.map(c => c.id).join(','), key: apiKey });
            if (data.items) {
                data.items.forEach((item: any) => {
                    if (item.id && item.snippet?.title && item.contentDetails?.relatedPlaylists?.uploads) {
                        const originalIdentifier = chunk.find(c => c.id === item.id);
                        channelDetailsMap.set(item.id, {
                            title: item.snippet.title,
                            uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
                            channelUrl: originalIdentifier?.channelUrl || ''
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
                const data = await fetchApi('channels', { part: 'snippet,contentDetails', forUsername: user.id, key: apiKey });
                if (data.items && data.items.length > 0) {
                    const item = data.items[0];
                    if (item.id && item.snippet?.title && item.contentDetails?.relatedPlaylists?.uploads) {
                        channelDetailsMap.set(item.id, {
                            title: item.snippet.title,
                            uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
                            channelUrl: user.channelUrl,
                        });
                    }
                }
             } catch (error) {
                console.error(`Failed to fetch details for username ${user.id}:`, error);
             }
        }
    }

    // Step 4: Fetch handles one by one using search (unfortunately, no batch endpoint for handles)
    for (const handle of handlesToFetch) {
        try {
            hits.count++;
            const searchData = await fetchApi('search', {
                part: 'snippet',
                q: `@${handle.id}`,
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
                        channelUrl: handle.channelUrl,
                    });
                }
            } else {
                 console.warn(`Could not resolve handle: @${handle.id}`);
            }
        } catch (error) {
            console.error(`Failed to fetch details for handle @${handle.id}:`, error);
        }
    }

    // Step 5: Fetch videos from all resolved playlists in parallel
    const playlistPromises = Array.from(channelDetailsMap.entries()).map(([channelId, details]) => 
        fetchVideosForPlaylist(details.uploadsPlaylistId, details.title, details.channelUrl, apiKey, hits)
    );

    const allFetchedVideos = (await Promise.all(playlistPromises)).flat();
    
    // Step 6: Sort and return the final list for the current response
    const sortedVideos = allFetchedVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return { data: sortedVideos, error: null, message: `Successfully fetched ${allFetchedVideos.length} new videos from ${channelDetailsMap.size} channels.`, hits: hits.count };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    console.error("Error in fetchYouTubeFeed:", errorMessage);
    
    // Always return an error state if the fetch fails for any reason
    return { data: null, error: `API Error: ${errorMessage}`, message: null, hits: hits.count };
  }
}
