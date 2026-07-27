import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
  KeyboardEvent,
  Fragment,
} from 'react';

import useDebounce from '@/hooks/useDebounce';

import ClickAwayWrapper from '@/components/shared/clickAwayWrapper/ClickAwayWrapper';
import DropdownClearIcon from '@/components/shared/dropdown/dropdownClearIcon/DropdownClearIcon';
import DropdownContextProvider from '@/components/shared/dropdown/dropdownContextProvider/DropdownContextProvider';
import DropdownOption from '@/components/shared/dropdown/dropdownOption/DropdownOption';
import DropdownSearchInput from '@/components/shared/dropdown/dropdownSearchInput/DropdownSearchInput';
import DropdownSelectedOption from '@/components/shared/dropdown/dropdownSelectedOption/DropdownSelectedOption';
import { RemoveOptionInterface } from '@/components/shared/dropdown/dropdownSelectedOptions/DropdownSelectedOptions.types';
import LoadingIcon from '@/components/shared/LoadingIcon';

import { getElementOffset, getScrollParent } from '@/constants/Helpers';

import ChevronDownIcon from '@/assets/icons/ChevronDownIcon';

import { DropdownContext } from '../../../contexts/DropdownContext';
import Portal from '../portal/Portal';

import { DropdownComponentInterface, OptionInterface } from './Dropdown.types';
import DropdownSelectedOptions from './dropdownSelectedOptions/DropdownSelectedOptions';

const maxMenuHeight = 300;

