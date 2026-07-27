import { DatatableFooterInterface } from '@/components/shared/datatable/datatableFooter/DatatableFooter.types';
import Dropdown from '@/components/shared/dropdown/Dropdown';

const DatatableFooter = ({
  paginationComponent,
  enableRowsDropdown = true,
  rowsPerPageOptions,
  rowsPerPageNum,
  onChangeRowsPerPage,
}: DatatableFooterInterface) => (
  <div className="pagination-outer-wrapper">
    {paginationComponent}
    {enableRowsDropdown && (
      <Dropdown
        header={{
          controlledDropdown: {
            value: rowsPerPageNum,
            onChangeHandler: onChangeRowsPerPage,
          },
        }}
        body={{
          options: rowsPerPageOptions,
        }}
      />
    )}
  </div>
);

export default DatatableFooter;
