import { ReactNode } from 'react';

import { OptionInterface } from '@/components/shared/dropdown/Dropdown.types';

export interface DatatableFooterInterface {
  paginationComponent?: ReactNode;
  enableRowsDropdown?: boolean;
  rowsPerPageOptions: OptionInterface[];
  rowsPerPageNum?: string | string[];
  onChangeRowsPerPage?: (value: string | string[]) => void;
}
