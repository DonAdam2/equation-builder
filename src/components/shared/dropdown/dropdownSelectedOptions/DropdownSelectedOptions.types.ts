import { CSSProperties, ReactNode, MouseEvent } from 'react';

import { OptionInterface } from '@/components/shared/dropdown/Dropdown.types';

export interface RemoveOptionInterface {
  option: string;
  event?: MouseEvent<HTMLButtonElement>;
}

export interface DropdownSelectedOptionsInterface {
  selectedOptions: string[];
  options: OptionInterface[];
  removeOptionHandler: ({ option, event }: RemoveOptionInterface) => void;
  isDisabled?: boolean;
  chipStyles?: CSSProperties;
  staticHeadIcon?: ReactNode;
  staticHeadLabel?: string | ReactNode; //you might need to <Trans /> component from i18next
  isGroupedOptions?: boolean;
  resetActiveSuggestion: () => void;
  isDisplaySelectedOptionIcon?: boolean;
}
