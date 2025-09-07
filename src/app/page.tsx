import YoutubeFeed from '@/components/youtube-fetcher';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <h1 className="text-2xl font-bold tracking-tight">Key Insights</h1>
           <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">v1</span>
        </div>
      </div>
      <YoutubeFeed />
    </main>
  );
}
