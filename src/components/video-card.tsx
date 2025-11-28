
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Share2, Copy } from 'lucide-react';

import type { VideoData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type VideoCardProps = {
  video: VideoData;
  index: number;
  onView: (videoId: string) => void;
};

export default function VideoCard({ video, index, onView }: VideoCardProps) {
  const { toast } = useToast();

  const publishedAtDate = new Date(video.publishedAt);

  const handleView = () => {
    onView(video.id);
  }
  
  const handleDoubleClick = () => {
    window.open(video.shareLink, '_blank', 'noopener,noreferrer');
    onView(video.id);
  };
  
  const handleShare = () => {
    navigator.clipboard.writeText(video.shareLink).then(() => {
      toast({
        title: 'Copied to Clipboard',
        description: 'Video link copied.',
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        title: 'Error',
        description: 'Could not copy link to clipboard.',
        variant: 'destructive',
      });
    });
  };


  return (
    <Card 
      onDoubleClick={handleDoubleClick}
      className="flex h-full transform-gpu flex-col overflow-hidden rounded-xl bg-card shadow-md transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-primary/20"
    >
      <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="block aspect-video relative" onClick={handleView}>
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            data-ai-hint="youtube thumbnail"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <p className="text-muted-foreground">No thumbnail</p>
          </div>
        )}
       </Link>
      <CardHeader className="flex-row items-start gap-4 p-4">
        <span className="text-3xl font-bold text-muted-foreground pt-1">{String(index + 1).padStart(2, '0')}</span>
        <div className="flex flex-col flex-1">
            <CardTitle className="text-base font-bold leading-tight">
            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="line-clamp-2 hover:text-primary" onClick={handleView}>
                {video.title}
            </Link>
            </CardTitle>
            <CardDescription className="pt-2 text-xs">
            {video.uploader}
            </CardDescription>
        </div>
      </CardHeader>
      {video.description && (
        <CardContent className="p-4 pt-0">
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {video.description}
          </p>
        </CardContent>
      )}
      <CardFooter className="mt-auto flex items-center justify-between p-4 pt-0">
          <time dateTime={video.publishedAt} className="text-xs text-muted-foreground">
            {formatDistanceToNow(publishedAtDate, { addSuffix: true })}
          </time>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Copy share link">
                <Copy className="size-4" />
            </Button>

            <Button variant="ghost" size="icon" asChild>
              <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" aria-label="Open video on YouTube" onClick={handleView}>
                <Share2 className="size-4" />
              </Link>
            </Button>
          </div>
      </CardFooter>
    </Card>
  );
}
