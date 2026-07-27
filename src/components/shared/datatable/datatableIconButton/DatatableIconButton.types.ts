import { ReactNode, MouseEvent } from 'react';

import {
  ActionTooltipInterface,
  BooleanFuncType,
  RowInfo,
} from '@/components/shared/datatable/Datatable.types';

export interface DatatableIconButtonInterface<T = Record<string, any>> {
  disabled?: boolean | BooleanFuncType<T>;
  hidden?: boolean | BooleanFuncType<T>;
  icon?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>, rowInfo: RowInfo<T>) => void;
  cell?: (rowInfo: RowInfo<T>) => ReactNode;
  rowInfo: RowInfo<T>;
  tooltip?: ActionTooltipInterface;
}
