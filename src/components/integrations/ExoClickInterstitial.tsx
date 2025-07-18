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

    let scriptLoaded = false;
    let adTriggered = false;
    let timeoutId: NodeJS.Timeout;

    const loadScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        const existingScript = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
        if (existingScript) {
          console.log('ExoClick script already exists');
          scriptLoaded = true;
          resolve();
          return;
        }

        // Create and inject script
        const script = document.createElement('script');
        script.async = true;
        script.type = 'application/javascript';
        script.src = SCRIPT_SRC;
        
        script.onload = () => {
          console.log('ExoClick script loaded successfully');
          scriptLoaded = true;
          resolve();
        };
        
        script.onerror = () => {
          console.error('Failed to load ExoClick script - possible ad blocker');
          reject(new Error('Failed to load ExoClick script'));
        };
        
        document.body.appendChild(script);
      });
    };

    const waitForAdProvider = (): Promise<void> => {
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkAdProvider = () => {
          attempts++;
          // @ts-ignore
          if (window.AdProvider && typeof window.AdProvider.push === 'function') {
            console.log('AdProvider is ready after', attempts * 100, 'ms');
            resolve();
          } else if (attempts >= maxAttempts) {
            console.warn('AdProvider not available after', maxAttempts * 100, 'ms');
            resolve(); // Resolve anyway to not block
          } else {
            setTimeout(checkAdProvider, 100);
          }
        };
        checkAdProvider();
      });
    };

    const triggerAd = async () => {
      try {
        console.log('Starting ExoClick ad trigger process...');
        
        // Wait for script to load
        await loadScript();
        
        // Wait for AdProvider to be available
        await waitForAdProvider();
        
        // Ensure container is ready
        if (!adRef.current) {
          console.error('Ad container not found');
          return;
        }

        console.log('Ad container ready, creating ad element...');

        // Clear any existing content
        adRef.current.innerHTML = '';
        
        // Create the ad element
        const ins = document.createElement('ins');
        ins.className = CLASS_NAME;
        ins.setAttribute('data-zoneid', ZONE_ID);
        ins.style.display = 'block';
        ins.style.width = '100%';
        ins.style.height = '100%';
        adRef.current.appendChild(ins);

        // Wait a bit for the element to be in DOM
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('Triggering ExoClick ad...');
        
        // Trigger the ad
        // @ts-ignore
        window.AdProvider.push({ serve: { zoneid: ZONE_ID } });
        adTriggered = true;
        console.log('ExoClick ad triggered successfully');

      } catch (error) {
        console.error('Error triggering ExoClick ad:', error);
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

    // Start the ad loading process
    triggerAd();

    // Cleanup function
    return () => {
      console.log('Cleaning up ExoClickInterstitial component');
      document.removeEventListener(eventName, handleAdDisplayed);
      clearTimeout(timeoutId);
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [onAdDisplayed]);

  return (
    <div 
      ref={adRef} 
      id="exoclick-interstitial-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 10001,
        backgroundColor: 'transparent'
      }}
    />
  );
}; 