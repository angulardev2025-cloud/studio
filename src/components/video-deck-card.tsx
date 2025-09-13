
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Share2, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import type { VideoData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperClass } from 'swiper';
import { Navigation, EffectCards } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-cards';
import 'swiper/css/navigation';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from './ui/scroll-area';

const READ_VIDEOS_KEY = 'readVideos';

const SeenVideoCard = ({ video, index }: { video: VideoData; index: number }) => (
    <div className="flex items-start gap-4 p-4 border-b">
        <span className="text-lg font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
        <div className="flex-grow">
            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer">
                <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    width={120}
                    height={68}
                    className="rounded-md object-cover aspect-video float-right ml-4"
                />
                <p className="font-semibold line-clamp-2 hover:text-primary">{video.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{video.uploader}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })}</p>
            </Link>
        </div>
    </div>
)


const DeckSwiperSlide = ({ video, index, isVisible, markAsRead }: { video: VideoData; index: number, isVisible: boolean, markAsRead: (id: string) => void }) => {
    const [isRead, setIsRead] = useState(false);

    useEffect(() => {
        // Check initial read state from localStorage
        try {
            const readVideos = JSON.parse(localStorage.getItem(READ_VIDEOS_KEY) || '[]');
            if (readVideos.includes(video.id)) {
                setIsRead(true);
            }
        } catch (e) {
            console.error('Failed to parse read videos from localStorage', e);
        }
    }, [video.id]);
    
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                markAsRead(video.id);
                setIsRead(true);
            }, 1000); // Mark as read after 1 second of being visible
            return () => clearTimeout(timer);
        }
    }, [isVisible, video.id, markAsRead]);
    
    const publishedAtDate = new Date(video.publishedAt);
    return (
        <SwiperSlide key={video.id} data-videoid={video.id}>
            <Card className="flex flex-col h-full overflow-hidden shadow-lg bg-card">
                 <CardHeader className="flex-row items-center justify-between pb-2 px-4 sm:px-6">
                    <span className="text-3xl sm:text-4xl font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                     <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" aria-label="Share video" onClick={() => markAsRead(video.id)}>
                                <Share2 />
                            </Link>
                        </Button>
                     </div>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col gap-4 p-4 sm:p-6 pt-0">
                     <div className="w-full aspect-video relative shrink-0 overflow-hidden rounded-lg">
                        <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full" onClick={() => markAsRead(video.id)}>
                            {isRead && (
                                <Badge variant="secondary" className="absolute top-2 right-2 z-10">Read</Badge>
                            )}
                            {video.thumbnailUrl ? (
                                <Image
                                    src={video.thumbnailUrl}
                                    alt={video.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 40vw"
                                    data-ai-hint="youtube thumbnail"
                                />
                                ) : (
                                <div className="flex h-full w-full items-center justify-center bg-secondary">
                                    <p className="text-muted-foreground">No thumbnail</p>
                                </div>
                            )}
                            {isRead && (
                                <div className="absolute bottom-2 right-2 z-10 bg-black/60 p-1 rounded-full backdrop-blur-sm">
                                    <Eye className="h-4 w-4 text-white" />
                                </div>
                            )}
                        </Link>
                    </div>
                    <div className="flex-grow flex flex-col">
                        <CardTitle className="font-headline text-lg sm:text-xl font-semibold tracking-tight line-clamp-3 mb-2">
                            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary" onClick={() => markAsRead(video.id)}>
                                {video.title}
                            </Link>
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mb-3">
                            By {video.uploader}
                        </CardDescription>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-4 sm:line-clamp-5 flex-grow">{video.description}</p>
                         <time dateTime={video.publishedAt} className="text-xs text-muted-foreground mt-auto">
                            {formatDistanceToNow(publishedAtDate, { addSuffix: true })}
                        </time>
                    </div>
                </CardContent>
            </Card>
        </SwiperSlide>
    )
}

type VideoDeckCardProps = {
    videos: VideoData[]
}

