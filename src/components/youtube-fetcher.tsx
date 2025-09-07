'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import { fetchYouTubeFeed } from '@/app/actions';
import type { FetcherState, VideoData } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import VideoCard from './video-card';
import { Skeleton } from './ui/skeleton';
import { AlertCircle, Copy, Download, Film, Loader2, RefreshCw, Youtube, Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { channelUrls } from '@/lib/channels';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');

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

  const channelNames = useMemo(() => {
    if (!state.data) return [];
    const names = new Set(state.data.map(video => video.uploader));
    return ['all', ...Array.from(names)];
  }, [state.data]);

  const filteredVideos = useMemo(() => {
    if (!state.data) return [];
    return state.data.filter(video => {
      const matchesChannel = selectedChannel === 'all' || video.uploader === selectedChannel;
      const matchesSearch = searchTerm.trim() === '' || 
                            video.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            video.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesChannel && matchesSearch;
    });
  }, [state.data, searchTerm, selectedChannel]);

  const totalChannels = channelUrls.length;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
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
              {!isPending && state.data && `Found ${state.data.length} videos from ${totalChannels} channels.`}
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by title or description..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="w-full md:w-[280px]">
                <SelectValue placeholder="Filter by channel" />
              </SelectTrigger>
              <SelectContent>
                {channelNames.map(channel => (
                  <SelectItem key={channel} value={channel}>
                    {channel === 'all' ? 'All Channels' : channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {!isLoading && !isPending && !state.error && (!filteredVideos || filteredVideos.length === 0) && (
         <Alert className="mt-8">
           <Youtube className="h-4 w-4" />
           <AlertTitle>No Videos Found</AlertTitle>
           <AlertDescription>
             {searchTerm || selectedChannel !== 'all' 
                ? "No videos match your current search/filter criteria."
                : (state.message || "Couldn't find any new videos from your channels in the last 2 weeks.")
             }
           </AlertDescription>
         </Alert>
      )}
      
      {filteredVideos && filteredVideos.length > 0 && (
        <>
          <JsonViewer data={filteredVideos} />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
