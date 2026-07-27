function useTouchScreenDetect() {
  const isSSR = typeof window === 'undefined',
    isTouchDevice =
      !isSSR && ('ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0);

  return { isTouchDevice };
}

export default useTouchScreenDetect;
