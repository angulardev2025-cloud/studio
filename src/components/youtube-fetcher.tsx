
'use client';

import { useEffect, useState, useMemo, useCallback, useTransition, useRef } from 'react';
import type { FetcherState, VideoData, ChannelData } from '@/lib/types';
import { fetchYouTubeFeed, fetchChannelDetails } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import VideoCard from './video-card';
import { Skeleton } from './ui/skeleton';
import { AlertCircle, Copy, Download, Film, Loader2, RefreshCw, Youtube, Search, X, Server, LayoutGrid, List, WifiOff, CloudCog, Shuffle, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { channelUrls } from '@/lib/channels';
import { Input } from './ui/input';
import VideoDeckCard, { SeenVideosList } from './video-deck-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Combobox } from './ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';

const INITIAL_LOAD_COUNT = 12;
const LOAD_MORE_COUNT = 8;
const HIT_COUNTER_KEY = 'youtubeApiHitCounter';
const READ_VIDEOS_KEY = 'readVideos';


function AnimatedCounter({ value }: { value: number }) {
  const [currentValue, setCurrentValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const animationDuration = 500; // ms
    const frameDuration = 1000 / 60; // 60fps
    const totalFrames = Math.round(animationDuration / frameDuration);
    let frame = 0;

    const startValue = prevValueRef.current;
    const diff = value - startValue;

    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const newValue = startValue + Math.round(diff * progress);
      setCurrentValue(newValue);

      if (frame === totalFrames) {
        clearInterval(counter);
        setCurrentValue(value);
        prevValueRef.current = value;
      }
    }, frameDuration);

    return () => clearInterval(counter);
  }, [value]);

  return <span className="font-bold">{currentValue}</span>;
}


