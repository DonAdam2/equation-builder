import { useEffect, useMemo, useState, useCallback, useImperativeHandle, Ref } from 'react';

import cloneDeep from 'lodash/cloneDeep';
import slice from 'lodash/slice';
import { v4 as uuidv4 } from 'uuid';

import usePagination from '@/hooks/usePagination';

import DatatableBodyRow from '@/components/shared/datatable/datatableBodyRow/DatatableBodyRow';
import DatatableColumnVisibility from '@/components/shared/datatable/datatableColumnVisibility/DatatableColumnVisibility';
import DatatableFooter from '@/components/shared/datatable/datatableFooter/DatatableFooter';
import DatatableHeader from '@/components/shared/datatable/datatableHeader/DatatableHeader';
import {
  actionsColumnName,
  selectionsColumnName,
} from '@/components/shared/datatable/datatableHeader/DatatableHeader';
import DatatablePagination from '@/components/shared/datatable/datatablePagination/DatatablePagination';
import DatatableTitle from '@/components/shared/datatable/datatableTitle/DatatableTitle';
import DatatableTitleAndSearch from '@/components/shared/datatable/datatableTitleAndSearch/DatatableTitleAndSearch';
import LoadingIcon from '@/components/shared/LoadingIcon';
import Paper from '@/components/shared/paper/Paper';

import { getNestedValue } from '@/constants/Helpers';

import SettingsIcon from '@/assets/icons/SettingsIcon';

import {
  DatatableInterface,
  DatatableRef,
  RootPaginationInterface,
  LocalControlledPaginationInterface,
  RemoteControlledPaginationInterface,
} from './Datatable.types';
import { ColumnOrderType } from './datatableHeader/DatatableHeader.types';

// Default rows per page options
const rowsPerPageOptions: { value: string; displayValue: string }[] = [
  { value: '5', displayValue: '5 rows' },
  { value: '10', displayValue: '10 rows' },
  { value: '20', displayValue: '20 rows' },
  { value: '30', displayValue: '30 rows' },
  { value: '40', displayValue: '40 rows' },
];

const COLUMN_ORDER_STORAGE_KEY_PREFIX = 'datatable-column-order';

const DEFAULT_MOBILE_BREAKPOINT = 768;

