import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProviderV2 } from '@/components/theme-provider';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Youtube Tech Feed',
  description: 'Your daily digest of the latest tech videos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProviderV2
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProviderV2>
        <footer className="fixed bottom-0 left-0 w-full bg-background/80 py-2 text-center text-xs text-muted-foreground backdrop-blur-sm">
          <Link href="https://firebase.google.com/docs/studio" target='_blank' className='hover:text-primary'>
            v1
          </Link>
        </footer>
      </body>
    </html>
  );
}
