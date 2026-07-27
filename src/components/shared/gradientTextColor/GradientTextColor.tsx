import { FC, PropsWithChildren } from 'react';

import { GradientTextColorProps } from '@/components/shared/gradientTextColor/GradientTextColor.types';

const GradientTextColor: FC<PropsWithChildren<GradientTextColorProps>> = ({
  unset,
  className,
  children,
  variant = 'primary',
}) => (
  <span className={`${unset ? '' : `gradient-text-color ${variant}`} ${className}`}>
    {children}
  </span>
);

export default GradientTextColor;
