import { stripAlignMarkers } from '@/utils/textAlignment';
import { LIST_INDENT_SPACES_PER_LEVEL, richTextToLatex } from '@/utils/textFormatting';
import { hasUnicodeMath, unicodeMathToBuilderText } from '@/utils/wordPaste';

const escapeLatexText = (value: string): string =>
  value.replace(/\\/g, '\\textbackslash{}').replace(/([{}$#%&_])/g, '\\$1');

const leadingIndentToLatex = (line: string): { indentLatex: string; content: string } => {
  const match = line.match(/^(\s*)/);
  const spaces = match?.[1].length ?? 0;
  if (spaces <= 0) {
    return { indentLatex: '', content: line };
  }
  const em = Number(((spaces / LIST_INDENT_SPACES_PER_LEVEL) * 1.25).toFixed(2));
  return {
    indentLatex: `\\hspace{${em}em}`,
    content: line.slice(spaces),
  };
};

/** Converts a11 -> a_{11}, (1)/(2) -> \frac{1}{2}, leaves plain words untouched. */
export const cellToLatex = (cell: string): string => {
  const trimmed = cell.trim();
  if (!trimmed) {
    return '';
  }

  const fractionMatch = trimmed.match(/^\(([^()\n]+)\)\s*\/\s*\(([^()\n]+)\)$/);
  if (fractionMatch) {
    return `\\frac{${cellToLatex(fractionMatch[1])}}{${cellToLatex(fractionMatch[2])}}`;
  }

  const subscriptMatch = trimmed.match(/^([A-Za-zα-ωΑ-Ω]+)(\d+)$/u);
  if (subscriptMatch) {
    return `${subscriptMatch[1]}_{${subscriptMatch[2]}}`;
  }

  return escapeLatexText(trimmed);
};

const convertFractions = (line: string): string =>
  line.replace(/\(([^()\n]+)\)\s*\/\s*\(([^()\n]+)\)/g, (_match, numerator, denominator) => {
    return `\\frac{${cellToLatex(numerator)}}{${cellToLatex(denominator)}}`;
  });

const wrapCalculusFunction = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (/^[A-Za-zα-ωΑ-Ω][A-Za-z0-9α-ωΑ-Ω₀-₉ᵢⱼₖ]*$/u.test(trimmed)) {
    return cellToLatex(trimmed);
  }
  return `\\left(${cellToLatex(trimmed)}\\right)`;
};

/** Word-like derivative / integral ASCII templates → KaTeX. */
export const convertCalculus = (line: string): string => {
  let result = line;

  result = result.replace(
    /∫_\(([^()\n]+)\)\^\(([^()\n]+)\)\s*\(([^()\n]+)\)\s*d\(([^()\n]+)\)/g,
    (_match, lower, upper, fn, variable) =>
      `\\int_{${cellToLatex(lower)}}^{${cellToLatex(upper)}} ${wrapCalculusFunction(fn)}\\,d${cellToLatex(variable)}`
  );

  result = result.replace(
    /∫\s*\(([^()\n]+)\)\s*d\(([^()\n]+)\)/g,
    (_match, fn, variable) => `\\int ${wrapCalculusFunction(fn)}\\,d${cellToLatex(variable)}`
  );

  result = result.replace(
    /∂\(([^()\n]+)\)\s*\/\s*∂\(([^()\n]+)\)/g,
    (_match, fn, variable) =>
      `\\frac{\\partial}{\\partial ${cellToLatex(variable)}}${wrapCalculusFunction(fn)}`
  );

  result = result.replace(
    /d\(([^()\n]+)\)\s*\/\s*d\(([^()\n]+)\)/g,
    (_match, fn, variable) => `\\frac{d}{d${cellToLatex(variable)}}${wrapCalculusFunction(fn)}`
  );

  return result;
};

const convertAsciiMathLine = (line: string): string => convertCalculus(convertFractions(line));

type LineToken =
  | { kind: 'matrix'; cells: string[] }
  | { kind: 'op'; op: string }
  | { kind: 'text'; text: string };

const splitOnTimes = (trimmed: string): { before: string; after: string } | null => {
  const symbolMatch = trimmed.match(/^(.*?)([×*])(.*)$/);
  if (symbolMatch) {
    return { before: symbolMatch[1].trim(), after: symbolMatch[3].trim() };
  }

  const asciiMatch = trimmed.match(/^(.*?)\s+x\s+(.*)$/i);
  if (asciiMatch) {
    return { before: asciiMatch[1].trim(), after: asciiMatch[2].trim() };
  }

  if (/^x$/i.test(trimmed)) {
    return { before: '', after: '' };
  }

  return null;
};

const pushOperatorChunk = (chunk: string, tokens: LineToken[]): void => {
  const trimmed = chunk.trim();
  if (!trimmed) {
    return;
  }

  const timesParts = splitOnTimes(trimmed);
  if (timesParts) {
    if (timesParts.before) {
      tokens.push({ kind: 'text', text: timesParts.before });
    }
    tokens.push({ kind: 'op', op: '\\times' });
    if (timesParts.after) {
      pushOperatorChunk(timesParts.after, tokens);
    }
    return;
  }

  if (trimmed.includes('+')) {
    const [before, ...rest] = trimmed.split('+');
    const beforeText = before.trim();
    if (beforeText) {
      tokens.push({ kind: 'text', text: beforeText });
    }
    tokens.push({ kind: 'op', op: '+' });
    const after = rest.join('+').trim();
    if (after) {
      pushOperatorChunk(after, tokens);
    }
    return;
  }

  if (trimmed.includes('=')) {
    const [before, ...rest] = trimmed.split('=');
    const beforeText = before.trim();
    if (beforeText) {
      tokens.push({ kind: 'text', text: beforeText });
    }
    tokens.push({ kind: 'op', op: '=' });
    const after = rest.join('=').trim();
    if (after) {
      pushOperatorChunk(after, tokens);
    }
    return;
  }

  if (trimmed === '-') {
    tokens.push({ kind: 'op', op: '-' });
    return;
  }

  tokens.push({ kind: 'text', text: trimmed });
};

const tokenizeMatrixLine = (line: string): LineToken[] => {
  const tokens: LineToken[] = [];
  let index = 0;

  while (index < line.length) {
    if (line[index] === '[') {
      const end = line.indexOf(']', index);
      if (end === -1) {
        break;
      }
      const inner = line.slice(index + 1, end).trim();
      const cells = inner.split(/\s+/).filter(Boolean);
      tokens.push({ kind: 'matrix', cells });
      index = end + 1;
      continue;
    }

    const nextBracket = line.indexOf('[', index);
    const chunk = nextBracket === -1 ? line.slice(index) : line.slice(index, nextBracket);
    pushOperatorChunk(chunk, tokens);
    index = nextBracket === -1 ? line.length : nextBracket;
  }

  return tokens;
};

const matrixRowsToLatex = (rows: string[][]): string => {
  const body = rows.map((row) => row.map(cellToLatex).join(' & ')).join(' \\\\ ');
  return `\\begin{pmatrix} ${body} \\end{pmatrix}`;
};

type StructureItem =
  | { type: 'matrix'; column: number }
  | { type: 'op'; op: string }
  | { type: 'text'; text: string };

const convertMatrixBlock = (lines: string[]): string => {
  const { indentLatex, content: firstContent } = leadingIndentToLatex(lines[0] ?? '');
  const normalizedLines = [firstContent, ...lines.slice(1)];
  const tokenized = normalizedLines.map(tokenizeMatrixLine);
  const firstLine = tokenized[0] ?? [];
  if (!firstLine.some((token) => token.kind === 'matrix')) {
    // Never emit raw math for non-matrix lines — KaTeX drops spaces outside \text{}.
    return normalizedLines
      .map((line, index) => {
        const body = richTextToLatex(line, escapeLatexText);
        return index === 0 ? `${indentLatex}${body}` : body;
      })
      .filter(Boolean)
      .join(' \\\\ ');
  }

  const structure: StructureItem[] = [];
  const matrixColumns: string[][][] = [];
  let matrixColumn = 0;

  firstLine.forEach((token) => {
    if (token.kind === 'op') {
      structure.push({ type: 'op', op: token.op });
      return;
    }
    if (token.kind === 'text') {
      structure.push({ type: 'text', text: token.text });
      return;
    }
    structure.push({ type: 'matrix', column: matrixColumn });
    matrixColumns[matrixColumn] = [token.cells];
    matrixColumn += 1;
  });

  for (let lineIndex = 1; lineIndex < tokenized.length; lineIndex += 1) {
    const matricesOnLine = tokenized[lineIndex].filter(
      (token): token is { kind: 'matrix'; cells: string[] } => token.kind === 'matrix'
    );
    matricesOnLine.forEach((matrix, columnIndex) => {
      if (!matrixColumns[columnIndex]) {
        matrixColumns[columnIndex] = [];
      }
      matrixColumns[columnIndex].push(matrix.cells);
    });
  }

  const body = structure
    .map((item) => {
      if (item.type === 'op') {
        return item.op;
      }
      if (item.type === 'text') {
        return richTextToLatex(item.text, escapeLatexText);
      }
      return matrixRowsToLatex(matrixColumns[item.column] ?? [['']]);
    })
    .join(' ');

  return `${indentLatex}${body}`;
};

const isMatrixLine = (line: string): boolean => /\[[^\]]+\]/.test(line);

/**
 * Follow-up rows of a matrix block (optionally indented).
 * Must be ONLY matrix brackets (no labels like `λI =` and no operators like `-` / `=`),
 * otherwise the next equation's rows get absorbed into the previous matrix.
 * Column-0 rows are allowed so side-by-side matrices like:
 *   [ a11  a12 ] = [ b11  b12 ]
 *   [ a21  a22 ]   [ b21  b22 ]
 * stay as true 2x2 blocks for preview and Word copy.
 */
const isMatrixContinuationLine = (line: string): boolean =>
  /^\s*\[[^\]]*\](?:\s+\[[^\]]*\])*\s*$/.test(line);

