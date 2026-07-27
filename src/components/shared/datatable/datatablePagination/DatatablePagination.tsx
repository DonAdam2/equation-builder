import { DatatablePaginationInterface } from '@/components/shared/datatable/datatablePagination/DatatablePagination.types';

import ChevronLeftIcon from '@/assets/icons/ChevronLeftIcon';
import ChevronRightIcon from '@/assets/icons/ChevronRightIcon';
import DoubleChevronLeftIcon from '@/assets/icons/DoubleChevronLeftIcon';
import DoubleChevronRightIcon from '@/assets/icons/DoubleChevronRightIcon';

const DatatablePagination = ({
  navigateToFirstPage,
  navigateToLastPage,
  navigateToPrevPage,
  navigateToNextPage,
  totalPages,
  totalRecords,
  recordsPerPage,
  activePage,
  paginationRangeSeparatorLabel,
}: DatatablePaginationInterface) => {
  const isPrevBtnDisabled = activePage === 1 || activePage > totalPages,
    isNextBtnDisabled = activePage >= totalPages || totalRecords === 0;

  return (
    <div className="pagination-wrapper">
      <button className="pagination-btn" onClick={navigateToFirstPage} disabled={isPrevBtnDisabled}>
        <DoubleChevronLeftIcon className="transform-icon" />
      </button>
      <button className="pagination-btn" onClick={navigateToPrevPage} disabled={isPrevBtnDisabled}>
        <ChevronLeftIcon className="transform-icon" />
      </button>
      <span className="pagination-caption">
        <span>
          {totalRecords > 0
            ? `${
                1 + recordsPerPage * (activePage - 1) > totalRecords
                  ? totalRecords
                  : 1 + recordsPerPage * (activePage - 1)
              } - ${activePage * recordsPerPage > totalRecords ? totalRecords : activePage * recordsPerPage}`
            : 0}
        </span>
        <span>{paginationRangeSeparatorLabel ?? 'of'}</span>
        <span>{totalRecords}</span>
      </span>
      <button className="pagination-btn" onClick={navigateToNextPage} disabled={isNextBtnDisabled}>
        <ChevronRightIcon className="transform-icon" />
      </button>
      <button className="pagination-btn" onClick={navigateToLastPage} disabled={isNextBtnDisabled}>
        <DoubleChevronRightIcon className="transform-icon" />
      </button>
    </div>
  );
};

export default DatatablePagination;
