import YoutubeFeed from '@/components/youtube-fetcher';
import type { FetcherState } from '@/lib/types';

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {

  // Default empty state, videos will be fetched on client-side interaction
  const initialState: FetcherState = {
    data: [],
    error: null,
    message: "Click 'Fetch Videos' to load the latest content or 'Offline Mode' to load from cache.",
    hits: 0,
  };

  return (
    <main className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <h1 className="text-2xl font-bold tracking-tight">YT Channel Shorts</h1>
           <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">v3</span>
        </div>
      </div>
      <YoutubeFeed initialState={initialState} />
    </main>
  );
}
