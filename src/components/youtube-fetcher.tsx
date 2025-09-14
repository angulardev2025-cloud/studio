
'use client';

import { useEffect, useState, useMemo, useCallback, useTransition, useRef } from 'react';
import type { FetcherState, VideoData } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import VideoCard from './video-card';
import { Skeleton } from './ui/skeleton';
import { AlertCircle, Copy, Download, Film, Loader2, RefreshCw, Youtube, Search, X, Server, LayoutGrid, List, WifiOff, CloudCog, Shuffle } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { channelUrls } from '@/lib/channels';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import VideoDeckCard, { SeenVideosList } from './video-deck-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useRouter, useSearchParams } from 'next/navigation';

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


export default function YoutubeFeed({ initialState }: { initialState: FetcherState }) {
  const [state, setState] = useState<FetcherState>(initialState);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD_COUNT);
  const [hitCount, setHitCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'deck'>('grid');
  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<'online' | 'offline' | null>(null);
  const [activeTab, setActiveTab] = useState('tosee');

  const [readVideoIds, setReadVideoIds] = useState<Set<string>>(new Set());
  const [allVideos, setAllVideos] = useState<VideoData[]>(initialState.data || []);
  
  const router = useRouter();
  const searchParams = useSearchParams();

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
          // Reset on new day
          localStorage.setItem(HIT_COUNTER_KEY, JSON.stringify({ count: 0, date: todayIST }));
          setHitCount(0);
        }
      } else {
         localStorage.setItem(HIT_COUNTER_KEY, JSON.stringify({ count: 0, date: todayIST }));
      }

      const storedReadIds: string[] = JSON.parse(localStorage.getItem(READ_VIDEOS_KEY) || '[]');
      setReadVideoIds(new Set(storedReadIds));

    } catch (error) {
      console.error('Could not read/write to localStorage:', error);
    }
    
    setState(initialState);
    if(initialState.data) {
        setAllVideos(initialState.data);
    }
    if (initialState.hits && initialState.hits > 0) {
      setHitCount(prev => {
        const newTotal = prev + initialState.hits;
        try {
          localStorage.setItem(HIT_COUNTER_KEY, JSON.stringify({ count: newTotal, date: getISTDateString() }));
        } catch (error) {
          console.error('Failed to write hits to localStorage', error);
        }
        return newTotal;
      });
    }
  }, [initialState]);

  const filteredVideos = useMemo(() => {
    if (!allVideos) return [];

    return allVideos.filter(video => {
      const matchesChannel = selectedChannel === 'all' || video.uploader === selectedChannel;
      const matchesSearch = searchTerm.trim() === '' || 
                            video.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            video.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesChannel && matchesSearch;
    });
  }, [allVideos, searchTerm, selectedChannel]);

  
  const {unseenVideos, seenVideos} = useMemo(() => {
    const unseen = filteredVideos.filter(v => !readVideoIds.has(v.id));
    const seen = filteredVideos.filter(v => readVideoIds.has(v.id))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return { unseenVideos: unseen, seenVideos: seen };
  }, [filteredVideos, readVideoIds]);

  const [shuffledUnseenVideos, setShuffledUnseenVideos] = useState<VideoData[]>(unseenVideos);

  useEffect(() => {
    // When the original unseen videos change (e.g. after a fetch), update the shuffled list
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
    startTransition(() => {
        const params = new URLSearchParams(window.location.search);
        if (options.offline) {
            params.set('offline', 'true');
        } else {
            params.delete('offline');
        }
        router.push(`?${params.toString()}`);
    });
  }, [router]);

  useEffect(() => {
      const isOffline = searchParams.get('offline') === 'true';
      if ((isOffline && loadingAction === 'offline') || (!isOffline && loadingAction === 'online')) {
          setLoadingAction(null);
      }
  }, [searchParams, loadingAction, state]);


  const handleReload = () => {
    window.location.reload();
  };

  const channelNames = useMemo(() => {
    if (!initialState.data) return [];
    const names = new Set(initialState.data.map(video => video.uploader));
    return ['all', ...Array.from(names)];
  }, [initialState.data]);

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
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2" title="Total API Hits Today (IST) - Resets Daily">
                    <Server className="h-4 w-4" />
                    <span>API Hits: <AnimatedCounter value={hitCount} /> / 10000</span>
                </div>
                <span>|</span>
                <div>
                {state.data && `Found ${state.data.length} videos from ${totalChannels} channels.`}
                </div>
            </div>
        </div>

        {isPending && loadingAction === 'online' && (
            <Alert className="mt-4 bg-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Fetching Videos</AlertTitle>
                <AlertDescription>
                Please wait a moment while we fetch the latest videos from online sources.
                </AlertDescription>
            </Alert>
        )}
        {isPending && loadingAction === 'offline' && (
            <Alert className="mt-4 bg-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Loading Offline Data</AlertTitle>
                <AlertDescription>
                Please wait while we load the video data from your local cache.
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
            <Select value={selectedChannel} onValueChange={setSelectedChannel} disabled={!state.data}>
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
            {isPending && <LoadingState />}

            {!isPending && unseenVideos.length === 0 && (
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
                    <Button onClick={loadMore} variant="outline">Load More</Button>
                    </div>
                )}
                </>
            )}
        </TabsContent>

        <TabsContent value="seen">
             <SeenVideosList videos={seenVideos} />
        </TabsContent>
      </Tabs>
    </>
  );
}

    