const isCalculusTemplateLine = (line: string): boolean =>
  /^d\([^()\n]+\)\s*\/\s*d\([^()\n]+\)$/.test(line) ||
  /^∂\([^()\n]+\)\s*\/\s*∂\([^()\n]+\)$/.test(line) ||
  /^∫_\([^()\n]+\)\^\([^()\n]+\)\s*\([^()\n]+\)\s*d\([^()\n]+\)$/.test(line) ||
  /^∫\s*\([^()\n]+\)\s*d\([^()\n]+\)$/.test(line);

/** Pure symbolic lines that should stay in math mode (not English prose). */
const isPureMathLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed || isMatrixLine(trimmed)) {
    return false;
  }

  // Standalone fraction / calculus templates are math even with word placeholders.
  if (/^\([^()\n]+\)\s*\/\s*\([^()\n]+\)$/.test(trimmed) || isCalculusTemplateLine(trimmed)) {
    return true;
  }

  // English words => prose (KaTeX math mode would collapse spaces).
  if (/[A-Za-z]{3,}/.test(trimmed) && /[a-z]/.test(trimmed)) {
    return false;
  }

  return (
    /[=+×]/.test(trimmed) ||
    /\([^()\n]+\)\s*\/\s*\([^()\n]+\)/.test(trimmed) ||
    /[λΛ]/.test(trimmed) ||
    /[∫∑∏∂]/.test(trimmed) ||
    /^\([^)]*\)/.test(trimmed)
  );
};

