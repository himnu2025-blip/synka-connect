import { useState, useEffect } from 'react';

/**
 * iOS-specific keyboard detection
 * Visual Viewport API is unreliable on iOS, so we use focusin/focusout events
 */
export function useIOSKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (!isIOS) {
      // Non-iOS: Use Visual Viewport API
      if (typeof window === 'undefined' || !window.visualViewport) return;

      const handleViewportResize = () => {
        if (window.visualViewport) {
          const viewportHeight = window.visualViewport.height;
          const windowHeight = window.innerHeight;
          const keyboardSpace = windowHeight - viewportHeight;
          
          if (keyboardSpace > 100) {
            setKeyboardHeight(keyboardSpace);
            setIsKeyboardVisible(true);
          } else {
            setKeyboardHeight(0);
            setIsKeyboardVisible(false);
          }
        }
      };

      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);
      
      return () => {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportResize);
      };
    } else {
      // iOS: Use focus events + fixed estimates
      let focusTimeout: NodeJS.Timeout;
      
      const handleFocusIn = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
          // Clear any pending blur
          clearTimeout(focusTimeout);
          
          // Delay to let iOS keyboard fully appear
          focusTimeout = setTimeout(() => {
            // iOS keyboard heights (approximate):
            // Portrait: ~290px, Landscape: ~200px
            const isPortrait = window.innerHeight > window.innerWidth;
            const estimatedHeight = isPortrait ? 290 : 200;
            
            setKeyboardHeight(estimatedHeight);
            setIsKeyboardVisible(true);
          }, 300);
        }
      };

      const handleFocusOut = (e: FocusEvent) => {
        // Small delay to handle focus switching between inputs
        focusTimeout = setTimeout(() => {
          // Check if another input has focus
          const activeElement = document.activeElement;
          const isInputFocused = activeElement?.tagName === 'INPUT' || 
                                activeElement?.tagName === 'TEXTAREA' ||
                                activeElement?.tagName === 'SELECT';
          
          if (!isInputFocused) {
            setKeyboardHeight(0);
            setIsKeyboardVisible(false);
          }
        }, 100);
      };

      document.addEventListener('focusin', handleFocusIn);
      document.addEventListener('focusout', handleFocusOut);

      return () => {
        clearTimeout(focusTimeout);
        document.removeEventListener('focusin', handleFocusIn);
        document.removeEventListener('focusout', handleFocusOut);
      };
    }
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}
