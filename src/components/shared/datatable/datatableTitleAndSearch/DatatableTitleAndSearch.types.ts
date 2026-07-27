import { DatatableSearchInterface } from '@/components/shared/datatable/datatableSearch/DatatableSearch.types';
import { DatatableTitleInterface } from '@/components/shared/datatable/datatableTitle/DatatableTitle.types';

export interface DatatableTitleAndSearchInterface extends DatatableTitleInterface {
  search?: DatatableSearchInterface;
}
