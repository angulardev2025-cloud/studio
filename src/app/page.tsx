import YoutubeFetcher from '@/components/youtube-fetcher';

export default function Home() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-4xl text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-primary md:text-5xl lg:text-6xl">
          Kannada Tech Explorer
        </h1>
        <p className="mt-4 text-lg text-muted-foreground md:text-xl">
          Enter a YouTube channel URL to fetch all its video data instantly.
        </p>
      </div>
      <div className="mt-8 w-full max-w-5xl">
        <YoutubeFetcher />
      </div>
    </main>
  );
}
