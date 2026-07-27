import { useEffect, useRef } from 'react';

/**
 * Attaches a DOM event listener and keeps the latest handler without re-binding
 * on every render (CodePen / shared Modal pattern).
 */
const useEventListener = (
  eventName: string,
  handler: (event: Event) => void,
  element: Window | Document | HTMLElement | null = typeof window !== 'undefined' ? window : null
): void => {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element?.addEventListener) {
      return;
    }

    const eventListener = (event: Event) => {
      savedHandler.current(event);
    };

    element.addEventListener(eventName, eventListener);
    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
};

export default useEventListener;
