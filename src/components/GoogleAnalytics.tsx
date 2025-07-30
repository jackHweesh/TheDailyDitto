import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Track pageview when location changes
    if (window.gtag) {
      window.gtag('config', 'G-Y705BJEX5M', {
        page_path: location.pathname + location.search,
        page_title: document.title
      });
    }
  }, [location]);

  return null; // This component doesn't render anything
};

export default GoogleAnalytics; 