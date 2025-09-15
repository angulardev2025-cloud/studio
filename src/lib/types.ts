
export type VideoData = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  uploader: string;
  shareLink: string;
};

export type FetcherState = {
  data: VideoData[] | null;
  error: string | null;
  message: string | null;
  hits: number;
};

    

