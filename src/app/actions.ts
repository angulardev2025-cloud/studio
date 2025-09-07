'use server';

import type { FetcherState, VideoData } from '@/lib/types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Helper function to extract channel ID or handle from URL
const getChannelIdentifier = (url: string): { id: string; type: 'id' | 'handle' } | null => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    const channelIdMatch = pathname.match(/\/channel\/(UC[\w-]{22})/);
    if (channelIdMatch && channelIdMatch[1]) {
      return { id: channelIdMatch[1], type: 'id' };
    }

    const handleMatch = pathname.match(/\/@([\w.-]+)/);
    if (handleMatch && handleMatch[1]) {
      return { id: handleMatch[1], type: 'handle' };
    }

    return null;
  } catch (error) {
    return null;
  }
};

// Helper to fetch data from YouTube API
async function fetchApi(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchYouTubeVideoData(
  prevState: FetcherState,
  formData: FormData
): Promise<FetcherState> {
  const channelUrl = formData.get('channelUrl') as string;
  const apiKey = process.env.YT_API_KEY;

  if (!apiKey) {
    return { data: null, error: 'YouTube API key (YT_API_KEY) is not configured in environment variables.', message: null };
  }

  if (!channelUrl) {
    return { data: null, error: 'Channel URL is required.', message: null };
  }

  const identifier = getChannelIdentifier(channelUrl);
  if (!identifier) {
    return { data: null, error: 'Invalid YouTube channel URL format. Please provide a full channel URL.', message: null };
  }

  try {
    let channelId = identifier.id;
    let channelTitle = '';

    // Step 1: Resolve handle to channel ID if necessary
    if (identifier.type === 'handle') {
      const searchData = await fetchApi('search', {
        part: 'snippet',
        q: `@${identifier.id}`,
        type: 'channel',
        key: apiKey,
      });
      if (!searchData.items || searchData.items.length === 0) {
        return { data: null, error: `Could not find a channel with handle @${identifier.id}.`, message: null };
      }
      channelId = searchData.items[0].id.channelId;
      channelTitle = searchData.items[0].snippet.title;
    }

    // Step 2: Get the 'uploads' playlist ID from the channel
    const channelData = await fetchApi('channels', {
      part: 'contentDetails,snippet',
      id: channelId,
      key: apiKey,
    });
    if (!channelData.items || channelData.items.length === 0) {
      return { data: null, error: 'Could not find channel details.', message: null };
    }
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    if(!channelTitle) channelTitle = channelData.items[0].snippet.title;

    // Step 3: Paginate through the uploads playlist to get all video items
    let allVideoItems: any[] = [];
    let nextPageToken: string | undefined = undefined;
    do {
      const playlistData = await fetchApi('playlistItems', {
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: '50',
        pageToken: nextPageToken || '',
        key: apiKey,
      });
      
      allVideoItems.push(...playlistData.items);
      nextPageToken = playlistData.nextPageToken;

    } while (nextPageToken);
    
    // Step 4: No videos found
    if (allVideoItems.length === 0) {
        return { data: [], error: null, message: 'No videos found for this channel.' };
    }
    
    // Step 5: Format the data
    const videos: VideoData[] = allVideoItems
      .filter(item => item.snippet?.resourceId?.videoId) // Ensure item has a video ID
      .map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      uploader: channelTitle,
      shareLink: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
    }));

    return { data: videos, error: null, message: `Successfully fetched ${videos.length} videos.` };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
    console.error(errorMessage);
    return { data: null, error: `API Error: ${errorMessage}`, message: null };
  }
}
