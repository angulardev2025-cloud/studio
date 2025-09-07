import YoutubeFeed from '@/components/youtube-fetcher';
import { fetchYouTubeFeed } from '@/app/actions';

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const offline = searchParams.offline === 'true';
  const initialState = await fetchYouTubeFeed({ offline });

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
