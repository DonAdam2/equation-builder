import { FC, PropsWithChildren, useState } from 'react';

import { DropdownContext } from '../../../../contexts/DropdownContext';

const DropdownContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isOpen, setOpen] = useState(false);

  return (
    <DropdownContext.Provider value={{ isOpen, setOpen }}>{children}</DropdownContext.Provider>
  );
};

export default DropdownContextProvider;
