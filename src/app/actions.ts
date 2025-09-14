
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


// Fetches all videos for a single channel URL
async function fetchVideosForChannel(channelUrl: string, apiKey: string): Promise<VideoData[]> {
  const identifier = getChannelIdentifier(channelUrl);
  if (!identifier) {
    console.warn(`Could not identify channel from URL: ${channelUrl}`);
    return [];
  }

  let channelId: string | null = null;
  let channelTitle = '';

  // Step 1: Resolve identifier to channel ID
  if (identifier.type === 'id') {
    channelId = identifier.id;
  } else {
    // This handles 'handle' and 'username' types
    try {
       const searchData = await fetchApi('search', {
        part: 'snippet',
        q: identifier.type === 'handle' ? `@${identifier.id}` : identifier.id,
        type: 'channel',
        maxResults: '1',
        key: apiKey,
      });

      if (searchData.items?.length > 0) {
        channelId = searchData.items[0].id.channelId;
        channelTitle = searchData.items[0].snippet.title;
      } else {
         // Fallback for /c/ and /user/ which sometimes don't resolve well via search
         const channelData = await fetchApi('channels', {
            part: 'id,snippet',
            forUsername: identifier.id,
            key: apiKey,
         });
         if (channelData.items?.length > 0) {
            channelId = channelData.items[0].id;
            channelTitle = channelData.items[0].snippet.title;
         }
      }
    } catch (e) {
        console.error(`Failed to resolve channel for identifier: ${identifier.id}`, e);
        return [];
    }
  }

  if (!channelId) {
    console.warn(`Could not determine channel ID for: ${channelUrl}`);
    return [];
  }

  // Step 2: Get the 'uploads' playlist ID from the channel
  const channelData = await fetchApi('channels', {
    part: 'contentDetails,snippet',
    id: channelId,
    key: apiKey,
  });

  if (!channelData.items || channelData.items.length === 0) {
    console.warn(`Could not find channel details for ID: ${channelId}`);
    return [];
  }
  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
  if (!channelTitle) channelTitle = channelData.items[0].snippet.title;

  // Step 3: Paginate through the uploads playlist to get all video items
  const twoWeeksAgo = sub(new Date(), { weeks: 2 });
  let allVideoItems: any[] = [];
  let nextPageToken: string | undefined = undefined;
  let shouldStop = false;

  do {
    const playlistData = await fetchApi('playlistItems', {
      part: 'snippet',
      playlistId: uploadsPlaylistId,
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

  } while (nextPageToken);

  // Step 4: Format the data
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

// Main server action to fetch, combine, and sort videos from all channels
export async function fetchYouTubeFeed({ offline = false }: { offline?: boolean } = {}): Promise<FetcherState> {
  if (offline) {
    try {
      const offlineVideos = await readOfflineData();
      if (offlineVideos.length === 0) {
        return { data: null, error: 'Offline data file not found or is empty. Please run "Fetch Videos" to create it.', message: null };
      }
      const sortedVideos = offlineVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      return { data: sortedVideos, error: null, message: `Successfully loaded ${sortedVideos.length} videos from local data.` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error("Error in offline mode:", errorMessage);
      return { data: null, error: `Offline Data Error: ${errorMessage}`, message: null };
    }
  }

  const apiKey = process.env.YT_API_KEY;

  if (!apiKey) {
    return { data: null, error: 'YouTube API key (YT_API_KEY) is not configured in environment variables.', message: null };
  }

  if (!channelUrls || channelUrls.length === 0) {
    return { data: [], error: null, message: 'No channels configured.' };
  }

  try {
    // Fetch videos from all channels in parallel
    const allFetchedVideos = (await Promise.all(
      channelUrls.map(url => fetchVideosForChannel(url, apiKey))
    )).flat();

    if (allFetchedVideos.length === 0) {
        return { data: [], error: null, message: 'No new videos found in the last 2 weeks.' };
    }
    
    // Read existing offline data
    const existingOfflineVideos = await readOfflineData();
    
    // Combine new and existing videos
    const combinedVideos = [...allFetchedVideos, ...existingOfflineVideos];

    // Remove duplicates, keeping the first occurrence (which would be the newly fetched one if it exists)
    const uniqueVideosMap = new Map<string, VideoData>();
    for (const video of combinedVideos) {
        if (!uniqueVideosMap.has(video.id)) {
            uniqueVideosMap.set(video.id, video);
        }
    }
    const allVideos = Array.from(uniqueVideosMap.values());
    
    // Write the updated combined list back to the offline file
    await writeOfflineData(allVideos);

    // Sort the final list for the current response
    const [priorityChannelUrl] = channelUrls;
    const priorityIdentifier = getChannelIdentifier(priorityChannelUrl);
    
    const sortedVideos = allVideos.sort((a, b) => {
        // Prioritize videos from the first channel in the list
        const aIsPriority = priorityIdentifier && a.uploader.includes(priorityIdentifier.id);
        const bIsPriority = priorityIdentifier && b.uploader.includes(priorityIdentifier.id);
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        
        // Then sort by date
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return { data: sortedVideos, error: null, message: `Successfully fetched ${allFetchedVideos.length} new videos. Offline cache updated to ${allVideos.length} total videos.` };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    console.error("Error in fetchYouTubeFeed:", errorMessage);
    return { data: null, error: `API Error: ${errorMessage}`, message: null };
  }
}
