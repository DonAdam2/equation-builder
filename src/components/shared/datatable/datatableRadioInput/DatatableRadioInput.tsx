import { DatatableRadioInputInterface } from '@/components/shared/datatable/datatableRadioInput/DatatableRadioInput.types';

const DatatableRadioInput = <T extends Record<string, any> = Record<string, any>>({
  disabled,
  hidden,
  onSelectionChange,
  selectedData,
  dataKey,
  rowInfo,
  name,
  className,
}: DatatableRadioInputInterface<T>) => {
  const disabledInput = disabled
    ? typeof disabled === 'boolean'
      ? disabled
      : disabled(rowInfo)
    : undefined;

  return (
    <>
      {!(hidden ? (typeof hidden === 'boolean' ? hidden : hidden(rowInfo)) : undefined) && (
        <input
          type="radio"
          name={name}
          disabled={disabledInput}
          value={rowInfo.getValue(dataKey).toString()}
          checked={rowInfo.getValue(dataKey).toString() === selectedData[dataKey].toString()}
          className={className}
          onChange={() => {
            onSelectionChange(rowInfo.original);
          }}
          data-test={`radio-input-${rowInfo.getValue(dataKey)}`}
        />
      )}
    </>
  );
};

export default DatatableRadioInput;
