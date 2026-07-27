import { Equation, MatrixDimensions } from '@/models/Equation';

const MIN_DIMENSION = 1;
const MAX_DIMENSION = 10;

export const clampMatrixDimension = (value: number): number =>
  Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, Math.floor(value) || MIN_DIMENSION));

export const createCellLabel = (prefix: string, row: number, col: number): string =>
  `${prefix}${row}${col}`;

/** Builds a Word-friendly matrix block, e.g. [ a11  a12 ] / [ a21  a22 ] */
export const buildMatrixBlock = (
  rows: number,
  cols: number,
  prefix = 'a'
): { template: string; cells: string[]; lines: string[] } => {
  const safeRows = clampMatrixDimension(rows);
  const safeCols = clampMatrixDimension(cols);
  const cells: string[] = [];
  const lines: string[] = [];

  for (let row = 1; row <= safeRows; row += 1) {
    const rowCells: string[] = [];
    for (let col = 1; col <= safeCols; col += 1) {
      const cell = createCellLabel(prefix, row, col);
      cells.push(cell);
      rowCells.push(cell);
    }
    lines.push(`[ ${rowCells.join('  ')} ]`);
  }

  return {
    template: lines.join('\n'),
    cells,
    lines,
  };
};

const combineMatrixBlocks = (
  leftLines: string[],
  rightLines: string[],
  operator: string
): string => {
  const totalRows = Math.max(leftLines.length, rightLines.length);
  const leftWidth = Math.max(...leftLines.map((line) => line.length), 0);

  return Array.from({ length: totalRows }, (_, index) => {
    const leftLine = (leftLines[index] ?? '').padEnd(leftWidth, ' ');
    const rightLine = rightLines[index] ?? '';
    const joiner = index === 0 ? ` ${operator} ` : '   ';
    return rightLine ? `${leftLine}${joiner}${rightLine}` : leftLine;
  }).join('\n');
};

export const buildFractionEquation = (base: Equation): Equation => {
  const template = '(numerator)/(denominator)';
  return {
    ...base,
    template,
    expectedVariables: ['numerator', 'denominator'],
  };
};

export const buildMatrixEquation = (base: Equation, dimensions: MatrixDimensions): Equation => {
  const { template, cells } = buildMatrixBlock(dimensions.rows, dimensions.cols, 'a');
  return {
    ...base,
    template,
    expectedVariables: cells,
  };
};

export const buildMatrixAdditionEquation = (
  base: Equation,
  dimensions: MatrixDimensions
): Equation => {
  const left = buildMatrixBlock(dimensions.rows, dimensions.cols, 'a');
  const right = buildMatrixBlock(dimensions.rows, dimensions.cols, 'b');

  return {
    ...base,
    template: combineMatrixBlocks(left.lines, right.lines, '+'),
    expectedVariables: [...left.cells, ...right.cells],
  };
};

/** A (rows × cols) × B (cols × rightCols) */
export const buildMatrixMultiplicationEquation = (
  base: Equation,
  dimensions: MatrixDimensions
): Equation => {
  const rightCols = clampMatrixDimension(dimensions.rightCols ?? dimensions.cols);
  const left = buildMatrixBlock(dimensions.rows, dimensions.cols, 'a');
  const right = buildMatrixBlock(dimensions.cols, rightCols, 'b');

  return {
    ...base,
    template: combineMatrixBlocks(left.lines, right.lines, '×'),
    expectedVariables: [...left.cells, ...right.cells],
  };
};

export const requiresMatrixDimensions = (equation: Equation): boolean =>
  equation.interactiveKind === 'matrix' ||
  equation.interactiveKind === 'matrix-addition' ||
  equation.interactiveKind === 'matrix-multiplication';

export const buildInteractiveMatrixEquation = (
  base: Equation,
  dimensions: MatrixDimensions
): Equation => {
  switch (base.interactiveKind) {
    case 'matrix-addition':
      return buildMatrixAdditionEquation(base, dimensions);
    case 'matrix-multiplication':
      return buildMatrixMultiplicationEquation(base, dimensions);
    case 'matrix':
    default:
      return buildMatrixEquation(base, dimensions);
  }
};
