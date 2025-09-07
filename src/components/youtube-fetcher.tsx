'use client';

import { useEffect, useState } from 'react';
import { fetchYouTubeFeed } from '@/app/actions';
import type { FetcherState } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import VideoCard from './video-card';
import { Skeleton } from './ui/skeleton';
import { AlertCircle, Youtube } from 'lucide-react';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

function LoadingState() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function YoutubeFeed() {
  const [state, setState] = useState<FetcherState>({ data: null, error: null, message: null });
  const [isLoading, setIsLoading] = useState(true);

  const loadFeed = async () => {
    setIsLoading(true);
    const result = await fetchYouTubeFeed();
    setState(result);
    setIsLoading(false);
  };

  useEffect(() => {
    loadFeed();
  }, []);

  if (isLoading) {
    return <LoadingState />;
  }
  
  if (state.error) {
    return (
      <Alert variant="destructive" className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>An Error Occurred</AlertTitle>
        <AlertDescription>
          {state.error}
          <Button onClick={loadFeed} variant="secondary" className="mt-4">
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!state.data || state.data.length === 0) {
     return (
      <Alert className="mt-8">
        <Youtube className="h-4 w-4" />
        <AlertTitle>No New Videos</AlertTitle>
        <AlertDescription>
          {state.message || "Couldn't find any new videos from your channels in the last 2 weeks."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {state.data.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
