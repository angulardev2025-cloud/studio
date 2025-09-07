
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Share2, ArrowUp, ArrowDown } from 'lucide-react';
import type { VideoData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectCards } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-cards';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

type VideoDeckCardProps = {
  videos: VideoData[];
};

export default function VideoDeckCard({ videos }: VideoDeckCardProps) {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <Swiper
        effect={'cards'}
        grabCursor={true}
        modules={[EffectCards, Navigation]}
        className="w-full h-[550px]"
        cardsEffect={{
          perSlideOffset: 15,
          perSlideRotate: 5,
          slideShadows: true,
        }}
        navigation={{
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        }}
      >
        {videos.map((video, index) => {
          const publishedAtDate = new Date(video.publishedAt);
          return (
            <SwiperSlide key={video.id}>
              <Card className="flex flex-col h-full overflow-hidden shadow-lg bg-card">
                  <CardHeader className='pb-2'>
                      <div className="flex items-center justify-between">
                          <span className="text-4xl font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                           <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" asChild>
                                  <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" aria-label="Share video">
                                      <Share2 />
                                  </Link>
                              </Button>
                           </div>
                      </div>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col md:flex-row gap-6 p-6 pt-0">
                       <div className="w-full md:w-2/5 aspect-video relative shrink-0 overflow-hidden rounded-lg">
                          <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                              {video.thumbnailUrl ? (
                                  <Image
                                      src={video.thumbnailUrl}
                                      alt={video.title}
                                      fill
                                      className="object-cover"
                                      sizes="(max-width: 768px) 40vw, 33vw"
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
                          <CardTitle className="font-headline text-xl font-semibold tracking-tight line-clamp-3 mb-2">
                              <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                  {video.title}
                              </Link>
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground mb-4">
                              By {video.uploader}
                          </CardDescription>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-6 flex-grow">{video.description}</p>
                           <time dateTime={video.publishedAt} className="text-xs text-muted-foreground mt-auto">
                              {formatDistanceToNow(publishedAtDate, { addSuffix: true })}
                          </time>
                      </div>
                  </CardContent>
              </Card>
            </SwiperSlide>
          );
        })}
      </Swiper>
      <div className="flex justify-center items-center gap-4 mt-4">
        <Button className="swiper-button-prev p-2" variant="outline" size="icon">
          <ArrowUp className="h-6 w-6" />
        </Button>
        <Button className="swiper-button-next p-2" variant="outline" size="icon">
          <ArrowDown className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