const RootDatatable = <T extends Record<string, any> = Record<string, unknown>>({
  columns,
  actions,
  records,
  title,
  isLoading,
  dataTest,
  noDataToDisplayMessage,
  columnVisibility,
  columnOrdering,
  search,
  sort,
  selection,
  pagination,
  rowEvents,
  ui,
  mobileUiData,
}: DatatableInterface<T>) => {
  const uniqueId = useMemo(() => uuidv4(), []),
    [isMobileView, setIsMobileView] = useState(false),
    [isSelectAllRecords, setIsSelectAllRecords] = useState(false),
    [isDragActive, setIsDragActive] = useState(false),
    [sorting, setSorting] = useState<{ accessorKey: string; order: ColumnOrderType }>({
      accessorKey: '',
      order: 'asc',
    }),
    [searchQuery, setSearchQuery] = useState(''),
    [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({}),
    [columnOrder, setColumnOrder] = useState<string[]>([]),
    {
      titleLabel,
      titlePosition,
      titleLocation = 'titleRow',
      titleButtons,
      titleButtonsPosition,
      titleButtonsLocation = 'titleRow',
    } = title ?? {},
    {
      showTableHeader = true,
      tableWrapperClassName = '',
      tableClassName = '',
      titleStyles,
      actionsColLabel = '',
      isActionsColumnLast,
      actionsColWidth,
      loadingIcon = <LoadingIcon />,
      sortIcon,
      ascendingSortIcon,
      descendingSortIcon,
    } = ui ?? {},
    {
      show = true,
      isLocalSearch = true,
      searchPosition = 'end',
      onUpdateFilteredRecordsCount,
    } = search ?? {},
    { isLocalSort = true, onSorting } = sort ?? {},
    {
      show: showColumnVisibilityToggle = true,
      trigger,
      defaultVisibleColumns,
      hiddenColumns,
      location = 'actionsColumn',
    } = columnVisibility ?? {},
    {
      enabled: columnOrderingEnabled = true,
      onColumnReorder,
      persistOrder,
      defaultColumnOrder,
    } = columnOrdering ?? {},
    {
      resetPagination,
      enablePagination,
      paginationComponent,
      firstContentIndex,
      lastContentIndex,
    } = (pagination as RootPaginationInterface) ?? {},
    isTitleLocationOnTitleRow = titleLocation === 'titleRow',
    isTitleButtonsLocationOnTitleRow = titleButtonsLocation === 'titleRow',
    isTitleLocationOnSearchRow = titleLocation === 'searchRow',
    isTitleButtonsLocationOnSearchRow = titleButtonsLocation === 'searchRow',
    candidateRecordsToSelectAll = useMemo(
      () =>
        showTableHeader && selection !== undefined && selection.mode === 'checkbox'
          ? records.filter((record) => {
              // Create rowInfo object for functions that need it
              const rowInfo = {
                original: record,
                getValue: (key: string) => getNestedValue({ key, obj: record }),
              };

              // Check if the record should be hidden
              const isHidden =
                typeof selection.hidden === 'boolean'
                  ? selection.hidden
                  : selection.hidden?.(rowInfo);

              // Check if the record should be disabled
              const isDisabled =
                typeof selection.disabled === 'boolean'
                  ? selection.disabled
                  : selection.disabled?.(rowInfo);

              // Include record only if it's not hidden and not disabled
              return !isHidden && !isDisabled;
            })
          : [],
      [showTableHeader, records, selection]
    ),
    // Determine if column ordering is enabled based on column configuration
    enableColumnOrdering = useMemo(() => {
      // If enabled flag is explicitly set to false, ordering is completely disabled
      if (columnOrderingEnabled === false) return false;

      // Check if any column allows ordering
      return columns.some((column) => {
        // If enableOrdering is explicitly false, column is not orderable
        if (column.enableOrdering === false) return false;
        // If enableOrdering is not set or true, and it's not actions/selections column, it's orderable
        const accessorKey = String(column.accessorKey);
        if (accessorKey === actionsColumnName || accessorKey === selectionsColumnName) return false;
        // If enableOrdering is explicitly true, or not set (defaults to true), column is orderable
        return column.enableOrdering === true || column.enableOrdering === undefined;
      });
    }, [columnOrderingEnabled, columns]);

  // Detect mobile viewport for mobileUiData
  const mobileBreakpoint = mobileUiData?.mobileBreakpoint ?? DEFAULT_MOBILE_BREAKPOINT;
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobileView(e.matches);
    setIsMobileView(query.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, [mobileBreakpoint]);

  // Initialize column visibility state
  useEffect(() => {
    const initialVisibility: Record<string, boolean> = {};

    columns.forEach((column) => {
      const columnKey = String(column.accessorKey);

      // If column does not have hiding enabled, it should always be visible
      if (column.enableHiding === false) {
        initialVisibility[columnKey] = true;
      }
      // Only apply defaultVisibleColumns/hiddenColumns logic to columns with hiding enabled
      else {
        // If defaultVisibleColumns is provided, use it
        if (defaultVisibleColumns) {
          initialVisibility[columnKey] = defaultVisibleColumns.includes(columnKey);
        }
        // If hiddenColumns is provided, use it
        else if (hiddenColumns) {
          initialVisibility[columnKey] = !hiddenColumns.includes(columnKey);
        }
        // Otherwise, all columns are visible by default
        else {
          initialVisibility[columnKey] = true;
        }
      }
    });

    setVisibleColumns(initialVisibility);
  }, [columns, defaultVisibleColumns, hiddenColumns]);

  // Initialize column order state (including persisted order from localStorage when persistOrder is enabled)
  useEffect(() => {
    if (enableColumnOrdering && columnOrder.length === 0) {
      const columnKeys = columns.map((col) => String(col.accessorKey));
      let initialOrder: string[];

      if (persistOrder?.enabled) {
        try {
          const storageKeyId = persistOrder.key;
          const storageKey = `${COLUMN_ORDER_STORAGE_KEY_PREFIX}-${storageKeyId}`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored) as string[];
            const validOrder = Array.isArray(parsed)
              ? parsed.filter((key) => columnKeys.includes(key))
              : [];
            const newColumns = columnKeys.filter((key) => !validOrder.includes(key));
            initialOrder = validOrder.length > 0 ? [...validOrder, ...newColumns] : columnKeys;
          } else {
            initialOrder = defaultColumnOrder || columnKeys;
          }
        } catch {
          initialOrder = defaultColumnOrder || columnKeys;
        }
      } else {
        initialOrder = defaultColumnOrder || columnKeys;
      }

      setColumnOrder(initialOrder);
    }
  }, [enableColumnOrdering, defaultColumnOrder, columnOrder.length, columns, persistOrder]);

  // Filter and order visible columns
  const visibleColumnsData = useMemo(() => {
    let filteredColumns = columns.filter((column) => {
      const columnKey = String(column.accessorKey);
      return visibleColumns[columnKey] !== false;
    });

    // Apply column ordering if enabled
    if (enableColumnOrdering && columnOrder.length > 0) {
      const columnMap = new Map(filteredColumns.map((col) => [String(col.accessorKey), col]));
      const orderedColumns = columnOrder
        .map((key) => columnMap.get(key))
        .filter((col) => col !== undefined);

      // Add any new columns that aren't in the order array
      const existingKeys = new Set(columnOrder);
      const newColumns = filteredColumns.filter(
        (col) => !existingKeys.has(String(col.accessorKey))
      );

      filteredColumns = [...orderedColumns, ...newColumns];
    }

    return filteredColumns;
  }, [columns, visibleColumns, enableColumnOrdering, columnOrder]);

  // Handle column visibility toggle
  const handleToggleColumn = useCallback((columnKey: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  }, []);

  // Handle column reordering
  const handleColumnReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!enableColumnOrdering) return;

      // If columnOrder is empty, initialize it from columns
      const currentOrder =
        columnOrder.length > 0 ? columnOrder : columns.map((col) => String(col.accessorKey));

      const newOrder = [...currentOrder];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);

      setColumnOrder(newOrder);

      // Call the onColumnReorder callback if provided
      await onColumnReorder?.(fromIndex, toIndex, newOrder);

      if (persistOrder?.enabled) {
        try {
          const storageKey = `${COLUMN_ORDER_STORAGE_KEY_PREFIX}-${persistOrder.key}`;
          localStorage.setItem(storageKey, JSON.stringify(newOrder));
        } catch {
          // Ignore localStorage errors (e.g. quota, private mode)
        }
      }
    },
    [enableColumnOrdering, columnOrder, onColumnReorder, persistOrder, columns]
  );

  const recordsData = useMemo(() => {
    let clonedRecords = cloneDeep(records);

    //sorting functionality
    if (isLocalSort && sorting.accessorKey) {
      const reversed = sorting.order === 'asc' ? 1 : -1;
      clonedRecords = clonedRecords.sort((a, b) => {
        const valueA = getNestedValue({ key: sorting.accessorKey, obj: a });
        const valueB = getNestedValue({ key: sorting.accessorKey, obj: b });

        if (typeof valueA === 'number' && typeof valueB === 'number') {
          // Numeric comparison
          return reversed * (valueA - valueB);
        } else {
          // String comparison
          return (
            reversed *
            valueA?.toString().toLowerCase().localeCompare(valueB?.toString().toLowerCase())
          );
        }
      });
    }

    //local search functionality
    if (searchQuery && show && isLocalSearch) {
      clonedRecords = clonedRecords.filter((record) =>
        visibleColumnsData.some((col) =>
          getNestedValue({ key: String(col.accessorKey), obj: record })
            ?.toString()
            .toLowerCase()
            .includes(searchQuery.toString().toLowerCase())
        )
      );
    }

    //local pagination functionality
    if (firstContentIndex !== undefined && lastContentIndex !== undefined) {
      clonedRecords = slice(clonedRecords, firstContentIndex, lastContentIndex);
    }

    return clonedRecords;
  }, [
    records,
    visibleColumnsData,
    isLocalSort,
    sorting,
    searchQuery,
    firstContentIndex,
    lastContentIndex,
    show,
    isLocalSearch,
  ]);

  /**
   * This useEffect function updates the total number of rows based on the search term,
   * ensuring the displayed row count accurately reflects the search results.
   */
  useEffect(() => {
    if (paginationComponent !== undefined && show && isLocalSearch && searchQuery !== '') {
      // Invoke callback to update the filtered records count
      onUpdateFilteredRecordsCount?.(recordsData.length);
    }
  }, [
    paginationComponent,
    show,
    isLocalSearch,
    searchQuery,
    recordsData.length,
    onUpdateFilteredRecordsCount,
  ]);

  const sortHandler = async (accessorKey: string, order: ColumnOrderType) => {
    await onSorting?.(accessorKey, order);
    if (isLocalSort) {
      setSorting({ accessorKey, order });
    }
  };

  // Determine where to show the column visibility toggle based on location
  const showColumnVisibilityInTitleRow = location === 'titleRow';
  const showColumnVisibilityInActionsColumn = location === 'actionsColumn';
  const showColumnVisibilityInSearchRow = location === 'searchRow';

  // Column visibility toggle element
  const columnVisibilityToggle =
    showColumnVisibilityToggle && columnVisibility ? (
      <DatatableColumnVisibility
        columns={columns}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        trigger={{
          ...trigger,
          icon:
            showColumnVisibilityInActionsColumn && !trigger?.icon ? (
              <SettingsIcon />
            ) : (
              trigger?.icon
            ),
          label: showColumnVisibilityInActionsColumn && !trigger?.label ? '' : trigger?.label,
          variant:
            showColumnVisibilityInActionsColumn && !trigger?.variant ? 'light' : trigger?.variant,
          className:
            showColumnVisibilityInActionsColumn && !trigger?.className
              ? 'actions-col-visibility-button'
              : trigger?.className,
        }}
      />
    ) : null;

  return (
    <Paper className={tableWrapperClassName} dataTest={dataTest}>
      {(isTitleLocationOnTitleRow ||
        isTitleButtonsLocationOnTitleRow ||
        (showColumnVisibilityInTitleRow && columnVisibilityToggle)) && (
        <DatatableTitle
          title={isTitleLocationOnTitleRow ? titleLabel : undefined}
          titleStyles={isTitleLocationOnTitleRow ? titleStyles : undefined}
          titlePosition={isTitleLocationOnTitleRow ? titlePosition : undefined}
          buttons={isTitleButtonsLocationOnTitleRow ? titleButtons : undefined}
          buttonsPosition={isTitleButtonsLocationOnTitleRow ? titleButtonsPosition : undefined}
          columnVisibilityToggle={
            showColumnVisibilityInTitleRow ? columnVisibilityToggle : undefined
          }
        />
      )}
      {(isTitleLocationOnSearchRow ||
        isTitleButtonsLocationOnSearchRow ||
        show ||
        (showColumnVisibilityInSearchRow && columnVisibilityToggle)) && (
        <DatatableTitleAndSearch
          title={isTitleLocationOnSearchRow ? titleLabel : undefined}
          titleStyles={isTitleLocationOnSearchRow ? titleStyles : undefined}
          titlePosition={isTitleLocationOnSearchRow ? titlePosition : undefined}
          buttons={isTitleButtonsLocationOnSearchRow ? titleButtons : undefined}
          buttonsPosition={isTitleButtonsLocationOnSearchRow ? titleButtonsPosition : undefined}
          columnVisibilityToggle={
            showColumnVisibilityInSearchRow ? columnVisibilityToggle : undefined
          }
          search={{
            ...search,
            onSearch: async (value) => {
              if (value === '') {
                onUpdateFilteredRecordsCount?.(records.length);
              }
              setSearchQuery(value);
              resetPagination?.();
              await search?.onSearch?.(value);
            },
            show,
            isLocalSearch,
            isSearchDisabled: isLoading,
            searchPosition,
            isMarginInlineStart:
              searchPosition !== 'start' &&
              ((isTitleLocationOnSearchRow && title !== undefined) ||
                (isTitleButtonsLocationOnSearchRow && titleButtons !== undefined)),
            isMarginInlineEnd:
              searchPosition !== 'end' &&
              ((isTitleLocationOnSearchRow && title !== undefined) ||
                (isTitleButtonsLocationOnSearchRow && titleButtons !== undefined)),
          }}
        />
      )}
      <div className="table-wrapper">
        {isLoading && <div className="center-loader-wrapper">{loadingIcon}</div>}
        {isMobileView && mobileUiData ? (
          <table
            className={`table datatable-mobile ${tableClassName}`}
            data-testid="datatable-mobile"
          >
            <tbody>
              {recordsData.length > 0 ? (
                recordsData.map((row, i) => (
                  <tr key={i} className="datatable-mobile-row">
                    <td className="datatable-mobile-column">{mobileUiData.column(row, i)}</td>
                    <td className="datatable-mobile-action actions-col-wrapper at-end">
                      {mobileUiData.action(row, i)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="datatable-mobile-no-data">
                    {noDataToDisplayMessage ?? <p className="no-data">No data to display</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className={`table ${tableClassName} ${isDragActive ? 'drag-active' : ''}`}>
            {showTableHeader && (
              <DatatableHeader
                columns={visibleColumnsData}
                actions={actions}
                onSorting={sortHandler}
                sortIcon={sortIcon}
                ascendingSortIcon={ascendingSortIcon}
                descendingSortIcon={descendingSortIcon}
                actionsColLabel={actionsColLabel}
                isActionsColumnLast={isActionsColumnLast}
                actionsColWidth={actionsColWidth}
                selection={selection}
                uniqueId={uniqueId}
                isSelectAllRecords={isSelectAllRecords}
                setIsSelectAllRecords={setIsSelectAllRecords}
                candidateRecordsToSelectAll={candidateRecordsToSelectAll}
                columnVisibilityToggle={
                  showColumnVisibilityInActionsColumn ? columnVisibilityToggle : undefined
                }
                enableColumnOrdering={enableColumnOrdering}
                onColumnReorder={handleColumnReorder}
              />
            )}
            <tbody>
              {recordsData.map((row, i) => (
                <DatatableBodyRow
                  key={i}
                  row={row}
                  columns={visibleColumnsData}
                  actions={actions}
                  actionsColLabel={actionsColLabel}
                  isActionsColumnLast={isActionsColumnLast}
                  actionsColWidth={actionsColWidth}
                  selection={selection}
                  uniqueId={uniqueId}
                  isSelectAllRecords={isSelectAllRecords}
                  setIsSelectAllRecords={setIsSelectAllRecords}
                  candidateRecordsToSelectAll={candidateRecordsToSelectAll}
                  rowEvents={{
                    ...rowEvents,
                    onDragStart: rowEvents?.onDragStart
                      ? {
                          ...rowEvents.onDragStart,
                          event: (e, rowData) => {
                            setIsDragActive(true);
                            rowEvents.onDragStart?.event(e, rowData);
                          },
                        }
                      : undefined,
                    onDrop: rowEvents?.onDrop
                      ? {
                          ...rowEvents.onDrop,
                          event: (e, rowData) => {
                            setIsDragActive(false);
                            rowEvents.onDrop?.event(e, rowData);
                          },
                        }
                      : undefined,
                  }}
                  columnVisibilityToggle={
                    showColumnVisibilityInActionsColumn ? columnVisibilityToggle : undefined
                  }
                  onDragEnd={() => setIsDragActive(false)}
                />
              ))}
            </tbody>
          </table>
        )}
        {recordsData.length === 0 && !(isMobileView && mobileUiData) && (
          <>
            {noDataToDisplayMessage ? (
              noDataToDisplayMessage
            ) : (
              <p className="no-data">No data to display</p>
            )}
          </>
        )}
      </div>
      {enablePagination && paginationComponent}
    </Paper>
  );
};

// Unified controlled datatable component
const PaginatedDatatable = <T extends Record<string, any> = Record<string, unknown>>({
  search,
  sort,
  pagination,
  ui,
  ref,
  ...rest
}: DatatableInterface<T> & {
  ref?: Ref<DatatableRef>;
}) => {
  const {
    rowsDropdown,
    enablePagination = true,
    deepLinking,
    rangeSeparatorLabel = 'of',
  } = (pagination as LocalControlledPaginationInterface | RemoteControlledPaginationInterface) ??
  {};
  const { rowsPerPage = 10, enableRowsDropdown = true, optionsList } = rowsDropdown ?? {};
  const { isLocalSearch = true, ...otherSearchProps } = search ?? {};
  const { isLocalSort = true, onSorting } = sort ?? {};

  // Safe access to remoteControl properties
  const remoteControl = (pagination as RemoteControlledPaginationInterface)?.remoteControl;
  const { onPaginationDataUpdate, totalRecords: remoteTotalRecords = 0 } = remoteControl ?? {};

  const [localTotalRecords, setLocalTotalRecords] = useState(rest.records.length);

  // Determine if we're using remote pagination
  const isRemotePagination = !!remoteControl;
  const totalRecords = isRemotePagination ? remoteTotalRecords : localTotalRecords;

  const paginationData = usePagination({
    contentPerPage: rowsPerPage,
    count: totalRecords,
    fetchData: onPaginationDataUpdate
      ? async (page, perPage) => {
          await onPaginationDataUpdate(page, perPage);
        }
      : undefined,
    deepLinking,
  });

  const {
    activePage,
    navigateToPrevPage,
    navigateToNextPage,
    navigateToFirstPage,
    navigateToLastPage,
    navigateToPage,
    updateCurrentRowsPerPage,
    firstContentIndex,
    lastContentIndex,
    totalPages,
    contentPerPage,
  } = paginationData;

  const modifiedOptionsList = useMemo(
    () =>
      optionsList
        ? optionsList.map((el) => ({
            ...el,
            value: JSON.stringify(el.value),
          }))
        : rowsPerPageOptions,
    [optionsList]
  );

  // Update local total records when records array changes (e.g. parent adds/removes records)
  const [prevRecordsLength, setPrevRecordsLength] = useState(rest.records.length);
  if (!isRemotePagination && prevRecordsLength !== rest.records.length) {
    setPrevRecordsLength(rest.records.length);
    setLocalTotalRecords(rest.records.length);
  }

  const onChangeRowsPerPage = async (value: string | string[]) => {
    const newRowsPerPage = +value;
    await updateCurrentRowsPerPage(newRowsPerPage);
  };

  const resetPagination = useCallback(() => {
    if (activePage !== 1 || contentPerPage !== rowsPerPage) {
      (async () => {
        await navigateToPage(1, rowsPerPage);
      })();
    }

    return {
      activePage: 1,
      rowsPerPageNum: rowsPerPage,
    };
  }, [rowsPerPage, activePage, contentPerPage, navigateToPage]);

  useImperativeHandle(
    ref,
    () => ({
      resetPagination,
    }),
    [resetPagination]
  );

  // Callback function for local pagination with local search to update totalRecords based on search results
  const handleUpdateFilteredRecordsCount = useCallback(
    (count: number) => {
      if (!isRemotePagination) {
        setLocalTotalRecords(count);
      }
    },
    [isRemotePagination]
  );

  return (
    <RootDatatable
      {...rest}
      search={{
        ...otherSearchProps,
        isLocalSearch,
        // Only provide the callback for local pagination with local search
        onUpdateFilteredRecordsCount:
          !isRemotePagination && isLocalSearch ? handleUpdateFilteredRecordsCount : undefined,
      }}
      sort={{
        isLocalSort,
        onSorting,
      }}
      pagination={{
        enablePagination,
        // Only provide content indices for local pagination (for data slicing)
        firstContentIndex: !isRemotePagination ? firstContentIndex : undefined,
        lastContentIndex: !isRemotePagination ? lastContentIndex : undefined,
        resetPagination: enablePagination ? resetPagination : undefined,
        paginationComponent: enablePagination ? (
          <DatatableFooter
            paginationComponent={
              <DatatablePagination
                navigateToFirstPage={navigateToFirstPage}
                navigateToLastPage={navigateToLastPage}
                navigateToPrevPage={navigateToPrevPage}
                navigateToNextPage={navigateToNextPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                recordsPerPage={contentPerPage}
                activePage={activePage}
                paginationRangeSeparatorLabel={rangeSeparatorLabel}
              />
            }
            enableRowsDropdown={enableRowsDropdown}
            rowsPerPageOptions={modifiedOptionsList}
            rowsPerPageNum={String(contentPerPage)}
            onChangeRowsPerPage={onChangeRowsPerPage}
          />
        ) : undefined,
      }}
      ui={ui}
    />
  );
};

const Datatable = <T extends Record<string, any> = Record<string, unknown>>({
  pagination,
  ref,
  ...rest
}: DatatableInterface<T> & {
  ref?: Ref<DatatableRef>;
}) => {
  const paginationConfig = { enablePagination: true, ...pagination };

  // Type guard to determine if custom pagination component is provided
  const isCustomPagination = !!(paginationConfig as any)?.paginationComponent;

  return (
    <>
      {paginationConfig.enablePagination ? (
        isCustomPagination ? (
          <RootDatatable {...rest} pagination={paginationConfig as any} />
        ) : (
          <PaginatedDatatable {...rest} pagination={paginationConfig as any} ref={ref} />
        )
      ) : (
        <RootDatatable {...rest} pagination={paginationConfig as any} />
      )}
    </>
  );
};

export default Datatable;
