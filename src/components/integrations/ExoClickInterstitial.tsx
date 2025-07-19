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
    let adElement: HTMLElement | null = null;
    let checkInterval: NodeJS.Timeout;
    let isAdTriggered = false;

    const setupExoClick = async () => {
      try {
        console.log('=== EXOCLICK TRIGGER CLASS SETUP ===');
        console.log('Setting up ExoClick with trigger class:', TRIGGER_CLASS);

        // Step 1: Check for ad blocker
        console.log('🔍 Checking for ad blocker...');
        const adBlockerTests = [
          () => window.getComputedStyle(document.createElement('div')).display === 'none',
          // @ts-ignore
          () => !window.AdProvider,
          () => document.querySelector('script[src*="pemsrv.com"]') === null,
          () => document.querySelector('script[src*="exoclick"]') === null
        ];
        
        let adBlockerDetected = false;
        for (const test of adBlockerTests) {
          try {
            if (test()) {
              adBlockerDetected = true;
              break;
            }
          } catch (e) {
            // Test failed, continue
          }
        }
        
        if (adBlockerDetected) {
          console.warn('⚠️ Ad blocker likely detected');
        } else {
          console.log('✅ No obvious ad blocker detected');
        }

        // Step 2: Check zone configuration
        console.log('🔍 Checking zone configuration...');
        console.log('Zone ID:', ZONE_ID);
        console.log('Trigger Class:', TRIGGER_CLASS);
        console.log('Current domain:', window.location.hostname);
        console.log('Is localhost/development:', window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'));
        
        if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
          console.warn('⚠️ Testing on localhost - ExoClick may not serve ads on localhost');
        }

        // Step 3: Get the existing HTML container
        adContainer = document.getElementById('exoclick-interstitial-container');
        if (!adContainer) {
          console.error('❌ ExoClick container not found in HTML');
          throw new Error('ExoClick container not found');
        }
        console.log('✅ ExoClick container found');

        // Step 4: Get the ad element
        adElement = adContainer.querySelector('ins.eas6a97888e35');
        if (!adElement) {
          console.error('❌ Ad element not found in container');
          throw new Error('Ad element not found');
        }
        console.log('✅ Ad element found:', adElement);

        // Step 5: Check if ExoClick script is loaded
        const scriptElement = document.querySelector('script[src="https://a.pemsrv.com/ad-provider.js"]');
        if (!scriptElement) {
          console.error('❌ ExoClick script not found - possible ad blocker');
          throw new Error('ExoClick script not found');
        }
        console.log('✅ ExoClick script found');

        // Step 6: Wait for AdProvider to be available
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds
        
        while (attempts < maxAttempts) {
          // @ts-ignore
          if (window.AdProvider && typeof window.AdProvider.push === 'function') {
            console.log('✅ AdProvider is ready after', attempts * 100, 'ms');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (attempts >= maxAttempts) {
          console.error('❌ AdProvider not available after 10 seconds');
          throw new Error('AdProvider not available after 10 seconds');
        }

        // Step 7: Set up click event listener for trigger class
        console.log('🎯 Setting up click listener for class:', TRIGGER_CLASS);
        
        const handleTriggerClick = (event: Event) => {
          if (isAdTriggered) {
            console.log('⚠️ Ad already triggered, ignoring click');
            return;
          }

          const target = event.target as HTMLElement;
          if (target.classList.contains(TRIGGER_CLASS) || target.closest(`.${TRIGGER_CLASS}`)) {
            console.log('🎯 Trigger class clicked, showing ad...');
            isAdTriggered = true;
            showAd();
          }
        };

        // Listen for clicks on elements with the trigger class
        document.addEventListener('click', handleTriggerClick);
        console.log('✅ Click listener added for class:', TRIGGER_CLASS);

        // Step 8: Set up continuous monitoring of ad element
        console.log('🔍 Starting ad content monitoring...');
        checkInterval = setInterval(() => {
          if (adElement && isAdTriggered) {
            const childrenCount = adElement.children.length;
            const innerHTMLLength = adElement.innerHTML.length;
            const display = window.getComputedStyle(adElement).display;
            const visibility = window.getComputedStyle(adElement).visibility;
            const opacity = window.getComputedStyle(adElement).opacity;
            const width = window.getComputedStyle(adElement).width;
            const height = window.getComputedStyle(adElement).height;

            console.log('🔍 Ad element state:', {
              childrenCount,
              innerHTMLLength,
              display,
              visibility,
              opacity,
              width,
              height,
              hasContent: innerHTMLLength > 100,
              hasChildren: childrenCount > 0
            });

            // If we detect ad content but event didn't fire, trigger manually
            if (childrenCount > 0 && innerHTMLLength > 100) {
              console.log('🎯 Ad content detected but event not fired - triggering manually');
              clearInterval(checkInterval);
              window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
            }
          }
        }, 1000); // Check every second

        // Cleanup function for this setup
        return () => {
          document.removeEventListener('click', handleTriggerClick);
          clearInterval(checkInterval);
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
        }

        // Wait a bit for everything to be ready
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Triggering ExoClick ad with original pattern...');
        
        // Trigger the ad using the original pattern
        // @ts-ignore
        (window.AdProvider = window.AdProvider || []).push({"serve": {}});
        console.log('✅ ExoClick ad triggered successfully');

      } catch (error) {
        console.error('❌ Error showing ExoClick ad:', error);
        if (onAdDisplayed) onAdDisplayed();
      }
    };

    // Set up event listener for ad display
    const eventName = `creativeDisplayed-${ZONE_ID}`;
    const handleAdDisplayed = () => {
      console.log('🎉 ExoClick interstitial ad displayed successfully');
      clearTimeout(timeoutId);
      if (onAdDisplayed) onAdDisplayed();
      window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
    };

    // Listen for the ad displayed event
    document.addEventListener(eventName, handleAdDisplayed);
    console.log('✅ Event listener added for:', eventName);

    // Set up timeout fallback
    timeoutId = setTimeout(() => {
      console.warn('⚠️ ExoClick ad display timeout after 15s - proceeding anyway');
      console.log('🔍 Final debugging info:');
      
      if (adElement) {
        const childrenCount = adElement.children.length;
        const innerHTMLLength = adElement.innerHTML.length;
        const display = window.getComputedStyle(adElement).display;
        const visibility = window.getComputedStyle(adElement).visibility;
        
        console.log('📊 Final ad element state:', {
          childrenCount,
          innerHTMLLength,
          display,
          visibility,
          hasContent: innerHTMLLength > 100,
          hasChildren: childrenCount > 0
        });

        if (childrenCount === 0) {
          console.log('🚫 DIAGNOSIS: No ad content loaded - possible causes:');
          console.log('   • ExoClick not serving ads to this zone/domain');
          console.log('   • Zone configuration issue');
          console.log('   • Testing on localhost (ExoClick may not serve ads locally)');
          console.log('   • Ad blocker (less likely since you tested in incognito)');
        } else if (innerHTMLLength < 100) {
          console.log('🚫 DIAGNOSIS: Ad content not loading properly (minimal HTML)');
        } else if (display === 'none') {
          console.log('🚫 DIAGNOSIS: Ad element hidden by CSS');
        } else {
          console.log('🚫 DIAGNOSIS: Unknown issue - content present but not displaying');
        }
      } else {
        console.log('🚫 DIAGNOSIS: Ad element not found');
      }

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