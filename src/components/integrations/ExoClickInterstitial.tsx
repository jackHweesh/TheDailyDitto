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

    // Inject ExoClick script if not already present
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement('script');
      script.async = true;
      script.type = 'application/javascript';
      script.src = SCRIPT_SRC;
      document.body.appendChild(script);
    }

    // Remove any previous <ins> and add new one
    if (adRef.current) adRef.current.innerHTML = '';
    const ins = document.createElement('ins');
    ins.className = CLASS_NAME;
    ins.setAttribute('data-zoneid', ZONE_ID);
    if (adRef.current) adRef.current.appendChild(ins);

    // Wait for AdProvider, then push ad
    let interval: NodeJS.Timeout | null = setInterval(() => {
      // @ts-ignore
      if (window.AdProvider && adRef.current) {
        // @ts-ignore
        window.AdProvider.push({ serve: { zoneid: ZONE_ID } });
        clearInterval(interval!);
      }
    }, 100);

    // Listen for ad displayed event
    const eventName = `creativeDisplayed-${ZONE_ID}`;
    const handleAdDisplayed = () => {
      console.log('ExoClick interstitial ad displayed');
      if (onAdDisplayed) onAdDisplayed();
      window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
    };
    document.addEventListener(eventName, handleAdDisplayed);

    return () => {
      document.removeEventListener(eventName, handleAdDisplayed);
      if (interval) clearInterval(interval);
      if (adRef.current) adRef.current.innerHTML = '';
    };
  }, [onAdDisplayed]);

  return <div ref={adRef} id="exoclick-interstitial-container" />;
}; 