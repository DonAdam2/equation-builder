import { Dispatch, SetStateAction, MouseEvent, DragEvent, ReactNode } from 'react';

import { BooleanFuncType } from '@/components/shared/datatable/Datatable.types';
import {
  ColumnDef,
  ActionDef,
  DatatableSelectionConfigInterface,
  RowInfo,
} from '@/components/shared/datatable/datatableHeader/DatatableHeader.types';

// Row events interface similar to ActionDef pattern
export interface DatatableRowEvents<T = Record<string, unknown>> {
  onClick?: {
    clickable?: boolean | BooleanFuncType<T>;
    event: (e: MouseEvent, rowInfo: RowInfo<T>) => void;
  };
  onDoubleClick?: {
    clickable?: boolean | BooleanFuncType<T>;
    event: (e: MouseEvent, rowInfo: RowInfo<T>) => void;
  };
  onDrop?: {
    droppable?: boolean | BooleanFuncType<T>;
    event: (e: DragEvent, rowInfo: RowInfo<T>) => void;
    className?: string;
  };
  onDragStart?: {
    icon?: ReactNode;
    draggable?: boolean | BooleanFuncType<T>;
    event: (e: DragEvent, rowInfo: RowInfo<T>) => void;
    className?: string;
    /**
     * Customize the drag preview shown while dragging the row (similar to react-dnd).
     * Return the content to render as the drag image. When omitted, the full row is cloned.
     */
    preview?: (rowInfo: RowInfo<T>) => ReactNode;
    /** Offset of the drag preview relative to the cursor. Defaults to { x: 0, y: 0 }. */
    previewOffset?: { x: number; y: number };
  };
}

export interface DatatableBodyRowInterface<T = Record<string, unknown>> {
  columns: ColumnDef<T>[];
  row: T;
  actions?: ActionDef<T>[];
  isActionsColumnLast?: boolean;
  actionsColLabel?: string;
  actionsColWidth?: number | string;
  selection?: DatatableSelectionConfigInterface<T>;
  uniqueId: string;
  isSelectAllRecords: boolean;
  setIsSelectAllRecords: Dispatch<SetStateAction<boolean>>;
  candidateRecordsToSelectAll: T[];
  rowEvents?: DatatableRowEvents<T>;
  columnVisibilityToggle?: ReactNode;
  onDragEnd?: () => void;
}
