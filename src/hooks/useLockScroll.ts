import { useLayoutEffect } from 'react';

interface UseLockScrollParams {
  targetElement?: HTMLElement | null;
  immediate?: boolean;
}

/** Locks overflow on a target element while a modal (or similar) is open. */
const useLockScroll = ({
  targetElement = typeof document !== 'undefined' ? document.body : null,
  immediate = true,
}: UseLockScrollParams): void => {
  useLayoutEffect(() => {
    if (!targetElement) {
      return;
    }

    const originalStyle = window.getComputedStyle(targetElement).overflow;
    if (immediate) {
      targetElement.style.overflow = 'hidden';
    }

    return () => {
      if (immediate) {
        targetElement.style.overflow = originalStyle;
      }
    };
  }, [immediate, targetElement]);
};

export default useLockScroll;