function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(INITIAL_LOAD_COUNT)].map((_, i) => (
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
        {showJson && (
          <>
            <Button onClick={handleDownload} variant="outline">
              <Download />
              Download JSON
            </Button>
            <Button onClick={handleCopy} variant="outline">
              <Copy />
              Copy JSON
            </Button>
          </>
        )}
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

function ChannelListDialog() {
    const { toast } = useToast();
    const [channels, setChannels] = useState<ChannelData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOpen = async (open: boolean) => {
        if (open && channels.length === 0) {
            setIsLoading(true);
            setError(null);
            try {
                const { channels: fetchedChannels } = await fetchChannelDetails();
                setChannels(fetchedChannels);
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
                setError(errorMessage);
                toast({ title: 'Error fetching channel details', description: errorMessage, variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        }
    };
  
    const handleCopy = (url: string) => {
      navigator.clipboard.writeText(url).then(() => {
        toast({
          title: 'Copied!',
          description: 'Channel link copied to clipboard.',
        });
      });
    };
  
    return (
      <Dialog onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <List />
            Show Channels
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Channel List</DialogTitle>
            <DialogDescription>
              Here are all the channels configured in your feed.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="grid gap-2 py-4">
              {isLoading && (
                 [...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                           <Skeleton className="h-4 w-3/4" />
                           <Skeleton className="h-3 w-full" />
                        </div>
                    </div>
                ))
              )}
              {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
              {!isLoading && !error && channels.map((channel, index) => (
                <div key={index} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card/50">
                   <div className="flex items-center gap-4 flex-1 overflow-hidden">
                     <Image src={channel.thumbnailUrl} alt={channel.title} width={48} height={48} className="rounded-full" />
                     <div className="flex-1 overflow-hidden">
                      <p className="font-semibold text-sm truncate">{channel.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{channel.url}</p>
                     </div>
                   </div>
                  <Button variant="ghost" size="icon" onClick={() => handleCopy(channel.url)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }


export default function YoutubeFeed({ initialState: serverInitialState }: { initialState: FetcherState }) {
  const [state, setState] = useState<FetcherState>(serverInitialState);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD_COUNT);
  const [hitCount, setHitCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'deck'>('grid');
  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<'online' | 'offline' | null>(null);
  const [activeTab, setActiveTab] = useState('tosee');
  const [readVideoIds, setReadVideoIds] = useState<Set<string>>(new Set());
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);
  const [placeholder, setPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  const getISTDateString = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };
  
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(HIT_COUNTER_KEY);
      const todayIST = getISTDateString();

      if (storedData) {
        const { count, date } = JSON.parse(storedData);
        if (date === todayIST) {
          setHitCount(count);
        } else {
          localStorage.setItem(HIT_COUNTER_KEY, JSON.stringify({ count: 0, date: todayIST }));
          setHitCount(0);
        }
      } else {
         localStorage.setItem(HIT_COUNTER_KEY, JSON.stringify({ count: 0, date: todayIST }));
      }

      const storedReadIds: string[] = JSON.parse(localStorage.getItem(READ_VIDEOS_KEY) || '[]');
      setReadVideoIds(new Set(storedReadIds));
      
      if (!serverInitialState.data || serverInitialState.data.length === 0) {
        loadFeed({ offline: true });
      } else {
        setAllVideos(serverInitialState.data);
      }

    } catch (error) {
      console.error('Could not read/write to localStorage:', error);
      if (serverInitialState.data) {
        setAllVideos(serverInitialState.data);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const channelOptions = useMemo(() => {
    if (!allVideos) return [];
    const names = new Set(allVideos.map(video => video.uploader));
    const sortedNames = Array.from(names).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    return [
      { value: 'all', label: 'All Channels' },
      ...sortedNames.map(name => ({ value: name, label: name }))
    ];
  }, [allVideos]);

  useEffect(() => {
    if (channelOptions.length <= 1) return;
    const placeholderChannels = channelOptions.filter(c => c.value !== 'all');
    if (placeholderChannels.length === 0) return;
    const interval = setInterval(() => {
        setPlaceholderIndex(prevIndex => (prevIndex + 1) % placeholderChannels.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [channelOptions]);

  useEffect(() => {
    const placeholderChannels = channelOptions.filter(c => c.value !== 'all');
    if (placeholderChannels.length > 0) {
        setPlaceholder(`Search for "${placeholderChannels[placeholderIndex].label}"...`);
    } else {
        setPlaceholder('Search by channel...');
    }
  }, [placeholderIndex, channelOptions]);


  const updateStateAfterFetch = (newState: FetcherState) => {
    setState(newState);
    if(newState.data) {
        setAllVideos(newState.data);
    }
    if (newState.hits && newState.hits > 0) {
      setHitCount(prev => {
        const newTotal = prev + newState.hits;
        try {
          localStorage.setItem(HIT_COUNTER_KEY, JSON.stringify({ count: newTotal, date: getISTDateString() }));
        } catch (error) {
          console.error('Failed to write hits to localStorage', error);
        }
        return newTotal;
      });
    }
    setLoadingAction(null);
  };


  const filteredVideos = useMemo(() => {
    if (!allVideos) return [];

    return allVideos.filter(video => {
      const matchesChannel = selectedChannel === 'all' || video.uploader.toLowerCase() === selectedChannel.toLowerCase();
      const matchesSearch = searchTerm.trim() === '' || 
                            video.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            video.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesChannel && matchesSearch;
    });
  }, [allVideos, searchTerm, selectedChannel]);

  
  const {unseenVideos, seenVideos} = useMemo(() => {
    const unseen = filteredVideos.filter(v => !readVideoIds.has(v.id))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const seen = filteredVideos.filter(v => readVideoIds.has(v.id))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return { unseenVideos: unseen, seenVideos: seen };
  }, [filteredVideos, readVideoIds]);

  const [shuffledUnseenVideos, setShuffledUnseenVideos] = useState<VideoData[]>([]);

  useEffect(() => {
    setShuffledUnseenVideos(unseenVideos);
  }, [unseenVideos]);


  const markAsRead = useCallback((videoId: string) => {
     setReadVideoIds(prevReadIds => {
      if (prevReadIds.has(videoId)) {
        return prevReadIds;
      }
      const newReadIds = new Set(prevReadIds);
      newReadIds.add(videoId);
      
      try {
        localStorage.setItem(READ_VIDEOS_KEY, JSON.stringify(Array.from(newReadIds)));
      } catch (error) {
        console.error("Failed to save read videos to localStorage", error);
      }
      
      const isLastUnseenVideo = unseenVideos.length === 1 && unseenVideos[0].id === videoId;
      if (isLastUnseenVideo) {
        setActiveTab('seen');
      }

      return newReadIds;
    });
  }, [unseenVideos]);

  const shuffleVideos = useCallback(() => {
    startTransition(() => {
        setShuffledUnseenVideos(prev => {
            const array = [...prev];
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        });
    });
  }, []);

  const loadFeed = useCallback((options: { offline?: boolean } = {}) => {
    const action = options.offline ? 'offline' : 'online';
    setLoadingAction(action);
    startTransition(async () => {
        const newState = await fetchYouTubeFeed(options);
        updateStateAfterFetch(newState);
    });
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  const visibleUnseenVideos = useMemo(() => {
    return shuffledUnseenVideos.slice(0, visibleCount);
  }, [shuffledUnseenVideos, visibleCount]);

  const loadMore = () => {
    setVisibleCount(prevCount => prevCount + LOAD_MORE_COUNT);
  }

  const hasMore = visibleCount < (shuffledUnseenVideos?.length || 0);
  const totalChannels = channelUrls.length;
  
  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => loadFeed()} disabled={isPending} className="bg-green-600 hover:bg-green-700 text-white">
                  {loadingAction === 'online' ? <Loader2 className="mr-2 animate-spin" /> : <Youtube className="mr-2" />}
                  {loadingAction === 'online' ? 'Fetching...' : 'Fetch Videos'}
                </Button>
                <Button onClick={() => loadFeed({ offline: true })} disabled={isPending} variant="outline" className="text-white border-blue-500 bg-blue-600 hover:bg-blue-700 hover:text-white">
                    {loadingAction === 'offline' ? <Loader2 className="mr-2 animate-spin" /> : <WifiOff />}
                    {loadingAction === 'offline' ? 'Loading...' : 'Offline Mode'}
                </Button>
                <Button onClick={handleReload} variant="outline">
                    <CloudCog />
                    Load Latest App
                </Button>
                <ChannelListDialog />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2" title="Total API Hits Today (IST) - Resets Daily">
                    <Server className="h-4 w-4" />
                    <span>API Hits: <AnimatedCounter value={hitCount} /> / 10000</span>
                </div>
                <span>|</span>
                 <div className="flex items-center gap-2" title="Total videos found and channels configured">
                    <Film className="h-4 w-4" />
                    <span>
                    {allVideos ? `${allVideos.length} videos from ${totalChannels} channels` : 'Loading...'}
                    </span>
                </div>
            </div>
        </div>

        {isPending && (
            <Alert className="mt-4 bg-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>
                  {loadingAction === 'online' ? 'Fetching Videos' : 'Loading Offline Data'}
                </AlertTitle>
                <AlertDescription>
                  {loadingAction === 'online' 
                    ? 'Please wait a moment while we fetch the latest videos from online sources.'
                    : 'Please wait while we load the video data from your local cache.'
                  }
                </AlertDescription>
            </Alert>
        )}
        
        {state.error && !isPending && (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>An Error Occurred</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
        )}

        {state.message && !state.error && !isPending && (
             <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Info</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
            </Alert>
        )}


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
            <div className="relative flex-grow md:max-w-xs">
                <Combobox
                  options={channelOptions}
                  value={selectedChannel}
                  onChange={(value) => setSelectedChannel(value === 'all' ? 'all' : value)}
                  placeholder="Select a channel..."
                  searchPlaceholder={placeholder}
                  noResultsMessage="No channel found."
                />
            </div>
            <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setViewMode('grid')}
                >
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Grid
                </Button>
                <Button
                    variant={viewMode === 'deck' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setViewMode('deck')}
                >
                    <List className="mr-2 h-4 w-4" />
                    Deck
                </Button>
            </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tosee">To See ({unseenVideos.length})</TabsTrigger>
            <TabsTrigger value="seen">Already Seen ({seenVideos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tosee">
            {(isPending && loadingAction === 'online') && <LoadingState />}
            
            {(!isPending && unseenVideos.length === 0 && allVideos.length > 0) &&(
                <Alert className="mt-8">
                <Youtube className="h-4 w-4" />
                <AlertTitle>All Caught Up!</AlertTitle>
                <AlertDescription>
                    {searchTerm || selectedChannel !== 'all' 
                        ? "No unseen videos match your current search/filter criteria. Check the 'Already Seen' tab!"
                        : "You've seen all available videos. Check the 'Already Seen' tab or fetch new ones."
                    }
                </AlertDescription>
                </Alert>
            )}
            
            {!isPending && unseenVideos.length > 0 && (
                <>
                <div className="my-4 flex items-center gap-4">
                    <JsonViewer data={shuffledUnseenVideos} />
                    <Button onClick={shuffleVideos} variant="outline" disabled={isPending}>
                        <Shuffle className="mr-2" />
                        {isPending ? "Shuffling..." : "Shuffle Videos"}
                    </Button>
                </div>
                {viewMode === 'grid' ? (
                    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleUnseenVideos.map((video, index) => (
                        <VideoCard key={video.id} video={video} index={index} onView={markAsRead} />
                    ))}
                    </div>
                ) : (
                    <div className="mt-8">
                        <VideoDeckCard unseenVideos={shuffledUnseenVideos} seenVideos={seenVideos} onView={markAsRead} />
                    </div>
                )}

                {hasMore && viewMode === 'grid' && (
                    <div className="mt-8 text-center">
                    <Button onClick={loadMore} variant="outline">Load More</Button>                    </div>
                )}
                </>
            )}
            
            {(!isPending && allVideos.length === 0 && !state.error) && (
                 <Alert className="mt-8">
                    <Youtube className="h-4 w-4" />
                    <AlertTitle>Welcome!</AlertTitle>
                    <AlertDescription>
                        Click "Fetch Videos" to load content from YouTube channels.
                    </AlertDescription>
                </Alert>
            )}
        </TabsContent>

        <TabsContent value="seen">
             <SeenVideosList videos={seenVideos} />
        </TabsContent>
      </Tabs>
    </>
  );
}


    
