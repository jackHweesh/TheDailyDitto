import { useEffect, useRef, useCallback } from 'react';

interface UseExoClickAdReturn {
  preloadAd: () => void;
  showAd: () => Promise<void>;
  isAdReady: boolean;
  hasAdBeenShown: boolean;
}

declare global {
  interface Window {
    AdProvider?: unknown[];
  }
}

export const useExoClickAd = (): UseExoClickAdReturn => {
  const isAdReady = useRef(false);
  const hasAdBeenShown = useRef(false);
  const adDisplayPromise = useRef<Promise<void> | null>(null);

  // Preload the ad
  const preloadAd = useCallback(() => {
    // Only preload in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Check if we're in a development environment and skip ads
    if (process.env.NODE_ENV === 'development') {
      console.log('Skipping ExoClick ad in development mode');
      return;
    }

    if (window.AdProvider) {
      try {
        // Trigger ad preload
        window.AdProvider.push({
          serve: {
            zoneid: '5678778'
          }
        });
        isAdReady.current = true;
        console.log('ExoClick ad preloaded');
      } catch (error) {
        console.error('Error preloading ExoClick ad:', error);
      }
    } else {
      console.warn('ExoClick AdProvider not available for preloading');
    }
  }, []);

  // Show the ad
  const showAd = useCallback(async (): Promise<void> => {
    // Only show in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Check if we're in a development environment and skip ads
    if (process.env.NODE_ENV === 'development') {
      console.log('Skipping ExoClick ad display in development mode');
      return;
    }

    // If ad has already been shown in this session, don't show again
    if (hasAdBeenShown.current) {
      console.log('ExoClick ad already shown in this session');
      return;
    }

    // If we already have a pending ad display, return that promise
    if (adDisplayPromise.current) {
      return adDisplayPromise.current;
    }

    // Create a new promise for this ad display
    adDisplayPromise.current = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('ExoClick ad display timeout');
        hasAdBeenShown.current = true;
        adDisplayPromise.current = null;
        resolve(); // Resolve anyway to not block the app
      }, 10000); // 10 second timeout

      const handleAdDisplayed = () => {
        console.log('ExoClick ad displayed successfully');
        clearTimeout(timeout);
        hasAdBeenShown.current = true;
        adDisplayPromise.current = null;
        window.removeEventListener('exoclickAdDisplayed', handleAdDisplayed);
        resolve();
      };

      window.addEventListener('exoclickAdDisplayed', handleAdDisplayed);

      try {
        // Trigger the ad display
        if (window.AdProvider) {
          window.AdProvider.push({
            serve: {
              zoneid: '5678778'
            }
          });
        } else {
          console.warn('ExoClick AdProvider not available for display');
          clearTimeout(timeout);
          hasAdBeenShown.current = true;
          adDisplayPromise.current = null;
          window.removeEventListener('exoclickAdDisplayed', handleAdDisplayed);
          resolve();
        }
      } catch (error) {
        console.error('Error showing ExoClick ad:', error);
        clearTimeout(timeout);
        hasAdBeenShown.current = true;
        adDisplayPromise.current = null;
        window.removeEventListener('exoclickAdDisplayed', handleAdDisplayed);
        resolve(); // Resolve anyway to not block the app
      }
    });

    return adDisplayPromise.current;
  }, []);

  // Reset ad state when component unmounts (for testing purposes)
  useEffect(() => {
    return () => {
      adDisplayPromise.current = null;
    };
  }, []);

  return {
    preloadAd,
    showAd,
    isAdReady: isAdReady.current,
    hasAdBeenShown: hasAdBeenShown.current
  };
}; 