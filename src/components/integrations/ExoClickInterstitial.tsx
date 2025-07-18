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
        console.log('Setting up ExoClick integration with original pattern...');

        // Step 1: Create ad container in document body
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
        console.log('Ad container created and added to document body');

        // Step 2: Add the original ExoClick HTML structure exactly as in documentation
        adContainer.innerHTML = `
          <ins class="${CLASS_NAME}" data-zoneid="${ZONE_ID}"></ins>
        `;

        // Step 3: Load the ExoClick script if not already loaded
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
              console.error('Failed to load ExoClick script - possible ad blocker detected');
              reject(new Error('Failed to load ExoClick script'));
            };
            document.body.appendChild(script);
          });
        } else {
          console.log('ExoClick script already exists');
        }

        // Step 4: Wait for AdProvider to be available
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

        // Step 5: Wait for element to be in DOM
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Triggering ExoClick ad with original pattern...');
        
        // Step 6: Trigger the ad using the original pattern from documentation
        // @ts-ignore
        (window.AdProvider = window.AdProvider || []).push({"serve": {}});
        console.log('ExoClick ad triggered successfully with original pattern');

        // Step 7: Check for ad content after a short delay
        setTimeout(() => {
          const adElement = adContainer?.querySelector(`ins.${CLASS_NAME}`);
          if (adElement) {
            console.log('Checking ad element content after 2s...');
            console.log('Ad element children count:', adElement.children.length);
            console.log('Ad element innerHTML length:', adElement.innerHTML.length);
            console.log('Ad element computed style display:', window.getComputedStyle(adElement).display);
            console.log('Ad element computed style visibility:', window.getComputedStyle(adElement).visibility);
            console.log('Ad element computed style opacity:', window.getComputedStyle(adElement).opacity);
            
            // If ad content is present but event didn't fire, trigger manually
            if (adElement.children.length > 0 && adElement.innerHTML.length > 100) {
              console.log('Ad content detected but event not fired - triggering manually');
              window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
            }
          }
        }, 2000);

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
      const adElement = adContainer?.querySelector(`ins.${CLASS_NAME}`);
      console.log('Final ad element state:', adElement ? {
        childrenCount: adElement.children.length,
        innerHTMLLength: adElement.innerHTML.length,
        display: window.getComputedStyle(adElement).display,
        visibility: window.getComputedStyle(adElement).visibility
      } : 'No ad element');
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