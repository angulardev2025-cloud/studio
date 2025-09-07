
'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, Share2, Loader2 } from 'lucide-react';

import type { VideoData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { summarizeDescription } from '@/ai/flows/summarize-flow';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type VideoCardProps = {
  video: VideoData;
};

export default function VideoCard({ video }: VideoCardProps) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

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
    <Card className="flex h-full transform-gpu flex-col overflow-hidden rounded-xl shadow-md transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-2xl">
      <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="block aspect-video relative">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            data-ai-hint="youtube thumbnail"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <p className="text-muted-foreground">No thumbnail</p>
          </div>
        )}
       </Link>
      <CardHeader className="flex-grow p-4">
        <CardTitle className="font-headline text-base font-bold leading-tight">
          <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" className="line-clamp-2 hover:text-primary">
            {video.title}
          </Link>
        </CardTitle>
        <CardDescription className="pt-2 text-xs">
          {video.uploader}
        </CardDescription>
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
            {/*
             <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Summarize video">
                  <Sparkles />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>AI Summary</DialogTitle>
                  <DialogDescription asChild>
                     <div className="pt-4 space-y-4">
                        {isPending && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="animate-spin" />
                            <span>Generating summary...</span>
                          </div>
                        )}
                        {error && (
                            <Alert variant="destructive">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {!isPending && summary && <p>{summary}</p>}
                     </div>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            */}
            <Button variant="ghost" size="icon" asChild>
              <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" aria-label="Share video">
                <Share2 />
              </Link>
            </Button>
          </div>
      </CardFooter>
    </Card>
  );
}
