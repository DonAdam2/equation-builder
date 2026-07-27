import { Link } from 'react-router-dom';

import ConditionalWrapper from '@/components/shared/conditionalWrapper/ConditionalWrapper';
import { DropdownOptionInterface } from '@/components/shared/dropdown/dropdownOption/DropdownOption.types';

import { transformToDashedString } from '@/constants/Helpers';

import CheckIcon from '@/assets/icons/CheckIcon';

const DropdownOption = ({
  option,
  optionClasses,
  onClick,
  isCheckboxMultiSelect = false,
  isMultiSelect = false,
  dropdownValue,
  resetActiveSuggestion,
  isMarkSelectedOption,
  markSelectedOptionIcon,
  markSelectedOptionClassName = '',
}: DropdownOptionInterface) => {
  const onOptionClickHandler = () => {
    onClick(option);
    resetActiveSuggestion();
  };

  return (
    <ConditionalWrapper
      initialWrapper={(children: any) => (
        <div
          className={`dropdown-item ${isMarkSelectedOption ? `mark-selected-option ${markSelectedOptionClassName}` : ''} ${!option.link ? optionClasses : ''} ${
            option.className ? option.className : ''
          } ${option.disabled ? 'is-disabled' : ''}`}
          onClick={(e) => {
            if (isMultiSelect) {
              e.stopPropagation();
            }
            onOptionClickHandler();
          }}
          style={{
            padding: option.link ? 0 : 10,
          }}
          data-test={transformToDashedString(option.displayValue || '')}
        >
          {children}
        </div>
      )}
      condition={isCheckboxMultiSelect}
      wrapper={(children: any) => (
        <label
          className={`dropdown-item ${optionClasses} ${option.className ? option.className : ''} ${
            option.disabled ? 'is-disabled' : ''
          }`}
          style={{ padding: 10 }}
          onClick={(e) => e.stopPropagation()}
          data-test={transformToDashedString(option.displayValue || '')}
        >
          {children}
        </label>
      )}
    >
      <ConditionalWrapper
        initialWrapper={(children: any) => <>{children}</>}
        condition={!!option.link}
        wrapper={(children: any) => (
          <Link
            className={`is-fullwidth ${optionClasses}`}
            to={option.link || ''}
            style={{ padding: 10 }}
          >
            {children}
          </Link>
        )}
      >
        {option.leftIcon && (
          <span className={`dropdown-item-icon left-position`}>{option.leftIcon}</span>
        )}
        <span className="is-flex is-flex-direction-column is-flex-grow-1">
          <span className="is-flex is-justify-content-space-between is-flex-grow-1 is-align-items-center">
            <span
              className="dropdown-item-label"
              style={{
                fontWeight: option.description ? 600 : 400,
              }}
            >
              {isCheckboxMultiSelect && (
                <input
                  type="checkbox"
                  checked={option.value ? dropdownValue.includes(option.value) : false}
                  onChange={() => {
                    onOptionClickHandler();
                  }}
                />
              )}
              {option.displayValue}
            </span>
            {(option.rightIcon || isMarkSelectedOption) && (
              <>
                {option.rightIcon && (
                  <span className="dropdown-item-icon right-position">{option.rightIcon}</span>
                )}
                {isMarkSelectedOption && (
                  <>
                    {markSelectedOptionIcon ? (
                      markSelectedOptionIcon
                    ) : (
                      <CheckIcon className="icon-path-stroke-green" />
                    )}
                  </>
                )}
              </>
            )}
          </span>
          {option.description && (
            <span className="dropdown-item-description">{option.description}</span>
          )}
        </span>
      </ConditionalWrapper>
    </ConditionalWrapper>
  );
};

export default DropdownOption;
