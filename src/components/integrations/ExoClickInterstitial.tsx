import { useEffect, useRef } from 'react';

const ZONE_ID = '5678778';
const CLASS_NAME = 'eas6a97888e35';
const SCRIPT_SRC = 'https://a.pemsrv.com/ad-provider.js';

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

    const setupExoClick = async () => {
      try {
        console.log('Setting up ExoClick integration...');

        // Step 1: Load the ExoClick script
        if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
          const script = document.createElement('script');
          script.async = true;
          script.type = 'application/javascript';
          script.src = SCRIPT_SRC;
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => {
              console.log('ExoClick script loaded successfully');
              resolve();
            };
            script.onerror = () => {
              console.error('Failed to load ExoClick script');
              reject(new Error('Failed to load ExoClick script'));
            };
            document.body.appendChild(script);
          });
        } else {
          console.log('ExoClick script already exists');
        }

        // Step 2: Wait for AdProvider to be available
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

        // Step 3: Create ad container in document body (following ExoClick pattern)
        adContainer = document.createElement('div');
        adContainer.id = 'exoclick-ad-container';
        adContainer.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 10002;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        document.body.appendChild(adContainer);

        // Step 4: Create the ad element (following ExoClick documentation exactly)
        const ins = document.createElement('ins');
        ins.className = CLASS_NAME;
        ins.setAttribute('data-zoneid', ZONE_ID);
        ins.style.cssText = `
          display: block;
          width: 100%;
          height: 100%;
        `;
        adContainer.appendChild(ins);

        // Step 5: Wait for element to be in DOM
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Triggering ExoClick ad...');
        
        // Step 6: Trigger the ad (following ExoClick pattern)
        // @ts-ignore
        window.AdProvider.push({ serve: { zoneid: ZONE_ID } });
        console.log('ExoClick ad triggered successfully');

      } catch (error) {
        console.error('Error setting up ExoClick:', error);
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

    // Start the setup process
    setupExoClick();

    // Cleanup function
    return () => {
      console.log('Cleaning up ExoClickInterstitial component');
      document.removeEventListener(eventName, handleAdDisplayed);
      clearTimeout(timeoutId);
      
      // Remove the ad container from document body
      if (adContainer && adContainer.parentNode) {
        adContainer.parentNode.removeChild(adContainer);
      }
    };
  }, [onAdDisplayed]);

  // Return an empty div - the actual ad container is created in document body
  return <div ref={adRef} style={{ display: 'none' }} />;
}; 