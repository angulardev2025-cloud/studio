import YoutubeFeed from '@/components/youtube-fetcher';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="font-headline text-4xl font-bold tracking-tight text-primary md:text-5xl">
            Kannada Tech Feed
          </h1>
          <p className="mt-3 text-lg text-muted-foreground md:text-xl">
            Your daily digest of the latest tech videos.
          </p>
        </div>
        
        <YoutubeFeed />

      </div>
    </main>
  );
}