const DropdownComponent = ({ wrapper, header, body }: DropdownComponentInterface) => {
  const {
      wrapperClassName = '',
      label,
      isParentPositionAbsolute = false,
      targetParentId,
      isDropdownFullWidth = false,
      dataTest,
    } = wrapper ?? {},
    {
      isBorder = true,
      headerClassName = '',
      trigger,
      isDisabled = false,
      controlledDropdown,
      onOpenDropdown,
      isLoading = false,
      loadingIcon = <LoadingIcon />,
    } = header ?? {},
    {
      bodyClassName = '',
      options,
      customContent,
      isRightAligned = false,
      isDisplayGroupedOptionsCount = true,
    } = body ?? {},
    [styles, setStyles] = useState({
      left: 0,
      top: 0,
    }),
    [menuWidth, setMenuWidth] = useState<undefined | number>(undefined),
    [menuHeight, setMenuHeight] = useState<undefined | number>(undefined),
    [showMenu, setShowMenu] = useState(false),
    [wrapperParentUpdated, setWrapperParentUpdated] = useState({ top: 0, left: 0 }),
    [isDropdownOnTop, setIsDropdownOnTop] = useState(false),
    [searchTerm, setSearchTerm] = useState(''),
    [activeSuggestion, setActiveSuggestion] = useState<string | number | null>(null),
    [filteredOptions, setFilteredOptions] = useState<OptionInterface[] | undefined>([]),
    timeoutRef = useRef<any>(null),
    dropdownWrapperRef = useRef<HTMLDivElement>(null),
    dropdownMenuRef = useRef<HTMLDivElement>(null),
    isEnterKeyPressed = useRef(false),
    { isOpen, setOpen } = useContext(DropdownContext),
    space = 10,
    isGroupedOptions = options?.every((el) => el.label !== undefined),
    isMulti = controlledDropdown?.isMultiSelect || controlledDropdown?.isCheckboxMultiSelect,
    isError = controlledDropdown?.isError,
    errorMessage = controlledDropdown?.errorMessage,
    isFullWidth =
      isDropdownFullWidth ||
      options?.find((el) => el.description) !== undefined ||
      (isGroupedOptions &&
        options?.find((group) =>
          group.options?.find((innerOption) => innerOption.description !== undefined)
        )) ||
      isMulti ||
      controlledDropdown?.isSearchable;

  const toggleDropdown = () => {
    if (!isDisabled && !isLoading) {
      if (!isOpen) {
        onOpenDropdown?.();

        setOpen(true);
      } else {
        setOpen(false);
      }

      if (controlledDropdown?.isSearchable) {
        searchInputFocusHandler();
      }
    }
  };

  const resetActiveSuggestion = () => {
    if (controlledDropdown?.isSearchable) {
      isEnterKeyPressed.current = false;
      setActiveSuggestion(null);
    }
  };

  //add unselected option to filtered options if isMultiSelect
  const addUnSelectedOption = (optionValue: string) => {
    let list = filteredOptions;

    if (isGroupedOptions) {
      //modify original options by appending the position to every group and option
      const modifiedOptions = options?.map((group, groupI) => {
          const newOptions = group.options?.map((option, optionI) => ({
            ...option,
            position: optionI,
          }));

          return { ...group, options: newOptions, position: groupI };
        }),
        modifiedFilteredOptions: OptionInterface[] | undefined = [];

      filteredOptions?.forEach((group) => {
        const newGroup = modifiedOptions?.find((el) => el.label === group.label);

        //update filtered options to have group position and option position
        if (newGroup) {
          const newGroupOptions: OptionInterface[] = [];
          group.options?.forEach((option) => {
            const foundOption = newGroup.options?.find(
              (newOption) => newOption.value === option.value
            );

            if (foundOption) {
              newGroupOptions.push(foundOption);
            }
          });
          modifiedFilteredOptions.push({ ...newGroup, options: newGroupOptions });
        }
      });

      //get removed option data from the modified options list (options with positions)
      const removedOptionGroup = modifiedOptions?.find((group) =>
          group.options?.find((option) => option.value === optionValue)
        ),
        removedOption: OptionInterface | undefined = removedOptionGroup?.options?.find(
          (option) => option.value === optionValue
        ),
        foundGroupFromModifiedFilteredOptions = modifiedFilteredOptions.find(
          (group) => group.label === removedOptionGroup?.label
        );

      //push to the modified filtered options the removed option
      if (foundGroupFromModifiedFilteredOptions && removedOption) {
        foundGroupFromModifiedFilteredOptions.options?.push(removedOption);
      }
      //push found group to the modified filtered options along with the removed option
      else if (removedOption) {
        modifiedFilteredOptions.push({ ...removedOptionGroup, options: [removedOption] });
      }

      //sort groups
      const sortedGroups = modifiedFilteredOptions.sort((a, b) =>
        a.position !== undefined && b.position !== undefined ? a.position - b.position : 0
      );

      //sort options in each group
      sortedGroups.forEach((group) => {
        group.options?.sort((a, b) =>
          a.position !== undefined && b.position !== undefined ? a.position - b.position : 0
        );
      });

      //remove position key
      list = sortedGroups.map((group) => {
        delete group.position;

        group.options?.forEach((option) => {
          delete option.position;
        });

        return group;
      });
    } else {
      //modify original options by appending the position
      const modifiedOptions = options?.map((el, i) => ({ ...el, position: i })),
        modifiedFilteredOptions: OptionInterface[] | undefined = [];

      filteredOptions?.forEach((el) => {
        const found = modifiedOptions?.find((newOption) => newOption.value === el.value);

        //update filtered options to have option position
        if (found) {
          modifiedFilteredOptions.push(found);
        }
      });

      //get removed option data from the modified options list (options with positions)
      const removedOption = modifiedOptions?.find((el) => el.value === optionValue);

      //add the removed option at the correct position in filtered options
      if (removedOption) {
        modifiedFilteredOptions.push(removedOption);
      }

      //sort options
      modifiedFilteredOptions.sort((a, b) =>
        a?.position !== undefined && b?.position !== undefined ? a.position - b.position : 0
      );

      //remove position key
      list = modifiedFilteredOptions.map((el) => {
        delete el?.position;

        return el;
      });
    }

    setFilteredOptions(list);
  };

  const onOptionClickHandler = (option: OptionInterface) => {
    if (!option.disabled) {
      if (isMulti) {
        if (option.value && controlledDropdown.value?.includes(option.value)) {
          if (Array.isArray(controlledDropdown.value)) {
            const newSelectedOptions = controlledDropdown.value.filter(
              (selected) => selected !== option.value
            );
            controlledDropdown?.onChangeHandler?.(newSelectedOptions);
          }
        } else {
          if (Array.isArray(controlledDropdown.value)) {
            const newSelectedOptions = [...controlledDropdown.value, option.value].filter(
              (el) => el !== undefined
            );
            controlledDropdown?.onChangeHandler?.(newSelectedOptions);
          }
        }
      } else {
        controlledDropdown && option.value && controlledDropdown?.onChangeHandler?.(option.value);
      }
      option.onClickData && option.onClickData.onClick(option.onClickData.data);

      if (controlledDropdown?.isSearchable && searchTerm !== '') {
        setSearchTerm('');
      }
    }
  };

  //set initial menu height and width
  useEffect(() => {
    if (isOpen && menuWidth === undefined && menuHeight === undefined) {
      setMenuWidth(dropdownMenuRef.current?.offsetWidth);
      setMenuHeight(dropdownMenuRef.current?.offsetHeight);
    }
  }, [menuWidth, menuHeight, isOpen, isLoading]);

  //update menu height on search if options are not grouped
  useEffect(() => {
    if (
      isOpen &&
      (controlledDropdown?.isSearchable || isMulti || isLoading) &&
      filteredOptions &&
      filteredOptions.length >= 0 &&
      !isGroupedOptions
    ) {
      setMenuHeight(dropdownMenuRef.current?.offsetHeight);
    }
  }, [
    isOpen,
    controlledDropdown?.isSearchable,
    isMulti,
    filteredOptions,
    filteredOptions?.length,
    isGroupedOptions,
    isLoading,
  ]);

  const getFlatOptionsOfGroupedOptions = useCallback(() => {
    const flatOptions = filteredOptions?.flatMap((group) => group.options),
      activeOptionIndex = flatOptions?.findIndex((option) => option?.value === activeSuggestion);

    return { flatOptions, activeOptionIndex };
  }, [activeSuggestion, filteredOptions]);

  //update menu height on search if options are grouped
  useEffect(() => {
    const { flatOptions } = getFlatOptionsOfGroupedOptions();

    if (
      isOpen &&
      (controlledDropdown?.isSearchable || isMulti || isLoading) &&
      isGroupedOptions &&
      flatOptions &&
      flatOptions.length >= 0
    ) {
      setMenuHeight(dropdownMenuRef.current?.offsetHeight);
    }
  }, [
    isOpen,
    controlledDropdown?.isSearchable,
    isMulti,
    getFlatOptionsOfGroupedOptions,
    isGroupedOptions,
    isLoading,
  ]);

  useEffect(() => {
    if (isOpen) {
      timeoutRef.current = setTimeout(() => {
        setShowMenu(true);
      }, 10);
    } else {
      setShowMenu(false);
    }
  }, [isOpen]);

  // Update menu height when loading state changes
  useEffect(() => {
    if (isOpen) {
      // Use a small timeout to ensure the content is rendered (loading or options)
      const timeoutId = setTimeout(() => {
        setMenuHeight(dropdownMenuRef.current?.offsetHeight);
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, isLoading]);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  //update dropdown position (top, bottom) based on the current scroll position
  const updateDropdownPosition = useCallback(() => {
    if (dropdownWrapperRef.current) {
      const wrapper = dropdownWrapperRef.current.getBoundingClientRect(),
        windowHeight = window.innerHeight,
        menuBounding = dropdownMenuRef.current?.getBoundingClientRect();

      if (
        windowHeight - space < wrapper.top + wrapper.height + (menuBounding?.height || 0) &&
        wrapper.top + space > space * 2 + (menuBounding?.height || 0)
      )
        setIsDropdownOnTop(true);
      else setIsDropdownOnTop(false);
    }
  }, []);

  const handleScroll = useDebounce(updateDropdownPosition, 1);

  //update menu position styles
  const getStylesList = useMemo(() => {
    const defaultStyle = {
      top: 0,
      left: 0,
    };

    if (!(dropdownWrapperRef.current && menuHeight && menuWidth && isOpen)) return defaultStyle;

    const wrapperRect = dropdownWrapperRef.current.getBoundingClientRect(),
      wrapperRef = dropdownWrapperRef.current,
      scrollableParent = targetParentId
        ? document.getElementById(targetParentId)
        : getScrollParent(wrapperRef),
      style = {
        //right
        left: Math.max(space, wrapperRect.right - wrapperRect.width),
        top: getElementOffset(dropdownWrapperRef.current).top + wrapperRect.height + space,
      };

    //not right
    if (!(style.left < menuWidth) && !isRightAligned) {
      style.left = Math.max(space, wrapperRect.right - menuWidth);
    }
    if (isDropdownOnTop && wrapperParentUpdated) {
      style.top = getElementOffset(dropdownWrapperRef.current).top - space - menuHeight;
    }
    if (!isParentPositionAbsolute && scrollableParent) {
      style.top -= scrollableParent.scrollTop;
    }
    return style;
  }, [
    isDropdownOnTop,
    menuWidth,
    menuHeight,
    isOpen,
    wrapperParentUpdated,
    isParentPositionAbsolute,
    targetParentId,
    isRightAligned,
  ]);

  useEffect(() => {
    handleScroll();

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Call handleScroll when positioning-related state changes
  useEffect(() => {
    if (isOpen && dropdownWrapperRef.current && menuHeight && menuWidth) {
      updateDropdownPosition();
    }
  }, [isOpen, menuHeight, menuWidth, wrapperParentUpdated, updateDropdownPosition]);

  const updateStyles = useCallback(() => {
    setStyles(getStylesList);
  }, [getStylesList]);

  const updateScrollableParentScroll = ({ target }: any) => {
    setWrapperParentUpdated({ top: target.scrollTop, left: target.scrollLeft });
  };

  const handleResize = useCallback(() => {
    if (isOpen && dropdownMenuRef.current && dropdownWrapperRef.current) {
      // Use requestAnimationFrame for smooth, immediate updates
      requestAnimationFrame(() => {
        if (!dropdownMenuRef.current || !dropdownWrapperRef.current) return;

        // Get current dimensions synchronously
        const currentMenuWidth = dropdownMenuRef.current.offsetWidth;
        const currentMenuHeight = dropdownMenuRef.current.offsetHeight;

        // Update state
        setMenuWidth(currentMenuWidth);
        setMenuHeight(currentMenuHeight);

        // Force immediate recalculation with current dimensions
        const wrapper = dropdownWrapperRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Calculate if dropdown should be on top
        const shouldBeOnTop =
          windowHeight - space < wrapper.top + wrapper.height + currentMenuHeight &&
          wrapper.top + space > space * 2 + currentMenuHeight;

        setIsDropdownOnTop(shouldBeOnTop);

        // Calculate new position immediately
        const wrapperRect = dropdownWrapperRef.current.getBoundingClientRect();
        const scrollableParent = targetParentId
          ? document.getElementById(targetParentId)
          : getScrollParent(dropdownWrapperRef.current);

        const newStyle = {
          left: Math.max(space, wrapperRect.right - wrapperRect.width),
          top: getElementOffset(dropdownWrapperRef.current).top + wrapperRect.height + space,
        };

        // Adjust for right alignment
        if (!(newStyle.left < currentMenuWidth) && !isRightAligned) {
          newStyle.left = Math.max(space, wrapperRect.right - currentMenuWidth);
        }

        // Adjust for top positioning
        if (shouldBeOnTop) {
          newStyle.top =
            getElementOffset(dropdownWrapperRef.current).top - space - currentMenuHeight;
        }

        // Adjust for scroll
        if (!isParentPositionAbsolute && scrollableParent) {
          newStyle.top -= scrollableParent.scrollTop;
        }

        // Apply styles immediately
        setStyles(newStyle);
      });
    }
  }, [isOpen, space, targetParentId, isRightAligned, isParentPositionAbsolute]);

  useEffect(() => {
    if (dropdownWrapperRef.current) {
      const wrapperRef = dropdownWrapperRef.current,
        scrollableParent = targetParentId
          ? document.getElementById(targetParentId)
          : getScrollParent(wrapperRef);
      updateStyles();

      window.addEventListener('resize', handleResize);

      scrollableParent.addEventListener('scroll', updateScrollableParentScroll);

      return () => {
        window.removeEventListener('resize', handleResize);

        scrollableParent.removeEventListener('scroll', updateScrollableParentScroll);
      };
    }
  }, [updateStyles, targetParentId, handleResize]);

  //update the position of the dropdown menu if isMulti
  useEffect(() => {
    if (
      dropdownWrapperRef.current &&
      isMulti &&
      controlledDropdown?.value &&
      controlledDropdown?.value.length > 0
    ) {
      if (controlledDropdown?.isMultiSelect) {
        updateStyles();
      } else if (!isDropdownOnTop) {
        const wrapperRect = dropdownWrapperRef.current.getBoundingClientRect();
        setStyles((prev) => ({
          ...prev,
          top: getElementOffset(dropdownWrapperRef.current).top + wrapperRect.height + space,
        }));
      }
    }
  }, [
    isDropdownOnTop,
    updateStyles,
    isMulti,
    controlledDropdown?.isMultiSelect,
    controlledDropdown?.value,
  ]);

  //remove required multi select option
  const removeMultiSelectOptionHandler = ({ option, event }: RemoveOptionInterface) => {
    if (event) {
      event.stopPropagation();
    }
    if (!isDisabled && !isLoading && Array.isArray(controlledDropdown?.value)) {
      const newSelectedOptions = controlledDropdown.value.filter((selected) => selected !== option);
      controlledDropdown?.onChangeHandler?.(newSelectedOptions);
      if (!controlledDropdown?.isCheckboxMultiSelect) {
        addUnSelectedOption(option);
      }
    }
  };

  const clearSingleDropdownValue = () => {
    if (controlledDropdown?.value !== '') {
      controlledDropdown?.onChangeHandler?.('');
    }
  };

  //clear multi select
  const clearMultiSelectDropdownValue = () => {
    controlledDropdown?.onChangeHandler?.([]);
    setFilteredOptions(options);
  };

  //clear dropdown (multi and single)
  const clearDropdownValue = () => {
    if (!isDisabled && !isLoading) {
      if (isMulti) {
        clearMultiSelectDropdownValue();
      } else {
        clearSingleDropdownValue();
      }
      if (controlledDropdown?.isSearchable && searchTerm !== '') {
        setSearchTerm('');
      }
      //close the dropdown list
      if (isOpen) {
        setOpen(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen && activeSuggestion !== null) {
      //reset active suggestion
      setActiveSuggestion(null);
    }
  }, [isOpen, activeSuggestion]);

  //animate scroll to active suggestion element if dropdown is searchable
  const animateScroll = useCallback(() => {
    if (controlledDropdown?.isSearchable) {
      const selected = dropdownMenuRef?.current?.querySelector('.active-suggestion');
      if (selected) {
        selected?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [controlledDropdown?.isSearchable]);

  useEffect(() => {
    const id = setTimeout(() => {
      animateScroll();
    }, 100);

    return () => {
      clearTimeout(id);
    };
  }, [activeSuggestion, animateScroll]);

  //remove selected option from filtered options if isMultiSelect
  const removeSelectedOptionsFromMultiSelect = useCallback(
    (newSelectedOptions: string[]) => {
      let list = options;

      if (isGroupedOptions) {
        list = [];

        options?.forEach((group) => {
          const filtered = group.options?.filter(
            (option) => option.value && !newSelectedOptions.includes(option.value)
          );

          if (filtered && filtered.length > 0) {
            list?.push({ label: group.label, options: filtered });
          }
        });
        if (list?.[0]?.options?.[0]?.value && isEnterKeyPressed.current) {
          list[0].options[0].value && setActiveSuggestion(list[0].options[0].value);
        }
      } else {
        list = options?.filter(
          (option) => option.value && !newSelectedOptions.includes(option.value)
        );
        if (list && list.length > 0 && isEnterKeyPressed.current) {
          setActiveSuggestion(0);
        }
      }

      setFilteredOptions(list);
    },
    [options, isGroupedOptions]
  );

  useEffect(() => {
    if (options) {
      if (searchTerm === '') {
        if (
          controlledDropdown?.isMultiSelect &&
          Array.isArray(controlledDropdown.value) &&
          controlledDropdown.value.length > 0
        ) {
          removeSelectedOptionsFromMultiSelect(controlledDropdown.value);
        } else {
          setFilteredOptions(options);
        }
      } else {
        let list = options;
        if (isGroupedOptions) {
          list = [];

          //grouped and multi select
          if (
            controlledDropdown?.isMultiSelect &&
            controlledDropdown?.value &&
            Array.isArray(controlledDropdown.value)
          ) {
            options.forEach((group) => {
              const filtered = group.options
                ?.filter(
                  (option) => option.value && !controlledDropdown.value?.includes(option.value)
                )
                ?.filter((option) =>
                  option.displayValue?.toLowerCase().includes(searchTerm.toLowerCase())
                );

              if (filtered && filtered.length > 0) {
                list.push({ label: group.label, options: filtered });
              }
            });
          }
          //grouped and single or multi checkbox
          else {
            options.forEach((group) => {
              const filtered = group.options?.filter((option) =>
                option.displayValue?.toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (filtered && filtered.length > 0) {
                list.push({ label: group.label, options: filtered });
              }
            });
          }
        } else {
          //not grouped and multi select
          if (
            controlledDropdown?.isMultiSelect &&
            controlledDropdown?.value &&
            Array.isArray(controlledDropdown.value)
          ) {
            list = options
              .filter((option) => option.value && !controlledDropdown.value?.includes(option.value))
              .filter((option) =>
                option.displayValue?.toLowerCase().includes(searchTerm.toLowerCase())
              );
          }
          //not grouped and single or multi checkbox
          else {
            list = options.filter((option) =>
              option.displayValue?.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }
        }

        setFilteredOptions(list);
        if (list.length > 0) {
          if (isGroupedOptions && list?.[0]?.options?.[0]?.value) {
            setActiveSuggestion(list[0].options[0].value);
          } else {
            setActiveSuggestion(0);
          }
        }
      }
    }
  }, [
    searchTerm,
    removeSelectedOptionsFromMultiSelect,
    options,
    isGroupedOptions,
    controlledDropdown?.isMultiSelect,
    controlledDropdown?.value,
  ]);

  const handleSearchChange = ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
    // Prevent search interactions when loading
    if (isLoading) return;

    setSearchTerm(value);
    if (!isOpen) {
      setOpen(true);
    }
    if (value === '') {
      setActiveSuggestion(null);
    }
  };

  const onDeleteOrBackspaceKeyHandler = () => {
    if (isMulti && controlledDropdown.value) {
      removeMultiSelectOptionHandler({
        option: controlledDropdown.value[controlledDropdown.value.length - 1],
      });
    } else {
      clearDropdownValue();
    }

    if (activeSuggestion !== null) {
      if (isGroupedOptions) {
        if (filteredOptions?.[0]?.options?.[0]?.value && controlledDropdown?.isSearchable) {
          setActiveSuggestion(filteredOptions[0].options[0].value);
        }
      } else {
        if (filteredOptions && filteredOptions.length > 0 && controlledDropdown?.isSearchable) {
          setActiveSuggestion(0);
        }
      }
    }
  };

  const onUpArrowKeyHandler = () => {
    //open the dropdown list
    if (!isOpen) {
      setOpen(true);
    }

    if (isGroupedOptions) {
      if (
        activeSuggestion === null ||
        (filteredOptions?.[0]?.options?.[0]?.value &&
          activeSuggestion === filteredOptions[0].options[0].value)
      ) {
        const lastGroup = filteredOptions?.[filteredOptions.length - 1],
          newActiveSuggestion = lastGroup?.options?.[lastGroup.options.length - 1]?.value;
        if (newActiveSuggestion) {
          setActiveSuggestion(newActiveSuggestion);
        }
      } else {
        const { flatOptions, activeOptionIndex } = getFlatOptionsOfGroupedOptions();

        if (activeOptionIndex !== undefined && activeOptionIndex > -1) {
          const nextActiveSuggestion = flatOptions?.[activeOptionIndex - 1]?.value ?? null;
          setActiveSuggestion(nextActiveSuggestion);
        }
      }
    } else {
      if (filteredOptions?.length && (activeSuggestion === null || activeSuggestion === 0)) {
        setActiveSuggestion(filteredOptions.length - 1);
      } else {
        setActiveSuggestion((prev) => (typeof prev === 'number' ? prev - 1 : prev));
      }
    }
  };

  const onDownArrowKeyHandler = () => {
    //open the dropdown list
    if (!isOpen) {
      setOpen(true);
    }

    if (isGroupedOptions) {
      const lastGroup = filteredOptions?.[filteredOptions.length - 1];
      if (
        activeSuggestion === null ||
        activeSuggestion === lastGroup?.options?.[lastGroup.options.length - 1].value
      ) {
        const newActiveSuggestion = filteredOptions?.[0]?.options?.[0].value ?? null;
        setActiveSuggestion(newActiveSuggestion);
      } else {
        const { flatOptions, activeOptionIndex } = getFlatOptionsOfGroupedOptions();

        if (activeOptionIndex !== undefined && activeOptionIndex > -1) {
          const newActiveSuggestion = flatOptions?.[activeOptionIndex + 1]?.value ?? null;
          setActiveSuggestion(newActiveSuggestion);
        }
      }
    } else {
      if (
        activeSuggestion === null ||
        (filteredOptions && activeSuggestion === filteredOptions.length - 1)
      ) {
        setActiveSuggestion(0);
      } else {
        setActiveSuggestion((prev) => (typeof prev === 'number' ? prev + 1 : prev));
      }
    }
  };

  const onEnterKeyHandler = () => {
    let option =
      typeof activeSuggestion === 'number' ? filteredOptions?.[activeSuggestion] : undefined;
    if (isGroupedOptions) {
      const { flatOptions, activeOptionIndex } = getFlatOptionsOfGroupedOptions();

      if (activeOptionIndex !== undefined && activeOptionIndex > -1) {
        option = flatOptions?.[activeOptionIndex];
      }
    } else {
      option = typeof activeSuggestion === 'number' ? filteredOptions?.[activeSuggestion] : option;
    }

    if (option) {
      if (controlledDropdown?.isSearchable) {
        isEnterKeyPressed.current = true;
      }
      onOptionClickHandler(option);

      if (searchTerm) {
        setSearchTerm('');
        setActiveSuggestion(null);
      }

      //close the dropdown list
      if (isOpen && !isMulti) {
        setOpen(false);
      }
    }
  };

  const keyDownHandler = ({ key }: KeyboardEvent<HTMLInputElement>) => {
    // Prevent keyboard interactions when loading
    if (isLoading) return;

    //user pressed on backspace or delete button
    if (searchTerm === '' && (key === 'Backspace' || key === 'Delete')) {
      if (controlledDropdown?.value && controlledDropdown.value.length > 0) {
        onDeleteOrBackspaceKeyHandler();
      }
    }
    // User pressed on up arrow
    else if (key === 'ArrowUp') {
      onUpArrowKeyHandler();
    }
    // User pressed on down arrow
    else if (key === 'ArrowDown') {
      onDownArrowKeyHandler();
    }
    // User pressed on enter
    else if (key === 'Enter' && activeSuggestion !== null) {
      onEnterKeyHandler();
    }
  };

  const searchInputFocusHandler = () => {
    if (dropdownWrapperRef.current) {
      dropdownWrapperRef.current.style.borderColor = isError ? '#ea5455' : '#2684ff';
    }
  };

  const searchInputBlurHandler = () => {
    if (dropdownWrapperRef.current) {
      dropdownWrapperRef.current.style.borderColor = isError ? '#ea5455' : '#cccccc';
    }
  };

  const onClickAwayCallback = () => {
    if (!isDisabled && !isLoading) {
      if (isOpen) {
        setOpen(false);
      }
      if (controlledDropdown?.isSearchable) {
        searchInputBlurHandler();
      }
      if (controlledDropdown?.isSearchable && searchTerm !== '') {
        setSearchTerm('');
      }
    }
  };

  return (
    <div className={`is-inline-flex is-flex-direction-column ${isFullWidth ? 'is-fullwidth' : ''}`}>
      {label && <p className={`label ${isError ? 'error-label' : ''}`}>{label}</p>}
      <ClickAwayWrapper
        onClickAwayCallback={onClickAwayCallback}
        className={`${isFullWidth ? 'is-fullwidth' : ''}`}
      >
        <div
          className={`dropdown-wrapper ${wrapperClassName} ${isError ? 'dropdown-error' : ''} ${
            menuWidth && styles.left < menuWidth ? 'is-right' : ''
          } ${!isBorder || trigger ? 'no-border' : ''} ${isFullWidth ? 'is-fullwidth' : ''} ${
            isDisabled || isLoading ? 'disabled-dropdown-wrapper' : ''
          }`}
          ref={dropdownWrapperRef}
        >
          <div
            className={`dropdown-header ${headerClassName ? headerClassName : ''} ${
              isDisabled || isLoading ? 'disabled-dropdown' : ''
            }`}
            onClick={toggleDropdown}
            data-test={dataTest ? `${dataTest}-header` : undefined}
            style={{
              minHeight: isMulti ? 42 : 'auto',
            }}
          >
            {trigger ? (
              trigger
            ) : (
              <>
                <div className="dropdown-inner-header">
                  {isMulti ? (
                    <DropdownSelectedOptions
                      selectedOptions={
                        Array.isArray(controlledDropdown.value) ? controlledDropdown.value : []
                      }
                      options={options ?? []}
                      removeOptionHandler={removeMultiSelectOptionHandler}
                      isDisabled={isDisabled || isLoading}
                      chipStyles={controlledDropdown?.multiSelectChipStyles}
                      staticHeadIcon={controlledDropdown?.staticHeadIcon}
                      staticHeadLabel={controlledDropdown?.staticHeadLabel}
                      isGroupedOptions={isGroupedOptions}
                      resetActiveSuggestion={resetActiveSuggestion}
                      isDisplaySelectedOptionIcon={
                        controlledDropdown?.isDisplaySelectedOptionIcon !== undefined
                          ? controlledDropdown.isDisplaySelectedOptionIcon
                          : true
                      }
                    />
                  ) : (
                    <DropdownSelectedOption
                      selectedOption={
                        (isGroupedOptions
                          ? options
                              ?.find((group) =>
                                group.options?.find(
                                  (innerOption) =>
                                    controlledDropdown?.value &&
                                    innerOption.value === controlledDropdown.value
                                )
                              )
                              ?.options?.find(
                                (option) =>
                                  controlledDropdown?.value &&
                                  option.value === controlledDropdown.value
                              )?.displayValue
                          : options?.find(
                              (option) =>
                                controlledDropdown?.value &&
                                option.value === controlledDropdown.value
                            )?.displayValue) || ''
                      }
                      selectedOptionIcon={
                        isGroupedOptions
                          ? options
                              ?.find((group) =>
                                group.options?.find(
                                  (innerOption) =>
                                    controlledDropdown?.value &&
                                    innerOption.value === controlledDropdown.value
                                )
                              )
                              ?.options?.find(
                                (option) =>
                                  controlledDropdown?.value &&
                                  option.value === controlledDropdown.value
                              )?.leftIcon
                          : options?.find(
                              (option) =>
                                controlledDropdown?.value &&
                                option.value === controlledDropdown.value
                            )?.leftIcon
                      }
                      controlledDropdown={controlledDropdown}
                      searchTerm={searchTerm}
                      isDisplaySelectedOptionIcon={
                        controlledDropdown?.isDisplaySelectedOptionIcon !== undefined
                          ? controlledDropdown.isDisplaySelectedOptionIcon
                          : true
                      }
                    />
                  )}
                  {controlledDropdown?.isSearchable && (
                    <DropdownSearchInput
                      dropdownValue={controlledDropdown.value || ''}
                      isMultiSelect={isMulti}
                      placeholder={controlledDropdown?.searchPlaceholder || ''}
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onKeyDown={keyDownHandler}
                      disabled={isDisabled || isLoading}
                    />
                  )}
                </div>
                <span className="icons-wrapper">
                  {controlledDropdown?.isClearable && (
                    <DropdownClearIcon
                      onClearHandler={clearDropdownValue}
                      icon={controlledDropdown.clearableIcon}
                    />
                  )}
                  <span className="dropdwon-arrow-icon">
                    {controlledDropdown?.arrowIcon ? (
                      controlledDropdown.arrowIcon
                    ) : (
                      <ChevronDownIcon className="chevron-down-icon" />
                    )}
                  </span>
                </span>
              </>
            )}
          </div>
          <Portal wrapperElement="span" wrapperElementId="dropdown">
            {isOpen && (
              <div className={`${menuWidth && styles.left < menuWidth ? 'is-right' : ''}`}>
                <div
                  className={`dropdown-body ${bodyClassName} ${
                    isDropdownOnTop ? 'dropdown-on-top' : ''
                  } ${isOpen && 'open'}`}
                  ref={dropdownMenuRef}
                  style={{
                    ...styles,
                    maxHeight: customContent ? 'unset' : maxMenuHeight,
                    overflowY:
                      menuHeight && menuHeight >= maxMenuHeight && !customContent
                        ? 'auto'
                        : 'unset',
                    visibility: showMenu ? 'visible' : 'hidden',
                    width:
                      dropdownWrapperRef.current && isFullWidth
                        ? dropdownWrapperRef.current.getBoundingClientRect().width
                        : 'auto',
                  }}
                  data-test={dataTest ? `${dataTest}-body` : undefined}
                >
                  {customContent ? (
                    <div onClick={(e) => e.stopPropagation()}>{customContent}</div>
                  ) : isLoading ? (
                    <div className="dropdown-loading-wrapper">{loadingIcon}</div>
                  ) : (
                    options &&
                    (controlledDropdown?.isSearchable || isMulti ? filteredOptions : options)?.map(
                      (option, i) => {
                        let optionClasses = '';
                        const isSingleSelect =
                          !controlledDropdown?.isMultiSelect &&
                          !controlledDropdown?.isCheckboxMultiSelect;

                        if (isGroupedOptions) {
                          return (
                            <Fragment key={i}>
                              <span className="options-group-label">
                                {option.label}
                                {isDisplayGroupedOptionsCount && (
                                  <span className="options-count">{option.options?.length}</span>
                                )}
                              </span>
                              {option.options?.map((innerOption, innerI) => {
                                optionClasses = `is-flex is-align-items-center ${
                                  controlledDropdown?.isSearchable &&
                                  activeSuggestion === innerOption.value
                                    ? 'active-suggestion'
                                    : ''
                                }`;
                                const isMarkSelectedOption =
                                    isSingleSelect &&
                                    controlledDropdown?.markSelectedOption?.enable &&
                                    controlledDropdown.value === innerOption.value,
                                  markSelectedOptionIcon =
                                    isSingleSelect &&
                                    !!controlledDropdown?.markSelectedOption?.icon &&
                                    controlledDropdown.value === innerOption.value
                                      ? controlledDropdown.markSelectedOption.icon
                                      : undefined,
                                  markSelectedOptionClassName =
                                    isSingleSelect &&
                                    !!controlledDropdown?.markSelectedOption?.className &&
                                    controlledDropdown.value === innerOption.value
                                      ? controlledDropdown.markSelectedOption.className
                                      : undefined;

                                return (
                                  <DropdownOption
                                    key={innerI}
                                    option={innerOption}
                                    optionClasses={optionClasses}
                                    onClick={onOptionClickHandler}
                                    isCheckboxMultiSelect={
                                      controlledDropdown?.isCheckboxMultiSelect
                                    }
                                    isMultiSelect={controlledDropdown?.isMultiSelect}
                                    dropdownValue={controlledDropdown?.value || ''}
                                    resetActiveSuggestion={resetActiveSuggestion}
                                    isMarkSelectedOption={isMarkSelectedOption}
                                    markSelectedOptionIcon={markSelectedOptionIcon}
                                    markSelectedOptionClassName={markSelectedOptionClassName}
                                  />
                                );
                              })}
                            </Fragment>
                          );
                        } else {
                          optionClasses = `is-flex is-align-items-center ${
                            controlledDropdown?.isSearchable && activeSuggestion === i
                              ? 'active-suggestion'
                              : ''
                          }`;
                          const isMarkSelectedOption =
                              isSingleSelect &&
                              controlledDropdown?.markSelectedOption?.enable &&
                              controlledDropdown.value === option.value,
                            markSelectedOptionIcon =
                              isSingleSelect &&
                              !!controlledDropdown?.markSelectedOption?.icon &&
                              controlledDropdown.value === option.value
                                ? controlledDropdown.markSelectedOption.icon
                                : undefined,
                            markSelectedOptionClassName =
                              isSingleSelect &&
                              !!controlledDropdown?.markSelectedOption?.className &&
                              controlledDropdown.value === option.value
                                ? controlledDropdown.markSelectedOption.className
                                : undefined;

                          return (
                            <DropdownOption
                              key={i}
                              option={option}
                              optionClasses={optionClasses}
                              onClick={onOptionClickHandler}
                              isCheckboxMultiSelect={controlledDropdown?.isCheckboxMultiSelect}
                              isMultiSelect={controlledDropdown?.isMultiSelect}
                              dropdownValue={controlledDropdown?.value || ''}
                              resetActiveSuggestion={resetActiveSuggestion}
                              isMarkSelectedOption={isMarkSelectedOption}
                              markSelectedOptionIcon={markSelectedOptionIcon}
                              markSelectedOptionClassName={markSelectedOptionClassName}
                            />
                          );
                        }
                      }
                    )
                  )}
                  {controlledDropdown?.isSearchable && filteredOptions?.length === 0 && (
                    <div className="dropdown-item no-options" style={{ padding: 10 }}>
                      {controlledDropdown?.noOptionsMessage || 'No options'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Portal>
        </div>
      </ClickAwayWrapper>
      {isError && (
        <p className="error-message" data-test={controlledDropdown?.errorDataTest}>
          {errorMessage}
        </p>
      )}
    </div>
  );
};

const Dropdown = (props: DropdownComponentInterface) => (
  <DropdownContextProvider>
    <DropdownComponent {...props} />
  </DropdownContextProvider>
);

export default Dropdown;
