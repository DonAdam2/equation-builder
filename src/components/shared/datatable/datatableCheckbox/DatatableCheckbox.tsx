import cloneDeep from 'lodash/cloneDeep';

import { DatatableRadioInputInterface } from '@/components/shared/datatable/datatableRadioInput/DatatableRadioInput.types';

const DatatableCheckbox = <T extends Record<string, any> = Record<string, any>>({
  disabled,
  hidden,
  onSelectionChange,
  selectedData,
  dataKey,
  rowInfo,
  name,
  className,
  isSelectAllRecords,
  setIsSelectAllRecords,
  candidateRecordsToSelectAll,
}: DatatableRadioInputInterface<T>) => {
  const disabledInput = disabled
      ? typeof disabled === 'boolean'
        ? disabled
        : disabled(rowInfo)
      : undefined,
    isChecked = selectedData.some(
      (item: any) => item[dataKey].toString() === rowInfo.getValue(dataKey).toString()
    );

  return (
    <>
      {!(hidden ? (typeof hidden === 'boolean' ? hidden : hidden(rowInfo)) : undefined) && (
        <input
          type="checkbox"
          name={name}
          disabled={disabledInput}
          checked={isChecked}
          className={className}
          onChange={() => {
            const clonedSelectedData = cloneDeep(selectedData);
            // Check if the selected person is already in the array
            const isSelected = clonedSelectedData.some(
              (el: any) => el[dataKey] === rowInfo.getValue(dataKey)
            );
            let newSelections = [];

            if (isSelected) {
              // If item is selected, remove it
              newSelections = clonedSelectedData.filter(
                (el: any) => el[dataKey] !== rowInfo.getValue(dataKey)
              );
            } else {
              // If the item is not selected, add it
              newSelections = [...clonedSelectedData, rowInfo.original];
            }

            //if isSelectAllRecords is selected => unselect it
            if (isSelectAllRecords && setIsSelectAllRecords) {
              setIsSelectAllRecords(false);
            }

            //get list of unselected records from candidateRecordsToSelectAll based on newSelections
            const unSelectedRecords = candidateRecordsToSelectAll.filter(
              (candidate: any) =>
                !newSelections.some((record: any) => candidate[dataKey] === record[dataKey])
            );

            /* if isSelectAllRecords=false, unSelectedRecords array is empty and
             * candidateRecordsToSelectAll.length equal to newSelections.length
             * set isSelectAllRecords to true
             * else set selectedData to newSelections */
            if (
              setIsSelectAllRecords &&
              !isSelectAllRecords &&
              !unSelectedRecords.length &&
              candidateRecordsToSelectAll.length === newSelections.length
            ) {
              /* we are not using onSelectionChange because once we set isSelectAllRecords to true
               * useEffect in DatatableHeader will run to select all candidate records */
              setIsSelectAllRecords(true);
            } else {
              onSelectionChange(newSelections);
            }
          }}
          data-test={`checkbox-input-${rowInfo.getValue(dataKey)}`}
        />
      )}
    </>
  );
};

export default DatatableCheckbox;
