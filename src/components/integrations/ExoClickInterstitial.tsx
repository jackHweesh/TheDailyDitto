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
    let adDisplayTimeout: NodeJS.Timeout;

    const setupExoClick = async () => {
      try {
        console.log('=== EXOCLICK TRIGGER CLASS SETUP ===');
        console.log('Setting up ExoClick with trigger class:', TRIGGER_CLASS);
        console.log('Zone ID:', ZONE_ID);

        // Step 1: Get the existing HTML container
        adContainer = document.getElementById('exoclick-interstitial-container');
        if (!adContainer) {
          console.error('❌ ExoClick container not found in HTML');
          console.error('Expected element with ID: exoclick-interstitial-container');
          console.error('Available elements with similar IDs:', 
            Array.from(document.querySelectorAll('[id*="exoclick"]')).map(el => el.id)
          );
          throw new Error('ExoClick container not found');
        }
        console.log('✅ ExoClick container found:', adContainer);
        console.log('Container initial display:', adContainer.style.display);
        console.log('Container classes:', adContainer.className);

        // Step 2: Check if ExoClick script is loaded
        const scriptElement = document.querySelector('script[src="https://a.pemsrv.com/ad-provider.js"]');
        if (!scriptElement) {
          console.error('❌ ExoClick script not found - possible ad blocker');
                  console.error('Available scripts:', 
          Array.from(document.querySelectorAll('script[src*="exoclick"], script[src*="pemsrv"]')).map(s => (s as HTMLScriptElement).src)
        );
          throw new Error('ExoClick script not found');
        }
        console.log('✅ ExoClick script found:', (scriptElement as HTMLScriptElement).src);

        // Step 3: Wait for AdProvider to be available
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds
        
        console.log('⏳ Waiting for AdProvider to be available...');
        while (attempts < maxAttempts) {
          // @ts-ignore
          if (window.AdProvider && typeof window.AdProvider.push === 'function') {
            console.log('✅ AdProvider is ready after', attempts * 100, 'ms');
            // @ts-ignore
            console.log('AdProvider methods:', Object.keys(window.AdProvider));
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (attempts >= maxAttempts) {
          console.error('❌ AdProvider not available after 10 seconds');
          // @ts-ignore
          console.error('Window.AdProvider:', window.AdProvider);
          throw new Error('AdProvider not available after 10 seconds');
        }

        // Step 4: Set up click event listener for trigger class
        console.log('🎯 Setting up click listener for class:', TRIGGER_CLASS);
        
        // Check if trigger class elements exist
        const triggerElements = document.querySelectorAll(`.${TRIGGER_CLASS}`);
        console.log('Found trigger elements:', triggerElements.length);
        triggerElements.forEach((el, i) => {
          console.log(`Trigger element ${i}:`, el.tagName, el.className, el.textContent?.substring(0, 50));
        });
        
        const handleTriggerClick = (event: Event) => {
          console.log('🎯 Click detected on:', event.target);
          
          if (isAdTriggered) {
            console.log('⚠️ Ad already triggered, ignoring click');
            return;
          }

          const target = event.target as HTMLElement;
          const hasClass = target.classList.contains(TRIGGER_CLASS);
          const hasParentClass = target.closest(`.${TRIGGER_CLASS}`);
          
          console.log('Click analysis:', {
            hasClass,
            hasParentClass: !!hasParentClass,
            targetClasses: target.className,
            targetTag: target.tagName
          });

          if (hasClass || hasParentClass) {
            console.log('🎯 Trigger class clicked, showing ad...');
            isAdTriggered = true;
            showAd();
          }
        };

        // Listen for clicks on elements with the trigger class
        document.addEventListener('click', handleTriggerClick);
        console.log('✅ Click listener added for class:', TRIGGER_CLASS);

        // Cleanup function for this setup
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

        // Show the container
        if (adContainer) {
          adContainer.style.display = 'flex';
          adContainer.style.alignItems = 'center';
          adContainer.style.justifyContent = 'center';
          console.log('✅ Ad container made visible');
          console.log('Container display after change:', adContainer.style.display);
        }

        // Wait a bit for everything to be ready
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Ad container is visible and ready for ExoClick to trigger ad');
        
        // CRITICAL: Trigger the ad using AdProvider.push()
        console.log('🎯 Triggering ExoClick ad with AdProvider.push()...');
        // @ts-ignore
        (window.AdProvider = window.AdProvider || []).push({"serve": {}});
        console.log('✅ ExoClick ad triggered successfully');
        
        // Monitor the ad container for content changes
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              console.log('🔄 Ad container content changed:', {
                addedNodes: mutation.addedNodes.length,
                removedNodes: mutation.removedNodes.length
              });
              mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  console.log('Added element:', (node as Element).tagName, (node as Element).className);
                }
              });
            }
          });
        });

        if (adContainer) {
          observer.observe(adContainer, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
          });
          console.log('✅ Mutation observer started to monitor ad container');
        }

        // Set a timeout to check if ad content appears
        adDisplayTimeout = setTimeout(() => {
          console.log('⏰ Checking ad container content after 5s...');
          if (adContainer) {
            console.log('Ad container HTML:', adContainer.innerHTML);
            console.log('Ad container children:', adContainer.children.length);
            console.log('Ad container computed style:', window.getComputedStyle(adContainer));
          }
        }, 5000);

      } catch (error) {
        console.error('❌ Error showing ExoClick ad:', error);
        if (onAdDisplayed) onAdDisplayed();
      }
    };

    // Set up event listener for ad display
    const eventName = `creativeDisplayed-${ZONE_ID}`;
    const handleAdDisplayed = () => {
      console.log('🎉 ExoClick interstitial ad displayed successfully');
      console.log('Event details:', {
        eventName,
        zoneId: ZONE_ID,
        timestamp: new Date().toISOString()
      });
      clearTimeout(timeoutId);
      clearTimeout(adDisplayTimeout);
      if (onAdDisplayed) onAdDisplayed();
      window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
    };

    // Listen for the ad displayed event
    document.addEventListener(eventName, handleAdDisplayed);
    console.log('✅ Event listener added for:', eventName);

    // Set up timeout fallback
    timeoutId = setTimeout(() => {
      console.warn('⚠️ ExoClick ad display timeout after 15s - proceeding anyway');
      console.warn('This could indicate:');
      console.warn('- No ad inventory available');
      console.warn('- Geographic restrictions');
      console.warn('- Ad blocker interference');
      console.warn('- Zone configuration issues');
      if (onAdDisplayed) onAdDisplayed();
      window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
    }, 15000); // 15 second timeout

    let setupCleanup: (() => void) | null = null;

    // Start the setup process
    setupExoClick().then(cleanup => {
      setupCleanup = cleanup;
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up ExoClickInterstitial component');
      document.removeEventListener(eventName, handleAdDisplayed);
      clearTimeout(timeoutId);
      clearTimeout(adDisplayTimeout);
      
      // Clean up the setup
      if (setupCleanup) setupCleanup();
      
      // Hide the ad container
      if (adContainer) {
        adContainer.style.display = 'none';
      }
    };
  }, [onAdDisplayed]);

  // Return an empty div - the actual ad container is in HTML
  return <div ref={adRef} style={{ display: 'none' }} />;
}; 