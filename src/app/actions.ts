
'use server';

import { sub } from 'date-fns';
import { channelUrls } from '@/lib/channels';
import type { FetcherState, VideoData } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const MOCK_DATA_PATH = path.join(process.cwd(), 'src', 'mock-data', 'youtube-feed1.json');

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

            for (const item of playlistData.items) {
                const publishedAt = new Date(item.snippet.publishedAt);
                if (publishedAt < twoWeeksAgo) {
                    shouldStop = true;
                    break;
                }
                allVideoItems.push(item);
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

async function readOfflineData(): Promise<VideoData[]> {
  try {
    const fileContent = await fs.readFile(MOCK_DATA_PATH, 'utf-8');
    const videos = JSON.parse(fileContent) as VideoData[];
    return videos;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []; // File doesn't exist, return empty array
    }
    // For other errors (like parsing), log it but return empty to avoid crashing
    console.error("Error reading or parsing offline data:", error);
    return [];
  }
}

async function writeOfflineData(videos: VideoData[]): Promise<void> {
  try {
    const jsonString = JSON.stringify(videos, null, 2);
    // Ensure the directory exists
    await fs.mkdir(path.dirname(MOCK_DATA_PATH), { recursive: true });
    await fs.writeFile(MOCK_DATA_PATH, jsonString, 'utf-8');
  } catch (error) {
    console.error("Error writing offline data:", error);
  }
}

async function getOfflineFetcherState(): Promise<FetcherState> {
  try {
    const offlineVideos = await readOfflineData();
    if (offlineVideos.length === 0) {
      return { data: null, error: 'Offline data file not found or is empty. Please run "Fetch Videos" to create it.', message: null, hits: 0 };
    }
    const sortedVideos = offlineVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return { data: sortedVideos, error: null, message: `Successfully loaded ${sortedVideos.length} videos from local data.`, hits: 0 };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    console.error("Error in offline mode:", errorMessage);
    return { data: null, error: `Offline DataError: ${errorMessage}`, message: null, hits: 0 };
  }
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
    const idsToFetch: string[] = [];
    const usernamesToFetch: string[] = [];
    const handlesToFetch: string[] = [];
    
    channelUrls.forEach(url => {
        const identifier = getChannelIdentifier(url);
        if (identifier) {
            if (identifier.type === 'id') idsToFetch.push(identifier.id);
            else if (identifier.type === 'username') usernamesToFetch.push(identifier.id);
            else if (identifier.type === 'handle') handlesToFetch.push(identifier.id);
        }
    });

    const channelDetailsMap = new Map<string, { title: string; uploadsPlaylistId: string }>();

    // Step 2: Batch fetch for IDs
    if (idsToFetch.length > 0) {
        const idChunks = [];
        for (let i = 0; i < idsToFetch.length; i += 50) {
            idChunks.push(idsToFetch.slice(i, i + 50).join(','));
        }
        for (const chunk of idChunks) {
            hits.count++;
            const data = await fetchApi('channels', { part: 'snippet,contentDetails', id: chunk, key: apiKey });
            data.items.forEach((item: any) => {
                channelDetailsMap.set(item.id, {
                    title: item.snippet.title,
                    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
                });
            });
        }
    }

    // Step 3: Batch fetch for usernames (less efficient, but necessary)
     if (usernamesToFetch.length > 0) {
        const usernameChunks = [];
        for (let i = 0; i < usernamesToFetch.length; i += 50) {
            usernameChunks.push(usernamesToFetch.slice(i, i + 50).join(','));
        }
        for (const chunk of usernameChunks) {
            hits.count++;
            const data = await fetchApi('channels', { part: 'snippet,contentDetails', forUsername: chunk, key: apiKey });
            data.items.forEach((item: any) => {
                channelDetailsMap.set(item.id, {
                    title: item.snippet.title,
                    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
                });
            });
        }
    }

    // Step 4: Fetch handles one by one using search (unfortunately, no batch endpoint for handles)
    for (const handle of handlesToFetch) {
        hits.count++;
        const searchData = await fetchApi('search', {
            part: 'snippet',
            q: `@${handle}`,
            type: 'channel',
            maxResults: '1',
            key: apiKey,
        });
        if (searchData.items?.length > 0) {
            const channelId = searchData.items[0].id.channelId;
            const channelTitle = searchData.items[0].snippet.title;
            // Now fetch contentDetails for the uploads playlist
            hits.count++;
            const channelData = await fetchApi('channels', {
                part: 'contentDetails',
                id: channelId,
                key: apiKey
            });
            if (channelData.items?.length > 0) {
                channelDetailsMap.set(channelId, {
                    title: channelTitle,
                    uploadsPlaylistId: channelData.items[0].contentDetails.relatedPlaylists.uploads,
                });
            }
        }
    }

    // Step 5: Fetch videos from all resolved playlists in parallel
    const playlistPromises = Array.from(channelDetailsMap.entries()).map(([channelId, details]) => 
        fetchVideosForPlaylist(details.uploadsPlaylistId, details.title, apiKey, hits)
    );

    const allFetchedVideos = (await Promise.all(playlistPromises)).flat();
    
    if (allFetchedVideos.length === 0) {
        const existingData = await readOfflineData();
        return { data: existingData, error: null, message: 'No new videos found in the last 2 weeks. Displaying cached data.', hits: hits.count };
    }
    
    // Step 6: Read existing offline data, merge, and write back
    const existingOfflineVideos = await readOfflineData();
    const combinedVideos = [...allFetchedVideos, ...existingOfflineVideos];

    const uniqueVideosMap = new Map<string, VideoData>();
    for (const video of combinedVideos) {
        if (!uniqueVideosMap.has(video.id)) {
            uniqueVideosMap.set(video.id, video);
        }
    }
    const allVideos = Array.from(uniqueVideosMap.values());
    
    await writeOfflineData(allVideos);

    // Step 7: Sort and return the final list for the current response
    const sortedVideos = allVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return { data: sortedVideos, error: null, message: `Successfully fetched ${allFetchedVideos.length} new videos. Offline cache updated to ${allVideos.length} total videos.`, hits: hits.count };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    console.error("Error in fetchYouTubeFeed:", errorMessage);

    if (errorMessage.includes('quota has been exceeded') || errorMessage.includes('Access to the YouTube API was denied')) {
        console.log('API key or quota error detected. Falling back to offline data.');
        const offlineState = await getOfflineFetcherState();
        // If offline data exists, return it with the error as a non-critical message
        if (offlineState.data) {
            return { 
                ...offlineState,
                error: `${errorMessage} Falling back to previously cached data.`,
                 hits: hits.count,
            };
        }
        // If no offline data, it's a hard error
        return { data: null, error: `API Error: ${errorMessage} and no offline data is available.`, message: null, hits: hits.count };
    }

    return { data: null, error: `API Error: ${errorMessage}`, message: null, hits: hits.count };
  }
}

    