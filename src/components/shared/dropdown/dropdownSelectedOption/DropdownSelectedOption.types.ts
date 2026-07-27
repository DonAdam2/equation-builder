import { ReactNode } from 'react';

import { ControlledDropdownInterface } from '@/components/shared/dropdown/Dropdown.types';

export interface DropdownSelectedOptionInterface {
  selectedOption: string;
  selectedOptionIcon?: ReactNode;
  isDisplaySelectedOptionIcon?: boolean;
  controlledDropdown?: ControlledDropdownInterface;
  searchTerm?: string;
}
