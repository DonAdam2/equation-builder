import { useMemo } from 'react';

import debounce from 'lodash/debounce';

function useDebounce(callback: any, delay: number) {
  return useMemo(() => debounce(callback, delay), [delay, callback]);
}

export default useDebounce;
