
import YoutubeFeed from '@/components/youtube-fetcher';
import type { FetcherState } from '@/lib/types';
import { fetchYouTubeFeed } from './actions';

export default async function Home({
  searchParams,
}: {
  searchParams: { [key:string]: string | string[] | undefined };
}) {

  // Fetch initial data on the server.
  // This helps with SEO and provides a faster initial load.
  // The client-side component will then take over.
  const initialState: FetcherState = await fetchYouTubeFeed({ offline: true });

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