export default function VideoDeckCard({ videos }: VideoDeckCardProps) {
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [unseenVideos, setUnseenVideos] = useState<VideoData[]>([]);
  const [seenVideos, setSeenVideos] = useState<VideoData[]>([]);
  const [readVideoIds, setReadVideoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const storedReadIds: string[] = JSON.parse(localStorage.getItem(READ_VIDEOS_KEY) || '[]');
      const readIdsSet = new Set(storedReadIds);
      setReadVideoIds(readIdsSet);

      const initialUnseen = videos.filter(v => !readIdsSet.has(v.id));
      const initialSeen = videos.filter(v => readIdsSet.has(v.id));
      
      setUnseenVideos(initialUnseen);
      setSeenVideos(initialSeen.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));

    } catch (e) {
      console.error('Failed to process video lists from localStorage', e);
      setUnseenVideos(videos);
    }
  }, [videos]);


  const markAsRead = useCallback((videoId: string) => {
    if (readVideoIds.has(videoId)) return;
    
    const newReadIds = new Set(readVideoIds).add(videoId);
    setReadVideoIds(newReadIds);
    localStorage.setItem(READ_VIDEOS_KEY, JSON.stringify(Array.from(newReadIds)));

    const slideEl = swiper?.slides.find(slide => slide.dataset.videoid === videoId);
    if(slideEl) {
        slideEl.classList.add('fade-out');
    }

    setTimeout(() => {
      const videoToMove = unseenVideos.find(v => v.id === videoId);
      if (videoToMove) {
          setUnseenVideos(prev => prev.filter(v => v.id !== videoId));
          setSeenVideos(prev => [videoToMove, ...prev].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
      }
      if(slideEl) {
          slideEl.classList.remove('fade-out');
      }
      // After moving the video, we might need to re-render or update swiper
      swiper?.update();
    }, 500); // Match animation duration
  }, [readVideoIds, swiper, unseenVideos]);

  const handleSlideChange = (swiperInstance: SwiperClass) => {
    setActiveIndex(swiperInstance.activeIndex);
    const activeSlide = swiperInstance.slides[swiperInstance.activeIndex];
    const videoId = activeSlide?.dataset.videoid;
    if (videoId) {
      // Delay marking as read slightly to feel natural
      const timer = setTimeout(() => {
        markAsRead(videoId);
      }, 500);
      return () => clearTimeout(timer);
    }
  };


  return (
    <div className="relative w-full max-w-md mx-auto">
        <style jsx global>{`
            .fade-out {
                animation: fadeOut 0.5s ease-out forwards;
            }
            @keyframes fadeOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.95); }
            }
        `}</style>
       <Tabs defaultValue="tosee" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tosee">To See ({unseenVideos.length})</TabsTrigger>
                <TabsTrigger value="seen">Already Seen ({seenVideos.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="tosee">
                 {unseenVideos.length > 0 ? (
                    <>
                        <div className="text-center text-sm text-muted-foreground my-2">
                            {activeIndex + 1} / {unseenVideos.length}
                        </div>
                        <Swiper
                            effect={'cards'}
                            grabCursor={true}
                            modules={[EffectCards, Navigation]}
                            className="w-full h-[550px] sm:h-[600px]"
                            cardsEffect={{
                            perSlideOffset: 10,
                            perSlideRotate: 3,
                            slideShadows: true,
                            }}
                            navigation={{
                                nextEl: '.swiper-button-next',
                                prevEl: '.swiper-button-prev',
                            }}
                            onSwiper={setSwiper}
                            onSlideChange={handleSlideChange}
                        >
                            {unseenVideos.map((video, index) => (
                                <DeckSwiperSlide 
                                    video={video} 
                                    index={index} 
                                    key={video.id} 
                                    isVisible={index === activeIndex} 
                                    markAsRead={markAsRead}
                                />
                            ))}
                        </Swiper>
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <Button className="swiper-button-prev p-2 rounded-full h-12 w-12" variant="outline" size="icon" disabled={unseenVideos.length < 2}>
                            <ArrowUp className="h-6 w-6" />
                            </Button>
                            <Button className="swiper-button-next p-2 rounded-full h-12 w-12" variant="outline" size="icon" disabled={unseenVideos.length < 2}>
                            <ArrowDown className="h-6 w-6" />
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[550px] text-center">
                        <h3 className="text-xl font-semibold">All Caught Up!</h3>
                        <p className="text-muted-foreground">You've seen all the available videos.</p>
                    </div>
                )}
            </TabsContent>
            <TabsContent value="seen">
                <Card className="mt-4 h-[670px]">
                    <ScrollArea className="h-full">
                         {seenVideos.length > 0 ? (
                            seenVideos.map((video, index) => <SeenVideoCard key={video.id} video={video} index={index} />)
                         ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <h3 className="text-xl font-semibold">Nothing Here Yet</h3>
                                <p className="text-muted-foreground">Viewed videos will appear here.</p>
                            </div>
                         )}
                    </ScrollArea>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}

