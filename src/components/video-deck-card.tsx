
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Share2 } from 'lucide-react';
import type { VideoData } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from './ui/button';

type VideoDeckCardProps = {
  videos: VideoData[];
};

export default function VideoDeckCard({ videos }: VideoDeckCardProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {videos.map((video, index) => {
        const publishedAtDate = new Date(video.publishedAt);
        return (
          <AccordionItem value={`item-${index}`} key={video.id}>
            <AccordionTrigger>
              <div className="flex items-center gap-4 text-left">
                <span className="text-2xl font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                <div className="flex flex-col">
                    <h3 className="font-headline text-lg font-semibold tracking-tight">{video.title}</h3>
                    <p className="text-sm text-muted-foreground">{video.uploader}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6 pl-12">
                <div className="w-full md:w-1/3 aspect-video relative shrink-0 overflow-hidden rounded-lg">
                    <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                        {video.thumbnailUrl ? (
                            <Image
                                src={video.thumbnailUrl}
                                alt={video.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 33vw"
                                data-ai-hint="youtube thumbnail"
                            />
                            ) : (
                            <div className="flex h-full w-full items-center justify-center bg-secondary">
                                <p className="text-muted-foreground">No thumbnail</p>
                            </div>
                        )}
                    </Link>
                </div>
                <div className="flex-grow">
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-4">{video.description}</p>
                    <div className="flex items-center justify-between">
                        <time dateTime={video.publishedAt} className="text-xs text-muted-foreground">
                            {formatDistanceToNow(publishedAtDate, { addSuffix: true })}
                        </time>
                         <Button variant="ghost" size="icon" asChild>
                            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" aria-label="Share video">
                                <Share2 />
                            </Link>
                        </Button>
                    </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
