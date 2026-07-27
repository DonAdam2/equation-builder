import { createContext, Dispatch, SetStateAction } from 'react';

export const initialDropdownContextValues = {
  isOpen: false,
  setOpen: () => {},
};

export const DropdownContext = createContext<{
  isOpen: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}>(initialDropdownContextValues);
