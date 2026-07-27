import { DropdownSelectedOptionsInterface } from '@/components/shared/dropdown/dropdownSelectedOptions/DropdownSelectedOptions.types';

import CloseIcon from '@/assets/icons/CloseIcon';

const DropdownSelectedOptions = ({
  selectedOptions,
  options,
  removeOptionHandler,
  isDisabled,
  chipStyles,
  staticHeadIcon,
  staticHeadLabel,
  isGroupedOptions,
  resetActiveSuggestion,
  isDisplaySelectedOptionIcon,
}: DropdownSelectedOptionsInterface) => (
  <>
    {staticHeadIcon && <span className="selected-option-icon">{staticHeadIcon}</span>}
    {staticHeadLabel && <span className="static-head-label">{staticHeadLabel}</span>}
    {selectedOptions.map((option) => {
      let foundOption = options.find((el) => el.value === option);

      if (isGroupedOptions) {
        const flatOptions = options.flatMap((group) => group.options);
        foundOption = flatOptions.find((el) => el?.value === option);
      }

      return (
        <div
          key={option}
          className="selected-option-chip"
          style={foundOption?.chipStyles ? foundOption?.chipStyles : chipStyles}
        >
          {isDisplaySelectedOptionIcon && foundOption?.leftIcon && (
            <span className="selected-option-icon">{foundOption.leftIcon}</span>
          )}
          <span className="chip-label">{foundOption?.displayValue ?? option}</span>
          <button
            disabled={isDisabled}
            type="button"
            className="remove-option-button"
            onClick={(event) => {
              removeOptionHandler({ option, event });
              resetActiveSuggestion();
            }}
          >
            <CloseIcon />
          </button>
        </div>
      );
    })}
  </>
);

export default DropdownSelectedOptions;
