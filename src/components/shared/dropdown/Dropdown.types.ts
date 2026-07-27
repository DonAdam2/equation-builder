import { CSSProperties, ReactNode } from 'react';

export interface ControlledDropdownInterface {
  onChangeHandler?: (value: string | string[]) => void;
  value?: string | string[];
  arrowIcon?: ReactNode;
  staticHeadIcon?: ReactNode;
  staticHeadLabel?: string | ReactNode;
  //flag to enable clear dropdown value (default: false)
  isClearable?: boolean;
  clearableIcon?: ReactNode;
  //boolean to detect whether options are searchable or not (default: false)
  isSearchable?: boolean;
  //placeholder of the search input (default: '')
  searchPlaceholder?: string;
  //message to display if no options match the search term (default: No Options)
  noOptionsMessage?: string | ReactNode; //you might need to <Trans /> component from i18next
  //boolean to detect if dropdown is multi select checkbox (default: false)
  isCheckboxMultiSelect?: boolean;
  //boolean to detect if dropdown is multi select (default: false)
  isMultiSelect?: boolean;
  multiSelectChipStyles?: CSSProperties;
  //boolean to display selected option icon if icon is set on option (default: true)
  isDisplaySelectedOptionIcon?: boolean;
  isError?: boolean;
  errorMessage?: string | ReactNode;
  errorDataTest?: string;
  markSelectedOption?: {
    enable: boolean;
    className?: string;
    icon?: ReactNode;
  };
}

export interface OptionInterface {
  label?: string | ReactNode; //if grouped => you might need to <Trans /> component from i18next
  options?: OptionInterface[]; // Nested options if grouped
  value?: string;
  displayValue?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  chipStyles?: CSSProperties;
  onClickData?: {
    onClick: (data?: any) => void;
    data?: any;
  };
  link?: string;
  description?: string | ReactNode; //you might need to <Trans /> component from i18next
  disabled?: boolean;
  className?: string;
  position?: number;
}

export interface DropdownComponentInterface {
  wrapper?: {
    wrapperClassName?: string;
    label?: string;
    isParentPositionAbsolute?: boolean;
    targetParentId?: string;
    isDropdownFullWidth?: boolean;
    dataTest?: string;
  };
  header: {
    isBorder?: boolean;
    headerClassName?: string;
    trigger?: ReactNode;
    isDisabled?: boolean;
    controlledDropdown?: ControlledDropdownInterface;
    onOpenDropdown?: () => void | Promise<void>;
    isLoading?: boolean;
    loadingIcon?: ReactNode;
  };
  body: {
    bodyClassName?: string;
    customContent?: ReactNode;
    isRightAligned?: boolean;
    isDisplayGroupedOptionsCount?: boolean;
    options?: OptionInterface[];
  };
}
