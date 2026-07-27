import { TitlePositionType } from '@/components/shared/datatable/datatableTitle/DatatableTitle.types';

export interface DatatableSearchInterface {
  show?: boolean;
  onSearch?: (key: string) => void;
  isSearchDisabled?: boolean;
  isLocalSearch?: boolean;
  isFullWidth?: boolean;
  isMarginInlineStart?: boolean;
  isMarginInlineEnd?: boolean;
  placeholder?: string;
  searchDataTest?: string;
  searchPosition?: TitlePositionType;
}
