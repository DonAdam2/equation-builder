export interface DatatablePaginationInterface {
  navigateToFirstPage: () => void;
  navigateToLastPage: () => void;
  navigateToPrevPage: () => void;
  navigateToNextPage: () => void;
  totalRecords: number;
  totalPages: number;
  recordsPerPage: number;
  activePage: number;
  paginationRangeSeparatorLabel?: string;
}
