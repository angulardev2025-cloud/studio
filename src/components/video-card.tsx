
'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, Share2, Loader2, Copy } from 'lucide-react';

import type { VideoData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { summarizeDescription } from '@/ai/flows/summarize-flow';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type VideoCardProps = {
  video: VideoData;
  index: number;
  onView: (videoId: string) => void;
};

export default function VideoCard({ video, index, onView }: VideoCardProps) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const publishedAtDate = new Date(video.publishedAt);

  const handleSummarize = () => {
    if (!video.description) {
      setSummary("This video doesn't have a description to summarize.");
      return;
    }
    
    // Don't re-fetch if summary already exists and we are not opening the dialog
    if(summary && !isDialogOpen) return;

    setError('');
    setSummary(''); // Reset summary when opening
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

  const handleView = () => {
    onView(video.id);
  }
  
  const handleDoubleClick = () => {
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
      className="flex h-full transform-gpu flex-col overflow-hidden rounded-xl shadow-md transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-2xl"
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
      <CardHeader className="flex-row items-center gap-4 flex-grow p-4">
        <span className="text-3xl font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
        <div className="flex flex-col">
            <CardTitle className="font-headline text-base font-bold leading-tight">
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
            <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Summarize description">
                  <Sparkles />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>AI Summary</DialogTitle>
                  <DialogDescription>
                    A concise summary of the video description, generated by AI.
                  </DialogDescription>
                </DialogHeader>
                <div className="prose prose-sm max-w-full text-foreground">
                  {isPending && (
                    <div className="flex items-center gap-2">
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
                  {summary && <p>{summary}</p>}
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Copy share link">
                <Copy />
            </Button>

            <Button variant="ghost" size="icon" asChild>
              <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" aria-label="Open video on YouTube" onClick={handleView}>
                <Share2 />
              </Link>
            </Button>
          </div>
      </CardFooter>
    </Card>
  );
}
