
import { fetchYouTubeFeed } from './actions';
import type { FetcherState } from '@/lib/types';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import ClientHome from './client-home';
import Image from 'next/image';


function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function Home() {
  // Fetch initial data on the server.
  // This helps with SEO and provides a faster initial load.
  // The client-side component will then take over.
  const initialState: FetcherState = await fetchYouTubeFeed({ offline: true });

  return (
    <main className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <Image src='/download.jpg' alt='logo' width={40} height={40} />
           <h1 className="text-2xl font-bold tracking-tight">YTSHORTS</h1>
           <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">v4.0.1</span>
        </div>
      </div>
      <Suspense fallback={<LoadingState />}>
        <ClientHome initialState={initialState} />
      </Suspense>
    </main>
  );
}
