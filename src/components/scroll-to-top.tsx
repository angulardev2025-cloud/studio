'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ScrollToTopButton() {
  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);
  const [isScrollToBottomVisible, setIsScrollToBottomVisible] = useState(true);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show "scroll to top" if scrolled down more than 300px
      if (window.scrollY > 300) {
        setIsScrollToTopVisible(true);
      } else {
        setIsScrollToTopVisible(false);
      }
      
      // Show "scroll to bottom" if not at the bottom of the page
      const isAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 2; // 2px buffer
      if (isAtBottom) {
        setIsScrollToBottomVisible(false);
      } else {
        setIsScrollToBottomVisible(true);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    toggleVisibility(); // Initial check

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
       <Button
        variant="outline"
        size="icon"
        onClick={scrollToBottom}
        className={cn(
          'rounded-full transition-opacity duration-300',
          isScrollToBottomVisible ? 'opacity-100' : 'opacity-0'
        )}
        aria-label="Scroll to bottom"
      >
        <ArrowDown className="h-6 w-6" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={scrollToTop}
        className={cn(
          'rounded-full transition-opacity duration-300',
          isScrollToTopVisible ? 'opacity-100' : 'opacity-0'
        )}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-6 w-6" />
      </Button>
    </div>
  );
}
