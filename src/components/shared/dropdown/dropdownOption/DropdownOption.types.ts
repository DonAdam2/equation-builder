import { ReactNode } from 'react';

import { OptionInterface } from '@/components/shared/dropdown/Dropdown.types';

export interface DropdownOptionInterface {
  option: OptionInterface;
  optionClasses?: string;
  onClick: (option: OptionInterface) => void;
  isCheckboxMultiSelect?: boolean;
  isMultiSelect?: boolean;
  dropdownValue: string | string[];
  resetActiveSuggestion: () => void;
  isMarkSelectedOption?: boolean;
  markSelectedOptionIcon?: ReactNode;
  markSelectedOptionClassName?: string;
}
