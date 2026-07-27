import { DropdownSearchInputInterface } from '@/components/shared/dropdown/dropdownSearchInput/DropdownSearchInput.types';

const DropdownSearchInput = ({
  dropdownValue,
  placeholder,
  value,
  onChange,
  onKeyDown,
  disabled,
  isMultiSelect,
}: DropdownSearchInputInterface) => (
  <input
    type="text"
    placeholder={
      dropdownValue === '' ||
      (isMultiSelect && Array.isArray(dropdownValue) && dropdownValue?.length === 0)
        ? placeholder || ''
        : ''
    }
    value={value}
    onChange={onChange}
    onKeyDown={onKeyDown}
    className="search-options-input"
    disabled={disabled}
  />
);

export default DropdownSearchInput;
