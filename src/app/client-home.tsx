
'use client';

import YoutubeFeed from '@/components/youtube-fetcher';
import type { FetcherState } from '@/lib/types';

export default function ClientHome({ initialState }: { initialState: FetcherState }) {
  return <YoutubeFeed initialState={initialState} />;
}
