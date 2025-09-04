import { useEffect } from 'react';

export default function useMobileViewport(scrollerRef?: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const docEl = document.documentElement;
    let initialViewportHeight = window.visualViewport?.height ?? window.innerHeight;

    const setAppHeight = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      docEl.style.setProperty('--app-height', `${vh}px`);
    };

    // Initial setup with delay for Android devices
    const initialSetup = () => {
      // Immediate setup
      setAppHeight();
      
      // Delayed setup for Android devices to account for navigation bar loading
      setTimeout(() => {
        initialViewportHeight = window.visualViewport?.height ?? window.innerHeight;
        setAppHeight();
      }, 500);
    };
    const handleViewportChange = () => {
      setAppHeight();
      
      // Only compensate scroll if we have a valid scroller and viewport change is significant
      if (scrollerRef?.current && window.visualViewport) {
        const vh = window.visualViewport.height;
        const viewportChange = initialViewportHeight - vh;
        
        // Only adjust if viewport changed significantly (keyboard appearing/disappearing)
        // and the scroller is actually scrollable
        if (Math.abs(viewportChange) > 100 && scrollerRef.current.scrollHeight > scrollerRef.current.clientHeight) {
          const currentScrollTop = scrollerRef.current.scrollTop;
          
          // Use requestAnimationFrame to ensure DOM has updated
          requestAnimationFrame(() => {
            if (scrollerRef.current) {
              scrollerRef.current.scrollTo({
                top: currentScrollTop + (viewportChange > 0 ? viewportChange : 0),
                behavior: 'auto'
              });
            }
          });
        }
      }
    };

    const handleOrientationChange = () => {
      // Reset initial height on orientation change
      setTimeout(() => {
        initialViewportHeight = window.visualViewport?.height ?? window.innerHeight;
        setAppHeight();
        
        // Additional delay for Android devices after orientation change
        setTimeout(() => {
          initialViewportHeight = window.visualViewport?.height ?? window.innerHeight;
          setAppHeight();
        }, 500);
      }, 100);
    };

    // Initial setup with Android accommodation
    initialSetup();
    

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', setAppHeight);
    };
  }, [scrollerRef]);
}