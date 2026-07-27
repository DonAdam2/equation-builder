import { CSSProperties, ReactNode } from 'react';

import { ButtonInterface } from '@/components/shared/button/Button.types';

export type TitlePositionType = 'start' | 'end';

export interface DatatableTitleInterface {
  title?: ReactNode;
  titlePosition?: TitlePositionType;
  buttons?: ButtonInterface[];
  buttonsPosition?: TitlePositionType;
  titleStyles?: CSSProperties;
  isRemovePadding?: boolean;
  isInSearchRow?: boolean;
  columnVisibilityToggle?: ReactNode;
}
