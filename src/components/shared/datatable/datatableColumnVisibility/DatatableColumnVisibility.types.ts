import { ButtonInterface } from '@/components/shared/button/Button.types';

import { ColumnDef } from '../datatableHeader/DatatableHeader.types';

export interface DatatableColumnVisibilityInterface<T = Record<string, unknown>> {
  columns: ColumnDef<T>[];
  visibleColumns: Record<string, boolean>;
  onToggleColumn: (columnKey: string) => void;
  trigger?: ButtonInterface;
}
