import { Equation } from '@/models/Equation';

export interface EquationPillsProps {
  equations: Equation[];
  onPillClick: (equation: Equation) => void;
}
