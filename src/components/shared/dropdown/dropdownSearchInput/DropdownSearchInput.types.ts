import { ChangeEvent, KeyboardEvent } from 'react';

export interface DropdownSearchInputInterface {
  dropdownValue: string | string[];
  placeholder?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  isMultiSelect?: boolean;
}