/**
 * Groups consecutive matrix rows separately from prose so a leading sentence
 * does not force the whole Word paste into raw math mode (which drops spaces
 * and leaves literal [40] row brackets).
 */
export type EditorLineGroup = {
  kind: 'matrix' | 'math' | 'prose';
  lines: string[];
};

export const groupEditorLines = (lines: string[]): EditorLineGroup[] => {
  const groups: Array<{ kind: 'matrix' | 'math' | 'prose'; lines: string[] }> = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isMatrixLine(line)) {
      const matrixLines = [line];
      index += 1;
      // Only indented rows continue the same matrix equation. A new line that
      // starts at column 0 with `[` is a separate equation (e.g. A-λI = ...).
      while (index < lines.length && isMatrixContinuationLine(lines[index])) {
        matrixLines.push(lines[index]);
        index += 1;
      }
      groups.push({ kind: 'matrix', lines: matrixLines });
      continue;
    }

    if (isPureMathLine(line)) {
      groups.push({ kind: 'math', lines: [line] });
      index += 1;
      continue;
    }

    const proseLines = [line];
    index += 1;
    while (index < lines.length && !isMatrixLine(lines[index]) && !isPureMathLine(lines[index])) {
      proseLines.push(lines[index]);
      index += 1;
    }
    groups.push({ kind: 'prose', lines: proseLines });
  }

  return groups;
};

