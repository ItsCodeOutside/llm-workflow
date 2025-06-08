// src/hooks/useIsMobile.ts
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 640; // Corresponds to Tailwind's 'sm' breakpoint (min-width: 640px)

export const useIsMobile = (): boolean => {
  // Initialize state based on current window width
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false; // Default for SSR or environments without window
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Set initial state correctly after mount, in case window was undefined during SSR
    handleResize(); 

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};