'use client';
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProviderV2 } from '@/components/theme-provider';
import { Inter, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import ScrollToTopButton from '@/components/scroll-to-top';
import { useEffect, useState } from 'react';
import SplashScreen from '@/components/SplashScreen';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})
const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <ThemeProviderV2
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {loading ? <SplashScreen /> : children}
          <ScrollToTopButton />
          <Toaster />
        </ThemeProviderV2>
      </body>
    </html>
  );
}
