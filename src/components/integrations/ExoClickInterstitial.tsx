import { useEffect, useRef } from 'react';

const ZONE_ID = '5678778';

export const ExoClickInterstitial = ({ onAdDisplayed }: { onAdDisplayed?: () => void }) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if we're in a development environment and skip ads
    if (process.env.NODE_ENV === 'development') {
      console.log('Skipping ExoClick ad in development mode');
      if (onAdDisplayed) onAdDisplayed();
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let adContainer: HTMLElement | null = null;

    const showAd = async () => {
      try {
        console.log('Showing ExoClick ad using HTML container...');

        // Step 1: Get the existing HTML container
        adContainer = document.getElementById('exoclick-interstitial-container');
        if (!adContainer) {
          console.error('ExoClick container not found in HTML');
          throw new Error('ExoClick container not found');
        }

        // Step 2: Show the container
        adContainer.style.display = 'flex';
        adContainer.style.alignItems = 'center';
        adContainer.style.justifyContent = 'center';
        console.log('Ad container made visible');

        // Step 3: Wait for AdProvider to be available
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds
        
        while (attempts < maxAttempts) {
          // @ts-ignore
          if (window.AdProvider && typeof window.AdProvider.push === 'function') {
            console.log('AdProvider is ready after', attempts * 100, 'ms');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (attempts >= maxAttempts) {
          throw new Error('AdProvider not available after 10 seconds');
        }

        // Step 4: Wait a bit for everything to be ready
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Triggering ExoClick ad with original pattern...');
        
        // Step 5: Trigger the ad using the original pattern
        // @ts-ignore
        (window.AdProvider = window.AdProvider || []).push({"serve": {}});
        console.log('ExoClick ad triggered successfully');

      } catch (error) {
        console.error('Error showing ExoClick ad:', error);
        if (onAdDisplayed) onAdDisplayed();
      }
    };

    // Set up event listener for ad display
    const eventName = `creativeDisplayed-${ZONE_ID}`;
    const handleAdDisplayed = () => {
      console.log('ExoClick interstitial ad displayed successfully');
      clearTimeout(timeoutId);
      if (onAdDisplayed) onAdDisplayed();
      window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
    };

    // Listen for the ad displayed event
    document.addEventListener(eventName, handleAdDisplayed);
    console.log('Event listener added for:', eventName);

    // Set up timeout fallback
    timeoutId = setTimeout(() => {
      console.warn('ExoClick ad display timeout after 15s - proceeding anyway');
      if (onAdDisplayed) onAdDisplayed();
      window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
    }, 15000); // 15 second timeout

    // Start the ad display process
    showAd();

    // Cleanup function
    return () => {
      console.log('Cleaning up ExoClickInterstitial component');
      document.removeEventListener(eventName, handleAdDisplayed);
      clearTimeout(timeoutId);
      
      // Hide the ad container
      if (adContainer) {
        adContainer.style.display = 'none';
      }
    };
  }, [onAdDisplayed]);

  // Return an empty div - the actual ad container is in HTML
  return <div ref={adRef} style={{ display: 'none' }} />;
}; 