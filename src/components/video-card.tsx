import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

import type { VideoData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

type VideoCardProps = {
  video: VideoData;
};

export default function VideoCard({ video }: VideoCardProps) {
  const publishedAtDate = new Date(video.publishedAt);

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
          <Button variant="ghost" size="icon" asChild>
            <Link href={video.shareLink} target="_blank" rel="noopener noreferrer" aria-label="Share video">
              <Share2 />
            </Link>
          </Button>
      </CardFooter>
    </Card>
  );
}
