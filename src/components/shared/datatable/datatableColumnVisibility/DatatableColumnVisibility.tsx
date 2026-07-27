import { useMemo } from 'react';

import Button from '@/components/shared/button/Button';
import DropdownComponent from '@/components/shared/dropdown/Dropdown';
import { OptionInterface } from '@/components/shared/dropdown/Dropdown.types';
import DropdownContextProvider from '@/components/shared/dropdown/dropdownContextProvider/DropdownContextProvider';

import ChevronDownIcon from '@/assets/icons/ChevronDownIcon';

import { DatatableColumnVisibilityInterface } from './DatatableColumnVisibility.types';

const DatatableColumnVisibility = <T = Record<string, unknown>,>({
  columns,
  visibleColumns,
  onToggleColumn,
  trigger,
}: DatatableColumnVisibilityInterface<T>) => {
  const columnsWithHidingEnabled = useMemo(() => {
    return columns.filter(
      (column) =>
        column.enableHiding !== false && typeof column.header === 'string' && column.header
    );
  }, [columns]);

  // Convert columns to dropdown options
  const dropdownOptions: OptionInterface[] = useMemo(() => {
    return columnsWithHidingEnabled.map((column) => {
      const columnKey = String(column.accessorKey);
      return {
        value: columnKey,
        displayValue: String(column.header || columnKey),
      };
    });
  }, [columnsWithHidingEnabled]);

  // Get currently selected (visible) column keys
  const selectedColumnKeys = useMemo(() => {
    return Object.keys(visibleColumns).filter((key) => visibleColumns[key] !== false);
  }, [visibleColumns]);

  if (columnsWithHidingEnabled.length === 0) {
    return null;
  }

  // Handle dropdown value change
  const handleDropdownChange = (value: string | string[]) => {
    const selectedKeys = Array.isArray(value) ? value : [value];
    const allColumnKeys = columnsWithHidingEnabled.map((col) => String(col.accessorKey));

    // Update visibility for all columns with hiding enabled
    allColumnKeys.forEach((key) => {
      const shouldBeVisible = selectedKeys.includes(key);
      const currentlyVisible = visibleColumns[key] !== false;

      if (shouldBeVisible !== currentlyVisible) {
        onToggleColumn(key);
      }
    });
  };

  return (
    <DropdownContextProvider>
      <DropdownComponent
        wrapper={{
          dataTest: 'column-visibility-dropdown',
        }}
        header={{
          headerClassName: 'visibility-header',
          trigger: (
            <Button
              {...trigger}
              label={trigger?.label ?? 'Columns'}
              icon={trigger?.icon ?? <ChevronDownIcon />}
              iconPosition={trigger?.iconPosition ?? 'right'}
              type={trigger?.type ?? 'button'}
              variant={trigger?.variant}
            />
          ),
          controlledDropdown: {
            isCheckboxMultiSelect: true,
            value: selectedColumnKeys,
            onChangeHandler: handleDropdownChange,
            staticHeadLabel: trigger?.label ?? 'Columns',
            arrowIcon: <ChevronDownIcon />,
          },
        }}
        body={{
          options: dropdownOptions,
        }}
      />
    </DropdownContextProvider>
  );
};

export default DatatableColumnVisibility;
