import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProviderV2 } from '@/components/theme-provider';
import { Inter, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import ScrollToTopButton from '@/components/scroll-to-top';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})
const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'Kannada Tech Data',
  description: 'The latest videos from your favorite tech channels.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <ThemeProviderV2
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ScrollToTopButton />
          <Toaster />
        </ThemeProviderV2>
      </body>
    </html>
  );
}
