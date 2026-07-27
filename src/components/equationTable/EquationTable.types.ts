import { Equation } from '@/models/Equation';

export interface EquationTableProps {
  equations: Equation[];
  onEquationSelect: (equation: Equation) => void;
}
