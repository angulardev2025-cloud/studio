'use server';

import { sub } from 'date-fns';
import { channelUrls } from '@/lib/channels';
import type { FetcherState, VideoData } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

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
    const errorData = await response.json();
    console.error('YouTube API Error:', errorData);
    throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
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

async function fetchOfflineData(): Promise<VideoData[]> {
  const mockDataDir = path.join(process.cwd(), 'src', 'mock-data');
  const files = await fs.readdir(mockDataDir);
  let allVideos: VideoData[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(mockDataDir, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const videos = JSON.parse(fileContent) as VideoData[];
      allVideos = allVideos.concat(videos);
    }
  }
  return allVideos;
}

// Main server action to fetch, combine, and sort videos from all channels
export async function fetchYouTubeFeed({ offline = false }: { offline?: boolean } = {}): Promise<FetcherState> {
  if (offline) {
    try {
      const offlineVideos = await fetchOfflineData();
       const sortedVideos = offlineVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
       return { data: sortedVideos, error: null, message: `Successfully loaded ${sortedVideos.length} videos from local data.` };
    } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
       console.error("Error in fetchOfflineData:", errorMessage);
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
    // Fetch all video arrays in parallel
    const videoPromises = channelUrls.map(url => fetchVideosForChannel(url, apiKey));
    const videosByChannel = await Promise.all(videoPromises);

    // Shuffle by channel
    const maxLength = Math.max(...videosByChannel.map(arr => arr.length));
    const shuffledVideos: VideoData[] = [];
    for (let i = 0; i < maxLength; i++) {
        for (let j = 0; j < videosByChannel.length; j++) {
            if (videosByChannel[j][i]) {
                shuffledVideos.push(videosByChannel[j][i]);
            }
        }
    }
    
    // Sort chronologically
    const sortedVideos = shuffledVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    if (sortedVideos.length === 0) {
        return { data: [], error: null, message: 'No new videos found in the last 2 weeks.' };
    }

    return { data: sortedVideos, error: null, message: `Successfully fetched ${sortedVideos.length} videos.` };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    console.error("Error in fetchYouTubeFeed:", errorMessage);
    return { data: null, error: `API Error: ${errorMessage}`, message: null };
  }
}
