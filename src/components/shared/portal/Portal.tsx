import { FC, PropsWithChildren, useEffect, useState } from 'react';

import ReactDOM from 'react-dom';

import { PortalInterface } from '@/components/shared/portal/Portal.types';

import { createWrapperAndAppendToBody } from '@/constants/Helpers';

const Portal: FC<PropsWithChildren<PortalInterface>> = ({
  children,
  wrapperElement,
  wrapperElementId,
}) => {
  const [wrapper, setWrapper] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let element = document.getElementById(wrapperElementId);
    // if element is not found with wrapperElementId or wrapperElementId is not provided,
    // create and append to body
    if (!element) {
      element = createWrapperAndAppendToBody(wrapperElement, wrapperElementId);
    }
    // eslint-disable-next-line
    setWrapper(element);
  }, [wrapperElementId, wrapperElement]);

  // wrapper state will be null on the first render.
  if (wrapper === null) return null;

  return ReactDOM.createPortal(<>{children}</>, wrapper);
};

export default Portal;
