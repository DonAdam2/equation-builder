import { DropdownClearIconInterface } from '@/components/shared/dropdown/dropdownClearIcon/DropdownClearIcon.types';

import CloseIcon from '@/assets/icons/CloseIcon';

const DropdownClearIcon = ({ onClearHandler, icon }: DropdownClearIconInterface) => (
  <span
    className="clearable-icon"
    onClick={(e) => {
      e.stopPropagation();
      onClearHandler();
    }}
  >
    {icon ? icon : <CloseIcon />}
  </span>
);

export default DropdownClearIcon;
