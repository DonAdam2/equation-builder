import { DropdownSelectedOptionInterface } from '@/components/shared/dropdown/dropdownSelectedOption/DropdownSelectedOption.types';

const DropdownSelectedOption = ({
  selectedOption,
  selectedOptionIcon,
  isDisplaySelectedOptionIcon,
  controlledDropdown,
  searchTerm,
}: DropdownSelectedOptionInterface) => (
  <span className="selected-option">
    {controlledDropdown ? (
      <>
        {isDisplaySelectedOptionIcon && selectedOptionIcon ? (
          <span className="selected-option-icon">{selectedOptionIcon}</span>
        ) : (
          controlledDropdown.staticHeadIcon && (
            <span className="selected-option-icon">{controlledDropdown.staticHeadIcon}</span>
          )
        )}
        <span
          className="selected-option-label"
          style={{
            minWidth:
              (controlledDropdown.isSearchable && controlledDropdown.value === '') ||
              searchTerm !== ''
                ? 0
                : 40,
          }}
        >
          <span className="static-head-label">
            {controlledDropdown.staticHeadLabel && controlledDropdown.staticHeadLabel}
          </span>
          {searchTerm === '' ? selectedOption || '' : ''}
        </span>
      </>
    ) : (
      ''
    )}
  </span>
);

export default DropdownSelectedOption;
