import { FC, PropsWithChildren } from 'react';

import { ConditionalWrapperInterface } from '@/components/shared/conditionalWrapper/ConditionalWrapper.types';

const ConditionalWrapper: FC<PropsWithChildren<ConditionalWrapperInterface>> = ({
  initialWrapper,
  condition,
  wrapper,
  children,
}) => (condition ? wrapper(children) : initialWrapper(children));

export default ConditionalWrapper;
