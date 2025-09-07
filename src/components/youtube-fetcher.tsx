'use client';

import { useEffect, useState, useTransition } from 'react';
import { fetchYouTubeFeed } from '@/app/actions';
import type { FetcherState, VideoData } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import VideoCard from './video-card';
import { Skeleton } from './ui/skeleton';
import { AlertCircle, Copy, Download, Film, Loader2, RefreshCw, Youtube } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { channelUrls } from '@/lib/channels';

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function JsonViewer({ data }: { data: VideoData[] }) {
  const [showJson, setShowJson] = useState(false);
  const { toast } = useToast();

  const handleDownload = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'youtube-feed.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: 'Success',
      description: 'JSON file downloaded.',
    });
  };

  const handleCopy = () => {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      toast({
        title: 'Success',
        description: 'JSON data copied to clipboard.',
      });
    }, () => {
      toast({
        title: 'Error',
        description: 'Failed to copy JSON data.',
        variant: 'destructive',
      });
    });
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setShowJson(!showJson)} variant="outline">
          <Film />
          {showJson ? 'Hide' : 'Show'} JSON
        </Button>
        <Button onClick={handleDownload} variant="outline">
          <Download />
          Download JSON
        </Button>
        <Button onClick={handleCopy} variant="outline">
          <Copy />
          Copy JSON
        </Button>
      </div>

      {showJson && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <pre className="h-96 overflow-auto rounded-md bg-secondary p-4 text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


export default function YoutubeFeed() {
  const [state, setState] = useState<FetcherState>({ data: null, error: null, message: null });
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const loadFeed = () => {
    setIsLoading(true);
    startTransition(async () => {
      const result = await fetchYouTubeFeed();
      setState(result);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const totalChannels = channelUrls.length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={loadFeed} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 animate-spin" />
            ) : (
              <Youtube className="mr-2" />
            )}
            Fetch Videos
          </Button>
           <Button onClick={loadFeed} variant="outline" size="icon" disabled={isPending}>
              <RefreshCw className={isPending ? "animate-spin" : ""} />
            </Button>
        </div>
        <div className="text-sm text-muted-foreground">
            {isPending && `Fetching from ${totalChannels} channels...`}
            {!isPending && state.data && `Found ${state.data.length} videos.`}
        </div>
      </div>

      {(isLoading || isPending) && <LoadingState />}

      {!isPending && state.error && (
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>An Error Occurred</AlertTitle>
          <AlertDescription>
            {state.error}
            <Button onClick={loadFeed} variant="secondary" className="mt-4" disabled={isPending}>
               {isPending ? <Loader2 className="mr-2 animate-spin" /> : null}
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isPending && !state.error && (!state.data || state.data.length === 0) && (
         <Alert className="mt-8">
           <Youtube className="h-4 w-4" />
           <AlertTitle>No New Videos</AlertTitle>
           <AlertDescription>
             {state.message || "Couldn't find any new videos from your channels in the last 2 weeks."}
           </AlertDescription>
         </Alert>
      )}
      
      {state.data && state.data.length > 0 && (
        <>
          <JsonViewer data={state.data} />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {state.data.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