export const editorLineGroupToLatex = (group: EditorLineGroup): string => {
  if (group.kind === 'matrix') {
    return convertMatrixBlock(group.lines);
  }

  if (group.kind === 'math') {
    return group.lines
      .map((line) => {
        const { indentLatex, content } = leadingIndentToLatex(line);
        return `${indentLatex}${convertAsciiMathLine(content)}`;
      })
      .join(' \\\\ ');
  }

  return group.lines
    .map((line) => {
      if (!line.trim()) {
        return '';
      }
      const { indentLatex, content } = leadingIndentToLatex(line);
      return `${indentLatex}${richTextToLatex(content, escapeLatexText)}`;
    })
    .filter(Boolean)
    .join(' \\\\ ');
};

/** Converts ASCII / prose editor blocks (no $$ segments) into LaTeX. */
const asciiBlocksToLatex = (text: string): string => {
  const blocks = text.split(/\n{2,}/);

  return blocks
    .map((block) => {
      const lines = block.split('\n');
      return groupEditorLines(lines).map(editorLineGroupToLatex).filter(Boolean).join(' \\\\ ');
    })
    .join(' \\\\[0.75em] ');
};

/**
 * Converts editor plain text (ASCII matrices / fraction templates) into LaTeX
 * that KaTeX can render with Word-like stretchy brackets and fraction bars.
 * Embedded `$$...$$` segments are passed through unchanged for Word paste fallbacks.
 */
export const editorTextToLatex = (text: string): string => {
  const withoutAlign = stripAlignMarkers(text);
  const prepared = hasUnicodeMath(withoutAlign)
    ? unicodeMathToBuilderText(withoutAlign)
    : withoutAlign;
  const normalized = prepared.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '';
  }

  const parts: string[] = [];
  const dollarLatexRe = /\$\$([\s\S]+?)\$\$/g;
  let lastIndex = 0;
  let match = dollarLatexRe.exec(normalized);

  while (match) {
    const before = normalized.slice(lastIndex, match.index).trim();
    if (before) {
      parts.push(asciiBlocksToLatex(before));
    }
    const latexSegment = match[1].trim();
    if (latexSegment) {
      parts.push(latexSegment);
    }
    lastIndex = match.index + match[0].length;
    match = dollarLatexRe.exec(normalized);
  }

  const after = normalized.slice(lastIndex).trim();
  if (after) {
    parts.push(asciiBlocksToLatex(after));
  }

  if (!parts.length) {
    return asciiBlocksToLatex(normalized);
  }

  return parts.join(' ');
};
