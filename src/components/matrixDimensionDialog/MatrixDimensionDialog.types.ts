import { Equation, MatrixDimensions } from '@/models/Equation';

export interface MatrixDimensionDialogProps {
  isOpen: boolean;
  equation: Equation | null;
  onConfirm: (dimensions: MatrixDimensions) => void;
  onCancel: () => void;
  defaultRows?: number;
  defaultCols?: number;
  defaultRightCols?: number;
}
