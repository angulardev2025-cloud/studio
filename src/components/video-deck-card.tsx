
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

type VideoDeckCardProps = {
  videos: VideoData[];
};

const READ_VIDEOS_KEY = 'readVideos';

const DeckSwiperSlide = ({ video, index, isVisible }: { video: VideoData; index: number, isVisible: boolean }) => {
    const [isRead, setIsRead] = useState(false);
    
    const markAsRead = useCallback(() => {
        if (isRead) return;
        try {
            const readVideos: string[] = JSON.parse(localStorage.getItem(READ_VIDEOS_KEY) || '[]');
            if (!readVideos.includes(video.id)) {
                const updatedReadVideos = [...readVideos, video.id];
                localStorage.setItem(READ_VIDEOS_KEY, JSON.stringify(updatedReadVideos));
                setIsRead(true);
            }
        } catch (e) {
            console.error('Failed to save read video status to localStorage', e);
        }
    }, [video.id, isRead]);

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
            // Delay marking as read slightly to feel natural
            const timer = setTimeout(() => {
                markAsRead();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isVisible, markAsRead]);
    
    const publishedAtDate = new Date(video.publishedAt);
    return (
        <SwiperSlide key={video.id}>
            <Card className="flex flex-col h-full overflow-hidden shadow-lg bg-card">
                <CardHeader className='pb-2 px-4 sm:px-6'>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl sm:text-4xl font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                         <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" asChild>
                                <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" aria-label="Share video" onClick={markAsRead}>
                                    <Share2 />
                                </Link>
                            </Button>
                         </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col gap-4 p-4 sm:p-6 pt-0">
                     <div className="w-full aspect-video relative shrink-0 overflow-hidden rounded-lg">
                        <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full" onClick={markAsRead}>
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
                            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary" onClick={markAsRead}>
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

export default function VideoDeckCard({ videos }: VideoDeckCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleSlideChange = (swiper: SwiperClass) => {
    setActiveIndex(swiper.activeIndex);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
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
        onSlideChange={handleSlideChange}
      >
        {videos.map((video, index) => (
           <DeckSwiperSlide 
              video={video} 
              index={index} 
              key={video.id} 
              isVisible={index === activeIndex} 
            />
        ))}
      </Swiper>
      <div className="flex justify-center items-center gap-4 mt-6">
        <Button className="swiper-button-prev p-2 rounded-full h-12 w-12" variant="outline" size="icon">
          <ArrowUp className="h-6 w-6" />
        </Button>
        <Button className="swiper-button-next p-2 rounded-full h-12 w-12" variant="outline" size="icon">
          <ArrowDown className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
