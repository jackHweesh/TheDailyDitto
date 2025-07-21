import { useEffect, useRef } from 'react';

const ZONE_ID = '5678778';

export const ExoClickInterstitial = ({ onAdDisplayed }: { onAdDisplayed?: () => void }) => {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Skip ads in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Skipping ExoClick ad in development mode');
      if (onAdDisplayed) onAdDisplayed();
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let observer: MutationObserver | null = null;
    let scriptLoaded = false;

    // Helper to insert the ExoClick script if not already present
    const insertScript = () => {
      if (document.querySelector('script[src="https://a.pemsrv.com/ad-provider.js"]')) {
        scriptLoaded = true;
        return;
      }
      const script = document.createElement('script');
      script.async = true;
      script.type = 'application/javascript';
      script.src = 'https://a.pemsrv.com/ad-provider.js';
      script.onload = () => { scriptLoaded = true; };
      document.body.appendChild(script);
    };

    // Insert the script if needed
    insertScript();

    // Wait for AdProvider to be available
    const waitForAdProvider = async () => {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds
      while (attempts < maxAttempts) {
        // @ts-ignore
        if (window.AdProvider && typeof window.AdProvider.push === 'function') {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      return false;
    };

    // Show the ad
    const showAd = async () => {
      const ready = await waitForAdProvider();
      if (!ready) {
        console.error('❌ AdProvider not available after 10 seconds');
        if (onAdDisplayed) onAdDisplayed();
        window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
        return;
      }
      // @ts-ignore
      (window.AdProvider = window.AdProvider || []).push({"serve": {}});
      console.log('✅ AdProvider.push() called');
    };

    // Listen for ad displayed event
    const eventName = `creativeDisplayed-${ZONE_ID}`;
    const handleAdDisplayed = () => {
      console.log('🎉 ExoClick ad displayed successfully');
      clearTimeout(timeoutId);
      if (onAdDisplayed) onAdDisplayed();
      window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
    };
    document.addEventListener(eventName, handleAdDisplayed);

    // Timeout fallback
    timeoutId = setTimeout(() => {
      console.warn('⚠️ Ad display timeout after 15s');
      if (onAdDisplayed) onAdDisplayed();
      window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
    }, 15000);

    // Mutation observer for debugging (optional)
    if (adContainerRef.current) {
      observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            console.log('🔄 Container content changed:', {
              added: mutation.addedNodes.length,
              removed: mutation.removedNodes.length
            });
          }
        });
      });
      observer.observe(adContainerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    // Show the ad as soon as mounted
    showAd();

    // Cleanup
    return () => {
      document.removeEventListener(eventName, handleAdDisplayed);
      clearTimeout(timeoutId);
      if (observer) observer.disconnect();
    };
  }, [onAdDisplayed]);

  // Render the ad container and <ins> only when this component is mounted
  return (
    <div
      ref={adContainerRef}
      id="exoclick-interstitial-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.7)',
        zIndex: 9999,
      }}
    >
      <ins
        className="eas6a97888e35"
        data-zoneid={ZONE_ID}
        style={{ display: 'block', width: '100vw', height: '100vh' }}
      ></ins>
    </div>
  );
}; 