import { useEffect, useRef } from 'react';

const ZONE_ID = '5678778';
const TRIGGER_CLASS = 'show-interstitial';

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
    let isAdTriggered = false;
    let observer: MutationObserver | null = null;

    const setupExoClick = async () => {
      try {
        console.log('=== EXOCLICK SETUP ===');
        console.log('Zone ID:', ZONE_ID);
        console.log('Trigger class:', TRIGGER_CLASS);

        // Step 1: Verify the HTML container exists (should be in index.html)
        adContainer = document.getElementById('exoclick-interstitial-container');
        if (!adContainer) {
          console.error('❌ ExoClick container not found in HTML');
          throw new Error('ExoClick container not found');
        }
        console.log('✅ ExoClick container found');

        // Step 2: Verify the <ins> element exists
        const insElement = adContainer.querySelector('ins[data-zoneid="5678778"]');
        if (!insElement) {
          console.error('❌ ExoClick <ins> element not found');
          throw new Error('ExoClick <ins> element not found');
        }
        console.log('✅ ExoClick <ins> element found');

        // Step 3: Check if ExoClick script is loaded
        const scriptElement = document.querySelector('script[src="https://a.pemsrv.com/ad-provider.js"]');
        if (!scriptElement) {
          console.error('❌ ExoClick script not found');
          throw new Error('ExoClick script not found');
        }
        console.log('✅ ExoClick script found');

        // Step 4: Wait for AdProvider to be available
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds
        
        console.log('⏳ Waiting for AdProvider...');
        while (attempts < maxAttempts) {
          // @ts-ignore
          if (window.AdProvider && typeof window.AdProvider.push === 'function') {
            console.log('✅ AdProvider ready after', attempts * 100, 'ms');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (attempts >= maxAttempts) {
          console.error('❌ AdProvider not available after 10 seconds');
          throw new Error('AdProvider not available');
        }

        // Step 5: Set up click listener for trigger class
        console.log('🎯 Setting up click listener for class:', TRIGGER_CLASS);
        
        const triggerElements = document.querySelectorAll(`.${TRIGGER_CLASS}`);
        console.log('Found trigger elements:', triggerElements.length);
        
        const handleTriggerClick = (event: Event) => {
          if (isAdTriggered) {
            console.log('⚠️ Ad already triggered, ignoring click');
            return;
          }

          const target = event.target as HTMLElement;
          const hasClass = target.classList.contains(TRIGGER_CLASS);
          const hasParentClass = target.closest(`.${TRIGGER_CLASS}`);
          
          if (hasClass || hasParentClass) {
            console.log('🎯 Trigger class clicked, showing ad...');
            isAdTriggered = true;
            showAd();
          }
        };

        document.addEventListener('click', handleTriggerClick);
        console.log('✅ Click listener added');

        // Return cleanup function
        return () => {
          document.removeEventListener('click', handleTriggerClick);
        };

      } catch (error) {
        console.error('❌ Error setting up ExoClick:', error);
        if (onAdDisplayed) onAdDisplayed();
      }
    };

    const showAd = async () => {
      try {
        console.log('🎬 Showing ExoClick ad...');

        // Step 1: Make container visible
        if (adContainer) {
          adContainer.style.display = 'flex';
          adContainer.style.alignItems = 'center';
          adContainer.style.justifyContent = 'center';
          console.log('✅ Container made visible');
        }

        // Step 2: Wait for container to be visible
        await new Promise(resolve => setTimeout(resolve, 100));

        // Step 3: Verify container and <ins> are visible
        if (adContainer) {
          const computedStyle = window.getComputedStyle(adContainer);
          console.log('Container computed display:', computedStyle.display);
          
          const insElement = adContainer.querySelector('ins[data-zoneid="5678778"]');
          if (insElement) {
            const insComputedStyle = window.getComputedStyle(insElement);
            console.log('INS element computed display:', insComputedStyle.display);
          }
        }

        // Step 4: Trigger the ad (ONLY ONCE)
        console.log('🎯 Triggering ExoClick ad...');
        // @ts-ignore
        (window.AdProvider = window.AdProvider || []).push({"serve": {}});
        console.log('✅ AdProvider.push() called');

        // Step 5: Monitor for ad content
        if (adContainer) {
          observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                console.log('🔄 Container content changed:', {
                  added: mutation.addedNodes.length,
                  removed: mutation.removedNodes.length
                });
                mutation.addedNodes.forEach(node => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    console.log('Added element:', (node as Element).tagName, (node as Element).className);
                  }
                });
              }
            });
          });

          observer.observe(adContainer, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
          });
          console.log('✅ Mutation observer started');
        }

      } catch (error) {
        console.error('❌ Error showing ad:', error);
        if (onAdDisplayed) onAdDisplayed();
      }
    };

    // Set up event listener for ad display
    const eventName = `creativeDisplayed-${ZONE_ID}`;
    const handleAdDisplayed = () => {
      console.log('🎉 ExoClick ad displayed successfully');
      clearTimeout(timeoutId);
      if (onAdDisplayed) onAdDisplayed();
      window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
    };

    document.addEventListener(eventName, handleAdDisplayed);
    console.log('✅ Event listener added for:', eventName);

    // Set up timeout fallback
    timeoutId = setTimeout(() => {
      console.warn('⚠️ Ad display timeout after 15s');
      if (onAdDisplayed) onAdDisplayed();
      window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
    }, 15000);

    let setupCleanup: (() => void) | null = null;

    // Start setup
    setupExoClick().then(cleanup => {
      setupCleanup = cleanup;
    });

    // Cleanup function - CRITICAL: Don't hide the container!
    return () => {
      console.log('🧹 Cleaning up ExoClickInterstitial');
      document.removeEventListener(eventName, handleAdDisplayed);
      clearTimeout(timeoutId);
      
      if (setupCleanup) setupCleanup();
      
      if (observer) {
        observer.disconnect();
      }
      
      // IMPORTANT: DO NOT hide the container here!
      // Let ExoClick manage the container visibility
      console.log('✅ Cleanup complete - container left visible for ExoClick');
    };
  }, [onAdDisplayed]);

  // Return empty div - container is managed in HTML
  return <div ref={adRef} style={{ display: 'none' }} />;
}; 