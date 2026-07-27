import { FC, PropsWithChildren } from 'react';

import { PaperInterface } from '@/components/shared/paper/Paper.types';

const Paper: FC<PropsWithChildren<PaperInterface>> = ({
  className = '',
  onClick,
  dataTest,
  children,
}) => (
  <div className={`paper-wrapper ${className}`} onClick={onClick} data-test={dataTest}>
    {children}
  </div>
);

export default Paper;
