
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
import { ScrollArea } from './ui/scroll-area';

const SeenVideoCard = ({ video, index }: { video: VideoData; index: number }) => (
    <div className="flex items-start gap-4 p-4 border-b">
        <span className="text-lg font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
        <div className="flex-grow">
            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer">
                {video.thumbnailUrl && <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    width={120}
                    height={68}
                    className="rounded-md object-cover aspect-video float-right ml-4"
                />}
                <p className="font-semibold line-clamp-2 hover:text-primary">{video.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{video.uploader}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })}</p>
            </Link>
        </div>
    </div>
)


const DeckSwiperSlide = ({ video, index, onView }: { video: VideoData; index: number, onView: (id: string) => void }) => {
    
    const publishedAtDate = new Date(video.publishedAt);

    const handleDoubleClick = () => {
      onView(video.id);
    };

    return (
        <SwiperSlide key={video.id} data-videoid={video.id}>
            <Card 
              onDoubleClick={handleDoubleClick}
              className="flex flex-col h-full overflow-hidden shadow-lg bg-card"
            >
                 <CardHeader className="flex-row items-center justify-between pb-2 px-4 sm:px-6">
                    <span className="text-3xl sm:text-4xl font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                     <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" aria-label="Share video" onClick={() => onView(video.id)}>
                                <Share2 />
                            </Link>
                        </Button>
                     </div>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col gap-4 p-4 sm:p-6 pt-0">
                     <div className="w-full aspect-video relative shrink-0 overflow-hidden rounded-lg">
                        <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full" onClick={() => onView(video.id)}>
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
                        </Link>
                    </div>
                    <div className="flex-grow flex flex-col">
                        <CardTitle className="font-headline text-lg sm:text-xl font-semibold tracking-tight line-clamp-3 mb-2">
                            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary" onClick={() => onView(video.id)}>
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
    unseenVideos: VideoData[];
    seenVideos: VideoData[];
    onView: (videoId: string) => void;
}

export default function VideoDeckCard({ unseenVideos, seenVideos, onView }: VideoDeckCardProps) {
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  useEffect(() => {
    swiper?.update();
  }, [unseenVideos, swiper]);

  const handleSlideChange = (swiperInstance: SwiperClass) => {
    setActiveIndex(swiperInstance.activeIndex);
    const activeSlide = swiperInstance.slides[swiperInstance.activeIndex];
    const videoId = activeSlide?.dataset.videoid;
    if (videoId) {
      // Delay marking as read slightly to feel natural
      const timer = setTimeout(() => {
        onView(videoId);
      }, 500);
      return () => clearTimeout(timer);
    }
  };


  return (
    <div className="relative w-full max-w-md mx-auto">
        <style jsx global>{`
            .swiper-slide-next {
                transition: transform 0.5s ease-out;
            }
            .fade-out {
                animation: fadeOut 0.5s ease-out forwards;
            }
            @keyframes fadeOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.95); }
            }
        `}</style>
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
                    key={unseenVideos.map(v => v.id).join('-')} // Force re-render when unseen videos change
                >
                    {unseenVideos.map((video, index) => (
                        <DeckSwiperSlide 
                            video={video} 
                            index={index} 
                            key={video.id} 
                            onView={onView}
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
    </div>
  );
}


export const SeenVideosList = ({ videos }: { videos: VideoData[] }) => (
    <Card className="mt-4 h-[670px]">
        <ScrollArea className="h-full">
                {videos.length > 0 ? (
                videos.map((video, index) => <SeenVideoCard key={video.id} video={video} index={index} />)
                ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <h3 className="text-xl font-semibold">Nothing Here Yet</h3>
                    <p className="text-muted-foreground">Viewed videos will appear here.</p>
                </div>
                )}
        </ScrollArea>
    </Card>
);
