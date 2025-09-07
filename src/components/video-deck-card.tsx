
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Share2, ArrowUp, ArrowDown } from 'lucide-react';
import type { VideoData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import React from 'react';
import { cn } from '@/lib/utils';

type VideoDeckCardProps = {
  videos: VideoData[];
};

export default function VideoDeckCard({ videos }: VideoDeckCardProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);


  return (
    <div className="relative w-full max-w-2xl mx-auto">
       <Carousel 
        setApi={setApi}
        orientation="vertical"
        className="w-full"
        opts={{
            align: "start",
        }}
    >
        <CarouselContent className="-mt-4 h-[600px]">
          {videos.map((video, index) => {
            const publishedAtDate = new Date(video.publishedAt);
            return (
              <CarouselItem key={video.id} className="pt-4 basis-full">
                <Card className="flex flex-col h-full overflow-hidden shadow-lg">
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
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <div className="absolute top-1/2 -translate-y-1/2 flex flex-col justify-between h-full py-4 -right-12">
            <CarouselPrevious className="static translate-y-0" />
            <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
      <div className="py-2 text-center text-sm text-muted-foreground">
        Card {current} of {count}
      </div>
    </div>
  );
}
