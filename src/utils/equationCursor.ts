import { Equation } from '@/models/Equation';

export interface InsertionResult {
  nextValue: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Builds the text to insert, adding a leading space when the cursor sits
 * directly after a non-whitespace character.
 */
export const buildInsertText = (
  currentValue: string,
  cursorStart: number,
  template: string
): string => {
  if (cursorStart <= 0) {
    return template;
  }

  const charBefore = currentValue[cursorStart - 1];
  const needsSpace = Boolean(
    charBefore && !/\s/.test(charBefore) && !/^[.,;:!?)}\]]/.test(template)
  );

  return needsSpace ? ` ${template}` : template;
};

const getLineAndColumn = (
  value: string,
  absoluteOffset: number
): { lineIndex: number; column: number } => {
  const lines = value.split('\n');
  let remaining = absoluteOffset;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineLength = lines[lineIndex].length;
    if (remaining <= lineLength) {
      return { lineIndex, column: remaining };
    }

    // Consume this line plus its trailing newline (except after the last line).
    remaining -= lineLength + 1;
  }

  const lastIndex = Math.max(lines.length - 1, 0);
  return {
    lineIndex: lastIndex,
    column: lines[lastIndex]?.length ?? 0,
  };
};

const toAbsoluteOffset = (lines: string[], lineIndex: number, column: number): number => {
  let offset = 0;
  for (let i = 0; i < lineIndex; i += 1) {
    offset += lines[i].length + 1;
  }
  return offset + column;
};

/**
 * Inserts a multiline template by merging each template row into existing lines
 * at a shared anchor column. This keeps matrix equations aligned:
 *
 *   [ a11  a12 ] = [ c11  c12 ]
 *   [ a21  a22 ]   [ c21  c22 ]
 *
 * instead of splitting the block with raw newlines.
 */
export const insertMultilineAtCursor = ({
  currentValue,
  selectionStart,
  selectionEnd,
  templateLines,
}: {
  currentValue: string;
  selectionStart: number;
  selectionEnd: number;
  templateLines: string[];
}): { nextValue: string; insertOffset: number } => {
  const collapsed = currentValue.slice(0, selectionStart) + currentValue.slice(selectionEnd);
  const lines = collapsed.split('\n');
  const { lineIndex, column } = getLineAndColumn(collapsed, selectionStart);

  const firstLine = templateLines[0] ?? '';
  const leadingWhitespace = firstLine.length - firstLine.trimStart().length;
  const anchorColumn = column + leadingWhitespace;

  const currentLine = lines[lineIndex] ?? '';
  lines[lineIndex] = currentLine.slice(0, column) + firstLine + currentLine.slice(column);

  for (let row = 1; row < templateLines.length; row += 1) {
    const targetLineIndex = lineIndex + row;
    const rowText = templateLines[row];

    if (targetLineIndex >= lines.length) {
      lines.push(`${' '.repeat(anchorColumn)}${rowText}`);
      continue;
    }

    const targetLine = lines[targetLineIndex];
    if (targetLine.length < anchorColumn) {
      lines[targetLineIndex] =
        `${targetLine}${' '.repeat(anchorColumn - targetLine.length)}${rowText}`;
    } else {
      lines[targetLineIndex] =
        targetLine.slice(0, anchorColumn) + rowText + targetLine.slice(anchorColumn);
    }
  }

  return {
    nextValue: lines.join('\n'),
    insertOffset: toAbsoluteOffset(lines, lineIndex, column),
  };
};

const resolveSelection = ({
  insertText,
  insertOffset,
  nextValue,
  expectedVariables,
}: {
  insertText: string;
  insertOffset: number;
  nextValue: string;
  expectedVariables: string[];
}): InsertionResult => {
  const firstVariable = expectedVariables[0];
  if (firstVariable) {
    // Prefer the variable that belongs to the newly inserted block.
    const searchWindow = nextValue.slice(insertOffset, insertOffset + insertText.length + 200);
    const relativeIndex = searchWindow.indexOf(firstVariable);
    if (relativeIndex >= 0) {
      const absoluteIndex = insertOffset + relativeIndex;
      return {
        nextValue,
        selectionStart: absoluteIndex,
        selectionEnd: absoluteIndex + firstVariable.length,
      };
    }
  }

  const openParenIndex = insertText.indexOf('(');
  if (openParenIndex >= 0) {
    const caret = insertOffset + openParenIndex + 1;
    return {
      nextValue,
      selectionStart: caret,
      selectionEnd: caret,
    };
  }

  const caret = insertOffset + (insertText.split('\n')[0]?.length ?? 0);
  return {
    nextValue,
    selectionStart: caret,
    selectionEnd: caret,
  };
};

/**
 * Inserts arbitrary text at the selection. Multiline matrix-style blocks are
 * merged into surrounding lines (same as equation templates).
 */
export const insertTextAtCursor = ({
  currentValue,
  selectionStart,
  selectionEnd,
  text,
  skipLeadingSpace = false,
}: {
  currentValue: string;
  selectionStart: number;
  selectionEnd: number;
  text: string;
  /** When true, insert exactly `text` (used for symbol keyboard glyphs). */
  skipLeadingSpace?: boolean;
}): InsertionResult => {
  const insertText = skipLeadingSpace ? text : buildInsertText(currentValue, selectionStart, text);
  const templateLines = insertText.split('\n');

  if (templateLines.length === 1) {
    const before = currentValue.slice(0, selectionStart);
    const after = currentValue.slice(selectionEnd);
    const nextValue = `${before}${insertText}${after}`;
    const caret = before.length + insertText.length;
    return {
      nextValue,
      selectionStart: caret,
      selectionEnd: caret,
    };
  }

  const { nextValue } = insertMultilineAtCursor({
    currentValue,
    selectionStart,
    selectionEnd,
    templateLines,
  });

  const { lineIndex } = getLineAndColumn(
    currentValue.slice(0, selectionStart) + currentValue.slice(selectionEnd),
    selectionStart
  );
  const lastTemplateLineIndex = lineIndex + templateLines.length - 1;
  const lines = nextValue.split('\n');
  const safeLineIndex = Math.min(lastTemplateLineIndex, lines.length - 1);
  const caret = toAbsoluteOffset(lines, safeLineIndex, lines[safeLineIndex]?.length ?? 0);

  return {
    nextValue,
    selectionStart: caret,
    selectionEnd: caret,
  };
};

/**
 * Insertion-at-cursor logic:
 * 1. Splice single-line templates directly at the caret.
 * 2. Merge multiline templates (matrices) into surrounding lines at the caret column.
 * 3. Prefer selecting the first expected variable so the user can type over it.
 */
export const insertTemplateAtCursor = ({
  currentValue,
  selectionStart,
  selectionEnd,
  equation,
}: {
  currentValue: string;
  selectionStart: number;
  selectionEnd: number;
  equation: Equation;
}): InsertionResult => {
  const insertText = buildInsertText(currentValue, selectionStart, equation.template);
  const templateLines = insertText.split('\n');

  if (templateLines.length === 1) {
    const before = currentValue.slice(0, selectionStart);
    const after = currentValue.slice(selectionEnd);
    const nextValue = `${before}${insertText}${after}`;
    return resolveSelection({
      insertText,
      insertOffset: before.length,
      nextValue,
      expectedVariables: equation.expectedVariables,
    });
  }

  const { nextValue, insertOffset } = insertMultilineAtCursor({
    currentValue,
    selectionStart,
    selectionEnd,
    templateLines,
  });

  return resolveSelection({
    insertText,
    insertOffset,
    nextValue,
    expectedVariables: equation.expectedVariables,
  });
};
