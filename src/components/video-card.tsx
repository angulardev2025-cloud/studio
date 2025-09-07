import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

import type { VideoData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

type VideoCardProps = {
  video: VideoData;
};

export default function VideoCard({ video }: VideoCardProps) {
  const publishedAtDate = new Date(video.publishedAt);

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <div className="aspect-video relative">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="youtube thumbnail"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <p className="text-muted-foreground">No thumbnail</p>
          </div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-2 text-lg font-bold font-headline">{video.title}</CardTitle>
        <CardDescription className="pt-2 text-sm">
          By {video.uploader} &bull;{' '}
          <time dateTime={video.publishedAt}>
            {formatDistanceToNow(publishedAtDate, { addSuffix: true })}
          </time>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="line-clamp-4 text-sm text-muted-foreground">
          {video.description || 'No description provided.'}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={video.shareLink} target="_blank" rel="noopener noreferrer">
            Watch on YouTube
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
