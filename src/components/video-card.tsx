
'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, Share2, Loader2, Eye, Circle } from 'lucide-react';

import type { VideoData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { summarizeDescription } from '@/ai/flows/summarize-flow';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';

type VideoCardProps = {
  video: VideoData;
  index: number;
  isRead: boolean;
  onView: (videoId: string) => void;
};

export default function VideoCard({ video, index, isRead, onView }: VideoCardProps) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set up Intersection Observer
    if (isRead || !cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onView(video.id);
          // We can disconnect the observer after the card has been viewed once
          if (cardRef.current) {
            observer.unobserve(cardRef.current);
          }
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1, // Mark as read when 10% of the card is visible
      }
    );

    observer.observe(cardRef.current);

    // Cleanup observer on component unmount
    return () => {
      if (cardRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(cardRef.current);
      }
    };
  }, [video.id, isRead, onView]);


  const publishedAtDate = new Date(video.publishedAt);

  const handleSummarize = async () => {
    if (!video.description) {
      setSummary("This video doesn't have a description to summarize.");
      return;
    }
    
    // Don't re-fetch if summary already exists
    if(summary) return;

    setError('');
    startTransition(async () => {
      try {
        const result = await summarizeDescription({ description: video.description });
        if (result.summary) {
          setSummary(result.summary);
        } else {
           setError('The AI could not generate a summary for this description.');
        }
      } catch (e) {
        console.error('Summarization error:', e);
        setError('An unexpected error occurred while generating the summary.');
        toast({
          title: 'Summarization Failed',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      handleSummarize();
    }
  }

  return (
    <Card ref={cardRef} className="flex h-full transform-gpu flex-col overflow-hidden rounded-xl shadow-md transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-2xl">
      <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="block aspect-video relative" onClick={() => onView(video.id)}>
        {isRead && (
            <Badge variant="secondary" className="absolute top-2 right-2 z-10">Read</Badge>
        )}
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
        {isRead && (
            <div className="absolute bottom-2 right-2 z-10 bg-black/60 p-1 rounded-full backdrop-blur-sm">
                <Eye className="h-4 w-4 text-white" />
            </div>
        )}
       </Link>
      <CardHeader className="flex-row items-center gap-4 flex-grow p-4">
        <span className="text-3xl font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
        <div className="flex flex-col">
            <CardTitle className="font-headline text-base font-bold leading-tight">
            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="line-clamp-2 hover:text-primary" onClick={() => onView(video.id)}>
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
            <Button variant="ghost" size="icon" asChild>
              <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" aria-label="Share video" onClick={() => onView(video.id)}>
                <Share2 />
              </Link>
            </Button>
          </div>
      </CardFooter>
    </Card>
  );
}
