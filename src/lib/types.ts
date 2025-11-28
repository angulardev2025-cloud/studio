
export type VideoData = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  uploader: string;
  shareLink: string;
};

export type ChannelData = {
  url: string;
  title: string;
  thumbnailUrl: string;
};

export type FetcherState = {
  data: VideoData[] | null;
  error: string | null;
  message: string | null;
  hits: number;
};

    
