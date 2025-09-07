'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Copy, Download, Loader2, Youtube } from 'lucide-react';

import { fetchYouTubeVideoData } from '@/app/actions';
import type { FetcherState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import VideoCard from './video-card';
import { Skeleton } from './ui/skeleton';

const initialState: FetcherState = {
  data: null,
  error: null,
  message: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto shrink-0">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Fetching...
        </>
      ) : (
        'Fetch Videos'
      )}
    </Button>
  );
}

function Results({ state }: { state: FetcherState }) {
  const { pending } = useFormStatus();
  const { toast } = useToast();
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    if (state.data) {
      setShowJson(false);
    }
  }, [state.data]);

  const handleCopyJson = () => {
    if (state.data) {
      navigator.clipboard.writeText(JSON.stringify(state.data, null, 2));
      toast({
        title: 'Copied to clipboard!',
      });
    }
  };

  const handleDownloadJson = () => {
    if (state.data) {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(state.data, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = "youtube_video_data.json";
      link.click();
      toast({ title: 'Download started' });
    }
  };

  if (pending) {
    return (
      <div className="mt-8 space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="aspect-video w-full rounded-md" />
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!state.data) return null;

  if (state.data.length === 0) {
    return (
      <Alert className="mt-8">
        <Youtube className="h-4 w-4" />
        <AlertTitle>No Videos Found</AlertTitle>
        <AlertDescription>
          This channel doesn't have any public videos.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-headline text-3xl font-bold text-primary">
          Found {state.data.length} Videos
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowJson(p => !p)}>
            {showJson ? 'Hide' : 'Show'} Raw JSON
          </Button>
        </div>
      </div>
      {showJson ? (
        <Card className="relative">
          <CardContent className="p-0">
            <div className="absolute right-2 top-2 z-10 flex gap-1">
              <Button variant="ghost" size="icon" onClick={handleCopyJson} aria-label="Copy JSON">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownloadJson} aria-label="Download JSON">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <pre className="max-h-[600px] w-full overflow-auto rounded-lg bg-secondary/30 p-4 text-sm font-code">
              <code>{JSON.stringify(state.data, null, 2)}</code>
            </pre>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {state.data.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}


export default function YoutubeFetcher() {
  const [state, formAction] = useFormState(fetchYouTubeVideoData, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.error) {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: state.error,
      });
    }
    if (state.message) {
      toast({
        title: 'Success',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-grow">
              <label htmlFor="channelUrl" className="text-sm font-medium">
                YouTube Channel URL
              </label>
              <Input
                id="channelUrl"
                name="channelUrl"
                type="url"
                placeholder="https://www.youtube.com/@kannadatech"
                required
                className="mt-1"
              />
            </div>
            <SubmitButton />
          </div>
        </CardContent>
      </Card>
      <Results state={state} />
    </form>
  );
}
