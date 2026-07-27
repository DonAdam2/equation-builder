export type EquationInteractiveKind =
  | 'fraction'
  | 'matrix'
  | 'matrix-addition'
  | 'matrix-multiplication';

export interface Equation {
  id: string;
  name: string;
  description: string;
  template: string;
  expectedVariables: string[];
  category?: string;
  /**
   * When set, selecting the equation opens a builder (e.g. rows/cols for matrices)
   * instead of inserting the static template as-is.
   */
  interactiveKind?: EquationInteractiveKind;
}

export interface MatrixDimensions {
  /** Left matrix rows (also used as the single matrix rows). */
  rows: number;
  /** Left matrix columns / shared inner dimension for multiplication. */
  cols: number;
  /** Right matrix columns when multiplying (B is cols × rightCols). */
  rightCols?: number;
}
