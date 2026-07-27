import ConditionalWrapper from '@/components/shared/conditionalWrapper/ConditionalWrapper';
import { DatatableIconButtonInterface } from '@/components/shared/datatable/datatableIconButton/DatatableIconButton.types';
import Tooltip from '@/components/shared/tooltip/Tooltip';

const DatatableIconButton = <T extends Record<string, any> = Record<string, any>>({
  disabled,
  hidden,
  icon,
  onClick,
  rowInfo,
  cell,
  tooltip,
}: DatatableIconButtonInterface<T>) => {
  const disabledBtn = disabled
    ? typeof disabled === 'boolean'
      ? disabled
      : disabled(rowInfo)
    : undefined;

  return (
    <>
      {!(hidden ? (typeof hidden === 'boolean' ? hidden : hidden(rowInfo)) : undefined) && (
        <ConditionalWrapper
          initialWrapper={(children: any) => <>{children}</>}
          condition={tooltip !== undefined}
          wrapper={(children: any) => (
            <>
              {tooltip !== undefined && (
                <Tooltip {...tooltip} disabled={disabledBtn}>
                  {children}
                </Tooltip>
              )}
            </>
          )}
        >
          {cell ? (
            cell(rowInfo)
          ) : (
            <button
              disabled={disabledBtn}
              onClick={(e) => onClick?.(e, rowInfo)}
              className="datatable-icon-button"
            >
              {icon}
            </button>
          )}
        </ConditionalWrapper>
      )}
    </>
  );
};
export default DatatableIconButton;
