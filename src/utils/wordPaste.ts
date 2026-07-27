import { formatAlignMarker, parseCssTextAlign, TextAlign } from '@/utils/textAlignment';
import {
  closeTag,
  InlineFormat,
  LIST_INDENT_SPACES_PER_LEVEL,
  openTag,
} from '@/utils/textFormatting';

export type PasteKind = 'ascii' | 'latex' | 'plain';

export interface PasteResolution {
  text: string;
  kind: PasteKind;
}

export interface ClipboardMathRead {
  latex?: string;
  plainText: string;
  mathMl?: string;
}

const DOLLAR_LATEX_RE = /\$\$([\s\S]+?)\$\$/;
const BARE_LATEX_RE = /\\(?:begin\{|frac\{|text\{|times\b)/;

/** Leading Word/editor list marker after optional indent. */
const WORD_LIST_MARKER_RE = /^(?:[•○●■◦▪▫‣∙\-–—*]|o|\d+\.)(?:\s+)/;
const LIST_MARKER_LINE_RE = /(?:^|\n)[ \t]*(?:[•○●■◦▪▫‣∙\-–—*]|o|\d+\.)\s+/g;

/** Word UnicodeMath matrix markers (U+25A0 ■, U+24A8 ⒨). */
export const hasUnicodeMath = (text: string): boolean =>
  /[■⒨]\s*\(/.test(text) || /\\matrix\s*\(/i.test(text);

export const splitListPrefix = (text: string): { indent: string; marker: string; rest: string } => {
  const indentMatch = text.match(/^(\s*)/);
  const indent = indentMatch?.[1] ?? '';
  const afterIndent = text.slice(indent.length);
  const markerMatch = afterIndent.match(WORD_LIST_MARKER_RE);
  if (markerMatch) {
    return {
      indent,
      marker: markerMatch[0],
      rest: afterIndent.slice(markerMatch[0].length),
    };
  }
  return { indent, marker: '', rest: afterIndent };
};

const countListMarkers = (text: string): number => (text.match(LIST_MARKER_LINE_RE) ?? []).length;

const hasListMarkers = (text: string): boolean => countListMarkers(text) > 0;

/** Normalizes Word plain-text list indents (tabs) into 2-space levels. */
export const normalizePlainListIndent = (text: string): string =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/^(\t+)/gm, (_match, tabs: string) => '  '.repeat(tabs.length))
    .replace(/(^|\n)([ \t]*)([•○●■◦▪▫‣∙\-–—*]|o|\d+\.)\t+/g, '$1$2$3 ');

const stripWordMathQuotes = (text: string): string => {
  const { indent, marker, rest } = splitListPrefix(text);
  const cleaned = rest
    .replace(/"([^"\n]*)"/g, (_match, inner: string) => inner.trim())
    // Drop stray Word math quotes left between adjacent equations.
    .replace(/"/g, '')
    // Stray list-marker ■ mid-line (not the ■( matrix operator, not the line prefix).
    .replace(/■(?!\()/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${indent}${marker}${cleaned}`;
};

const findMatchingParen = (source: string, openIndex: number): number => {
  if (source[openIndex] !== '(') {
    return -1;
  }

  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '(') {
      depth += 1;
    } else if (source[index] === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
};

const unicodeCellToLatex = (cell: string): string => {
  const normalized = cell.replace(/−/g, '-').trim();
  if (!normalized) {
    return '';
  }

  const fracMatch = normalized.match(/^([+-]?[^\s/=]+?)\/([+-]?[^\s/=]+)$/);
  if (fracMatch) {
    return `\\frac{${fracMatch[1]}}{${fracMatch[2]}}`;
  }

  return normalized;
};

const replaceUnicodeMatrices = (text: string): string => {
  let result = '';
  let index = 0;

  while (index < text.length) {
    const blackSquare = text.indexOf('■(', index);
    const pmatrixChar = text.indexOf('⒨(', index);
    const matrixCommand = text.toLowerCase().indexOf('\\matrix(', index);

    const candidates = [
      blackSquare >= 0 ? { at: blackSquare, openAt: blackSquare + 1 } : null,
      pmatrixChar >= 0 ? { at: pmatrixChar, openAt: pmatrixChar + 1 } : null,
      matrixCommand >= 0 ? { at: matrixCommand, openAt: matrixCommand + '\\matrix'.length } : null,
    ].filter(Boolean) as Array<{ at: number; openAt: number }>;

    if (!candidates.length) {
      result += text.slice(index);
      break;
    }

    candidates.sort((left, right) => left.at - right.at);
    const next = candidates[0];
    let start = next.at;

    // Word often wraps matrices as (■(...))
    if (start > 0 && text[start - 1] === '(') {
      start -= 1;
    }

    result += text.slice(index, start);

    const close = findMatchingParen(text, next.openAt);
    if (close === -1) {
      result += text.slice(start);
      break;
    }

    let end = close + 1;
    if (start < next.at && text[end] === ')') {
      end += 1;
    }

    const body = text.slice(next.openAt + 1, close);
    const rows = body.split('@').map((row) =>
      row
        .split('&')
        .map((cell) => unicodeCellToLatex(cell))
        .join(' & ')
    );
    result += `\\begin{pmatrix} ${rows.join(' \\\\ ')} \\end{pmatrix}`;
    index = end;
  }

  return result;
};

/** Converts a Word UnicodeMath line into LaTeX. */
export const unicodeMathLineToLatex = (line: string): string => {
  const withoutQuotes = stripWordMathQuotes(line);
  return replaceUnicodeMatrices(withoutQuotes).replace(/−/g, '-');
};

/** Unwrap $$...$$ or accept bare LaTeX math commands. */
export const extractLatexFromPlain = (plainText: string): string | undefined => {
  const trimmed = plainText.trim();
  if (!trimmed) {
    return undefined;
  }

  const dollarMatch = trimmed.match(DOLLAR_LATEX_RE);
  if (dollarMatch) {
    return dollarMatch[1].trim();
  }

  if (BARE_LATEX_RE.test(trimmed) && !trimmed.includes('<math')) {
    return trimmed;
  }

  return undefined;
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

/** Prefer KaTeX's original TeX annotation when present. */
export const extractLatexFromMathMl = (mathMl: string): string | undefined => {
  const annotationMatch = mathMl.match(
    /<annotation[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/i
  );
  if (annotationMatch) {
    return decodeHtmlEntities(annotationMatch[1].trim());
  }
  return undefined;
};

export const extractMathMlFromHtml = (html: string): string | undefined => {
  const match = html.match(/<math[\s\S]*?<\/math>/i);
  return match?.[0];
};

const getLocalName = (node: Element): string => {
  const name = node.localName || node.nodeName;
  return name.replace(/^.*:/, '').toLowerCase();
};

const OPERATOR_LATEX: Record<string, string> = {
  '×': '\\times',
  '⋅': '\\cdot',
  '−': '-',
  '–': '-',
  '—': '-',
  '=': '=',
  '+': '+',
  '-': '-',
  '(': '(',
  ')': ')',
  '[': '[',
  ']': ']',
  '|': '|',
  ',': ',',
};

const convertMathMlNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').trim();
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as Element;
  const tag = getLocalName(element);
  const children = Array.from(element.childNodes)
    .map((child) => convertMathMlNode(child))
    .filter(Boolean);

  switch (tag) {
    case 'math':
    case 'semantics':
    case 'mrow':
    case 'mstyle':
    case 'mpadded':
    case 'mphantom':
    case 'merror':
      return children.join('');
    case 'annotation':
    case 'annotation-xml':
      return '';
    case 'mi':
    case 'mn':
    case 'mtext':
      return (element.textContent ?? '').trim();
    case 'mo': {
      const op = (element.textContent ?? '').trim();
      return OPERATOR_LATEX[op] ?? op;
    }
    case 'mfrac': {
      const [numerator = '', denominator = ''] = children;
      return `\\frac{${numerator}}{${denominator}}`;
    }
    case 'msub': {
      const [base = '', sub = ''] = children;
      return `${base}_{${sub}}`;
    }
    case 'msup': {
      const [base = '', sup = ''] = children;
      return `${base}^{${sup}}`;
    }
    case 'msubsup': {
      const [base = '', sub = '', sup = ''] = children;
      return `${base}_{${sub}}^{${sup}}`;
    }
    case 'mtable': {
      const rows = Array.from(element.children)
        .filter((child) => getLocalName(child) === 'mtr')
        .map((row) =>
          Array.from(row.children)
            .filter((cell) => getLocalName(cell) === 'mtd')
            .map((cell) => convertMathMlNode(cell))
            .join(' & ')
        );
      return `\\begin{pmatrix} ${rows.join(' \\\\ ')} \\end{pmatrix}`;
    }
    case 'mtr':
    case 'mtd':
      return children.join(' ');
    case 'mspace':
      return ' ';
    default:
      return children.join('');
  }
};

/**
 * Converts Presentation MathML into LaTeX for common KaTeX/Word equation nodes.
 * Prefer extractLatexFromMathMl when an x-tex annotation exists.
 */
export const mathMlToLatex = (mathMl: string): string | undefined => {
  const annotated = extractLatexFromMathMl(mathMl);
  if (annotated) {
    return annotated;
  }

  if (typeof DOMParser === 'undefined') {
    return undefined;
  }

  try {
    const doc = new DOMParser().parseFromString(mathMl, 'text/html');
    const math = doc.querySelector('math');
    if (!math) {
      return undefined;
    }
    const latex = convertMathMlNode(math).replace(/\s+/g, ' ').trim();
    return latex || undefined;
  } catch {
    return undefined;
  }
};

const ommlChildren = (element: Element, localName: string): Element[] =>
  Array.from(element.children).filter((child) => getLocalName(child) === localName);

const ommlFirst = (element: Element, localName: string): Element | undefined =>
  ommlChildren(element, localName)[0];

const isOmmlPropertyTag = (localName: string): boolean =>
  localName.endsWith('pr') || localName === 'ctrlpr' || localName === 'argpr';

/** Converts Word OMML (Office Math Markup Language) nodes into LaTeX. */
export const ommlNodeToLatex = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as Element;
  const tag = getLocalName(element);
  if (isOmmlPropertyTag(tag)) {
    return '';
  }

  const childLatex = (): string =>
    Array.from(element.childNodes)
      .map((child) => ommlNodeToLatex(child))
      .join('');

  switch (tag) {
    case 'omath':
    case 'omathpara':
    case 'e':
    case 'r':
    case 'box':
    case 'borderbox':
    case 'eqarr':
      return childLatex();
    case 't':
      return (element.textContent ?? '').replace(/\u00a0/g, ' ');
    case 'f': {
      const num = ommlFirst(element, 'num');
      const den = ommlFirst(element, 'den');
      return `\\frac{${num ? ommlNodeToLatex(num) : ''}}{${den ? ommlNodeToLatex(den) : ''}}`;
    }
    case 'num':
    case 'den':
    case 'sub':
    case 'sup':
      return childLatex();
    case 'ssub': {
      const base = ommlFirst(element, 'e');
      const sub = ommlFirst(element, 'sub');
      return `${base ? ommlNodeToLatex(base) : ''}_{${sub ? ommlNodeToLatex(sub) : ''}}`;
    }
    case 'ssup': {
      const base = ommlFirst(element, 'e');
      const sup = ommlFirst(element, 'sup');
      return `${base ? ommlNodeToLatex(base) : ''}^{${sup ? ommlNodeToLatex(sup) : ''}}`;
    }
    case 'ssubsup': {
      const base = ommlFirst(element, 'e');
      const sub = ommlFirst(element, 'sub');
      const sup = ommlFirst(element, 'sup');
      return `${base ? ommlNodeToLatex(base) : ''}_{${sub ? ommlNodeToLatex(sub) : ''}}^{${
        sup ? ommlNodeToLatex(sup) : ''
      }}`;
    }
    case 'rad': {
      const deg = ommlFirst(element, 'deg');
      const base = ommlFirst(element, 'e');
      const degLatex = deg ? ommlNodeToLatex(deg).trim() : '';
      const baseLatex = base ? ommlNodeToLatex(base) : '';
      if (degLatex) {
        return `\\sqrt[${degLatex}]{${baseLatex}}`;
      }
      return `\\sqrt{${baseLatex}}`;
    }
    case 'm': {
      const rows = ommlChildren(element, 'mr').map((row) =>
        ommlChildren(row, 'e')
          .map((cell) => ommlNodeToLatex(cell).trim())
          .join(' & ')
      );
      return `\\begin{pmatrix} ${rows.join(' \\\\ ')} \\end{pmatrix}`;
    }
    case 'mr':
      return ommlChildren(element, 'e')
        .map((cell) => ommlNodeToLatex(cell).trim())
        .join(' & ');
    case 'd': {
      // Delimiter often wraps a matrix; keep inner math and avoid double parens
      // around pmatrix (KaTeX already draws stretchy brackets).
      const inner = ommlChildren(element, 'e')
        .map((child) => ommlNodeToLatex(child))
        .join('')
        .trim();
      if (/\\begin\{pmatrix\}/.test(inner)) {
        return inner;
      }
      const props = ommlFirst(element, 'dpr');
      const beg = props ? ommlFirst(props, 'begchr')?.textContent?.trim() || '(' : '(';
      const end = props ? ommlFirst(props, 'endchr')?.textContent?.trim() || ')' : ')';
      return `${beg}${inner}${end}`;
    }
    case 'nary': {
      const naryPr = ommlFirst(element, 'narypr');
      const chr = naryPr ? ommlFirst(naryPr, 'chr')?.textContent?.trim() || '\\sum' : '\\sum';
      const sub = ommlFirst(element, 'sub');
      const sup = ommlFirst(element, 'sup');
      const body = ommlFirst(element, 'e');
      const op = chr === '∑' ? '\\sum' : chr === '∫' ? '\\int' : chr;
      return `${op}_{${sub ? ommlNodeToLatex(sub) : ''}}^{${sup ? ommlNodeToLatex(sup) : ''}}{${
        body ? ommlNodeToLatex(body) : ''
      }}`;
    }
    case 'func': {
      const name = ommlFirst(element, 'fname');
      const arg = ommlFirst(element, 'e');
      // Avoid \left/\right so the ASCII dialect can keep det(...) editable.
      return `${name ? ommlNodeToLatex(name) : ''}(${arg ? ommlNodeToLatex(arg) : ''})`;
    }
    case 'fname':
      return childLatex();
    default:
      return childLatex();
  }
};

export const ommlToLatex = (ommlRoot: Element): string | undefined => {
  const latex = ommlNodeToLatex(ommlRoot).replace(/\s+/g, ' ').trim();
  return latex || undefined;
};

const OMML_BLOCK_RE =
  /<(?:[a-zA-Z]+:)?oMathPara\b[\s\S]*?<\/(?:[a-zA-Z]+:)?oMathPara>|<(?:[a-zA-Z]+:)?oMath\b[\s\S]*?<\/(?:[a-zA-Z]+:)?oMath>/gi;

/**
 * Parse an OMML fragment as XML. HTML parsing mangles nested `m:mr` / `m:f` nodes
 * and drops matrix rows, so clipboard OMML must be read with the XML parser.
 */
export const ommlXmlToLatex = (ommlFragment: string): string | undefined => {
  if (typeof DOMParser === 'undefined' || !ommlFragment.trim()) {
    return undefined;
  }

  try {
    const hasNamespace = /xmlns:m=|xmlns=/.test(ommlFragment);
    const wrapped = hasNamespace
      ? ommlFragment
      : ommlFragment.replace(
          /<((?:[a-zA-Z]+:)?oMath(?:Para)?)\b/i,
          '<$1 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns="http://schemas.openxmlformats.org/officeDocument/2006/math"'
        );
    const doc = new DOMParser().parseFromString(wrapped, 'application/xml');
    if (doc.querySelector('parsererror')) {
      return undefined;
    }
    return ommlToLatex(doc.documentElement);
  } catch {
    return undefined;
  }
};

/** Replace OMML blocks with placeholder spans and return their LaTeX. */
const replaceOmmlWithPlaceholders = (html: string): { html: string; latexById: string[] } => {
  const latexById: string[] = [];
  const nextHtml = html.replace(OMML_BLOCK_RE, (fragment) => {
    const latex = ommlXmlToLatex(fragment) ?? '';
    const id = latexById.length;
    latexById.push(latex);
    return `<span data-afb-omml="${id}"></span>`;
  });
  return { html: nextHtml, latexById };
};

/** Private-use separator so block normalization cannot flatten matrix rows. */
const MATRIX_ROW_SEP = '\uE000';

const latexToInsertableText = (latex: string): string => {
  const ascii = latexToBuilderAscii(latex);
  const text = fracLatexToAscii(ascii ?? `$$${fracLatexToAscii(latex)}$$`);
  return text.replace(/\n/g, MATRIX_ROW_SEP);
};

const restoreMatrixRowBreaks = (text: string): string =>
  text.replace(new RegExp(MATRIX_ROW_SEP, 'g'), '\n');

const mathScore = (text: string): number => {
  let score = 0;
  score += (text.match(/\\begin\{pmatrix\}/g) ?? []).length * 4;
  score += (text.match(/\[[^\n\]]*\]/g) ?? []).length * 2;
  score += (text.match(/■\s*\(/g) ?? []).length * 3;
  score += (text.match(/\$\$/g) ?? []).length;
  score += (text.match(/\\frac\{/g) ?? []).length * 2;
  score += (text.match(/\([^()\n]+\)\s*\/\s*\([^()\n]+\)/g) ?? []).length * 2;
  score += (text.match(/[λΛ]/g) ?? []).length;
  return score;
};

export const readClipboardMath = (clipboardData: DataTransfer): ClipboardMathRead => {
  const plainText = clipboardData.getData('text/plain') ?? '';
  const html = clipboardData.getData('text/html') ?? '';
  const mathMl = extractMathMlFromHtml(html);
  const latexFromPlain = extractLatexFromPlain(plainText);
  const latexFromMath = mathMl ? mathMlToLatex(mathMl) : undefined;

  return {
    plainText,
    mathMl,
    latex: latexFromPlain ?? latexFromMath,
  };
};

export const hasUnsupportedLatex = (latex: string): boolean => {
  const stripped = latex
    .replace(/\\begin\{pmatrix\}/g, ' ')
    .replace(/\\end\{pmatrix\}/g, ' ')
    .replace(/\\frac\{/g, ' ')
    .replace(/\\text\{[^}]*\}/g, ' ')
    .replace(/\\mathrm\{[^}]*\}/g, ' ')
    .replace(/\\operatorname\{[^}]*\}/g, ' ')
    .replace(/\\left/g, ' ')
    .replace(/\\right/g, ' ')
    .replace(/\\times/g, ' ')
    .replace(/\\[\\{}]/g, ' ');

  return /\\[a-zA-Z]+/.test(stripped);
};

/** Converts LaTeX `\frac` (including signed `-\frac{}{}`) into builder `(num)/(den)`. */
export const fracLatexToAscii = (value: string): string => {
  let current = value.replace(/−/g, '-');
  let previous = '';
  while (current !== previous) {
    previous = current;
    current = current.replace(
      /([+-])?\s*\\frac\{([^{}]+)\}\{([^{}]+)\}/g,
      (_match, sign: string | undefined, numerator: string, denominator: string) => {
        const num = fracLatexToAscii(numerator);
        const den = fracLatexToAscii(denominator);
        // Keep the sign inside the numerator so matrix cells stay `(-1)/(2)` shaped.
        if (sign === '-') {
          return num.startsWith('-') ? `(${num.slice(1)})/(${den})` : `(-${num})/(${den})`;
        }
        return `(${num})/(${den})`;
      }
    );
  }
  // Clean up "- (1)/(2)" shapes produced when a sign run was separated by spaces.
  return current.replace(
    /([+-])\s+\(([^()\n]+)\)\s*\/\s*\(([^()\n]+)\)/g,
    (_match, sign: string, numerator: string, denominator: string) => {
      if (sign === '-') {
        return numerator.startsWith('-')
          ? `(${numerator.slice(1)})/(${denominator})`
          : `(-${numerator})/(${denominator})`;
      }
      return `(${numerator})/(${denominator})`;
    }
  );
};

const latexCellToAscii = (cell: string): string => {
  const trimmed = fracLatexToAscii(cell.trim());
  if (!trimmed) {
    return '';
  }

  const fracMatch = trimmed.match(/^\(([^()\n]+)\)\/\(([^()\n]+)\)$/);
  if (fracMatch) {
    return `(${latexCellToAscii(fracMatch[1])})/(${latexCellToAscii(fracMatch[2])})`;
  }

  const subMatch = trimmed.match(/^([A-Za-zα-ωΑ-Ω]+)_\{(\d+)\}$/u);
  if (subMatch) {
    return `${subMatch[1]}${subMatch[2]}`;
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return latexCellToAscii(trimmed.slice(1, -1));
  }

  return trimmed;
};

const parsePmatrixBody = (body: string): string[][] | null => {
  const rows = body
    .split(/\s*\\\\\s*/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (!rows.length) {
    return null;
  }

  return rows.map((row) => row.split(/\s*&\s*/).map(latexCellToAscii));
};

type LatexPiece =
  | { kind: 'matrix'; rows: string[][] }
  | { kind: 'op'; op: string }
  | { kind: 'text'; text: string };

const readBraceGroup = (source: string, start: number): { content: string; end: number } | null => {
  if (source[start] !== '{') {
    return null;
  }

  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
    } else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          content: source.slice(start + 1, index),
          end: index + 1,
        };
      }
    }
  }

  return null;
};

const tokenizeLatexForAscii = (latex: string): LatexPiece[] | null => {
  const pieces: LatexPiece[] = [];
  let index = 0;
  const source = latex.trim();

  while (index < source.length) {
    while (source[index] === ' ') {
      index += 1;
    }
    if (index >= source.length) {
      break;
    }

    if (source.startsWith('\\begin{pmatrix}', index)) {
      const start = index + '\\begin{pmatrix}'.length;
      const end = source.indexOf('\\end{pmatrix}', start);
      if (end === -1) {
        return null;
      }
      const body = source.slice(start, end).trim();
      const rows = parsePmatrixBody(body);
      if (!rows) {
        return null;
      }
      pieces.push({ kind: 'matrix', rows });
      index = end + '\\end{pmatrix}'.length;
      continue;
    }

    if (source.startsWith('\\text{', index)) {
      const group = readBraceGroup(source, index + '\\text'.length);
      if (!group) {
        return null;
      }
      pieces.push({ kind: 'text', text: group.content });
      index = group.end;
      continue;
    }

    if (source.startsWith('\\times', index)) {
      pieces.push({ kind: 'op', op: '×' });
      index += '\\times'.length;
      continue;
    }

    if (source.startsWith('\\frac', index)) {
      const numerator = readBraceGroup(source, index + '\\frac'.length);
      if (!numerator) {
        return null;
      }
      const denominator = readBraceGroup(source, numerator.end);
      if (!denominator) {
        return null;
      }
      pieces.push({
        kind: 'text',
        text: `(${latexCellToAscii(numerator.content)})/(${latexCellToAscii(denominator.content)})`,
      });
      index = denominator.end;
      continue;
    }

    const char = source[index];
    if (char === '=' || char === '+' || char === '-' || char === '×' || char === '*') {
      pieces.push({ kind: 'op', op: char === '*' ? '×' : char });
      index += 1;
      continue;
    }

    const plainMatch = source.slice(index).match(/^[A-Za-z0-9α-ωΑ-ΩλΛ]+/u);
    if (plainMatch) {
      pieces.push({ kind: 'text', text: plainMatch[0] });
      index += plainMatch[0].length;
      continue;
    }

    // Preserve Word list bullets / punctuation around math so mixed lines still convert.
    const proseMatch = source.slice(index).match(/^[^\\=+\-×*]+/u);
    if (proseMatch) {
      const prose = proseMatch[0].trim();
      if (prose) {
        pieces.push({ kind: 'text', text: prose });
      }
      index += proseMatch[0].length;
      continue;
    }

    return null;
  }

  return pieces.length ? pieces : null;
};

const formatMatrixLines = (rows: string[][]): string[] =>
  rows.map((row) => `[ ${row.join('  ')} ]`);

const combineAlignedColumns = (columns: string[][]): string => {
  const rowCount = Math.max(...columns.map((col) => col.length), 0);
  const widths = columns.map((col) => Math.max(...col.map((line) => line.length), 0));

  return Array.from({ length: rowCount }, (_, rowIndex) =>
    columns
      .map((col, colIndex) => {
        const line = (col[rowIndex] ?? '').padEnd(widths[colIndex], ' ');
        const gap = colIndex === columns.length - 1 ? '' : '   ';
        return `${line}${gap}`;
      })
      .join('')
      .trimEnd()
  ).join('\n');
};

/**
 * Converts supported LaTeX (pmatrix / frac / labels / ops) into builder ASCII.
 * Returns null when the expression uses unsupported constructs.
 */
export const latexToBuilderAscii = (latex: string): string | null => {
  const normalized = latex.replace(/\s+/g, ' ').trim();
  if (!normalized || hasUnsupportedLatex(normalized)) {
    return null;
  }

  const pieces = tokenizeLatexForAscii(normalized);
  if (!pieces) {
    return null;
  }

  if (!pieces.some((piece) => piece.kind === 'matrix')) {
    return pieces
      .map((piece) => {
        if (piece.kind === 'op') {
          return piece.op;
        }
        if (piece.kind === 'text') {
          return piece.text;
        }
        return '';
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  type Column = {
    prefixFirstLine: string;
    rows: string[][];
  };

  const columns: Column[] = [];
  let pendingPrefix = '';

  for (const piece of pieces) {
    if (piece.kind === 'text') {
      pendingPrefix += (pendingPrefix ? ' ' : '') + piece.text;
      continue;
    }
    if (piece.kind === 'op') {
      pendingPrefix += (pendingPrefix ? ' ' : '') + piece.op;
      continue;
    }

    const prefix = pendingPrefix ? `${pendingPrefix.replace(/\s+$/u, '')} ` : '';
    pendingPrefix = '';
    columns.push({ prefixFirstLine: prefix, rows: piece.rows });
  }

  if (!columns.length) {
    return pendingPrefix.trim() || null;
  }

  const formattedColumns = columns.map((column) => {
    const lines = formatMatrixLines(column.rows);
    const prefix = column.prefixFirstLine;
    // Always indent continuation rows so the preview keeps 2x2 matrices together
    // even when labels sit outside the OMML equation node.
    const continuationIndent = prefix ? ' '.repeat(prefix.length) : '    ';
    return lines.map((line, index) =>
      index === 0 ? `${prefix}${line}` : `${continuationIndent}${line}`
    );
  });

  if (formattedColumns.length === 1) {
    return formattedColumns[0].join('\n');
  }

  return combineAlignedColumns(formattedColumns);
};

/**
 * Converts Word UnicodeMath plain text into builder ASCII (or $$latex$$ per line
 * when a line cannot be represented in the ASCII dialect).
 * Preserves list markers and leading indentation around converted math.
 */
export const unicodeMathToBuilderText = (text: string): string => {
  const lines = normalizePlainListIndent(text).split('\n');

  return lines
    .map((line) => {
      if (!line.trim()) {
        return '';
      }

      const { indent, marker, rest } = splitListPrefix(line);

      if (!hasUnicodeMath(rest) && !hasUnicodeMath(line)) {
        return stripWordMathQuotes(line);
      }

      const latex = unicodeMathLineToLatex(rest);
      const ascii = latexToBuilderAscii(latex);
      if (ascii) {
        const asciiLines = ascii.split('\n');
        return asciiLines
          .map((asciiLine, index) =>
            index === 0
              ? `${indent}${marker}${asciiLine}`
              : `${indent}${' '.repeat(marker.length)}${asciiLine}`
          )
          .join('\n');
      }

      return `${indent}${marker}$$${latex.trim()}$$`;
    })
    .join('\n');
};

/**
 * Resolves clipboard contents into text to insert into the equation builder.
 * Prefers editable ASCII, then $$latex$$, then raw plain text.
 */
export const resolvePastePayload = ({
  latex,
  plainText,
}: {
  latex?: string;
  plainText: string;
}): PasteResolution => {
  if (latex) {
    const ascii = latexToBuilderAscii(latex);
    if (ascii) {
      return { text: ascii, kind: 'ascii' };
    }
    return { text: `$$${latex}$$`, kind: 'latex' };
  }

  if (hasUnicodeMath(plainText)) {
    return { text: unicodeMathToBuilderText(plainText), kind: 'ascii' };
  }

  return { text: plainText, kind: 'plain' };
};

const extractAlignFromElement = (element: Element): TextAlign => {
  const style = element.getAttribute('style') ?? '';
  const styleMatch = style.match(/text-align\s*:\s*([a-z]+)/i);
  return (
    parseCssTextAlign(styleMatch?.[1]) ?? parseCssTextAlign(element.getAttribute('align')) ?? 'left'
  );
};

const isWordLikeHtml = (html: string): boolean =>
  /mso-|MsoNormal|MsoList|text-align\s*:/i.test(html) ||
  /mso-list/i.test(html) ||
  /<[ou]l[\s>]/i.test(html) ||
  /oMath/i.test(html) ||
  /<math[\s\S]*?<\/math>/i.test(html);

/** Word hides list glyphs / equations in conditional comments — unwrap for DOMParser. */
const unwrapWordConditionals = (html: string): string => {
  const unwrapIfUseful = (match: string, content: string): string => {
    if (/oMath/i.test(content) || /mso-list\s*:\s*Ignore/i.test(content)) {
      return content;
    }
    return match;
  };

  return (
    html
      // List bullets (`<!--[if !supportLists]>...<![endif]-->` and comment variants)
      .replace(/<!--\[if\s*!supportLists\]-->([\s\S]*?)<!--\[endif\]-->/gi, '$1')
      .replace(/<!--\[if\s*!supportLists\]>([\s\S]*?)<!\[endif\]-->/gi, '$1')
      .replace(/<!\[if\s*!supportLists\]>([\s\S]*?)<!\[endif\]>/gi, '$1')
      // Professional equations (OMML) — Word uses msEquation conditionals
      .replace(/<!--\[if\s+gte\s+msEquation[^]]*\]-->([\s\S]*?)<!--\[endif\]-->/gi, '$1')
      .replace(/<!--\[if\s+gte\s+msEquation[^]]*\]>([\s\S]*?)<!\[endif\]-->/gi, '$1')
      .replace(/<!\[if\s+gte\s+msEquation[^]]*\]>([\s\S]*?)<!\[endif\]>/gi, '$1')
      // Any remaining conditional that carries OMML or list markers
      .replace(/<!--\[if[^\]]*\]-->([\s\S]*?)<!--\[endif\]-->/gi, unwrapIfUseful)
      .replace(/<!--\[if[^\]]*\]>([\s\S]*?)<!\[endif\]-->/gi, unwrapIfUseful)
      .replace(/<!\[if[^\]]*\]>([\s\S]*?)<!\[endif\]>/gi, unwrapIfUseful)
      // Drop image fallbacks used when HTML consumers don't support equations
      .replace(/<!--\[if\s*!msEquation\]-->([\s\S]*?)<!--\[endif\]-->/gi, '')
      .replace(/<!--\[if\s*!msEquation\]>([\s\S]*?)<!\[endif\]-->/gi, '')
      .replace(/<!\[if\s*!msEquation\]>([\s\S]*?)<!\[endif\]>/gi, '')
  );
};

const parseStyleDeclaration = (style: string): Record<string, string> => {
  const result: Record<string, string> = {};
  style.split(';').forEach((part) => {
    const [key, ...rest] = part.split(':');
    if (!key || !rest.length) {
      return;
    }
    result[key.trim().toLowerCase()] = rest.join(':').trim();
  });
  return result;
};

const parseLengthToPt = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const match = value.match(/^([-.\d]+)\s*(pt|px|in|cm|mm|em)?$/i);
  if (!match) {
    return null;
  }
  const num = Number.parseFloat(match[1]);
  if (Number.isNaN(num)) {
    return null;
  }
  const unit = (match[2] ?? 'pt').toLowerCase();
  switch (unit) {
    case 'px':
      return num * 0.75;
    case 'in':
      return num * 72;
    case 'cm':
      return num * 28.35;
    case 'mm':
      return num * 2.835;
    case 'em':
      return num * 12;
    default:
      return num;
  }
};

const getMsoListLevel = (element: Element): number | null => {
  const style = element.getAttribute('style') ?? '';
  const match = style.match(/mso-list\s*:\s*[^;]*\blevel(\d+)/i);
  if (!match) {
    return null;
  }
  return Math.max(0, Number.parseInt(match[1], 10) - 1);
};

const getNestedListDepth = (element: Element): number => {
  let depth = 0;
  let node: Element | null = element.parentElement;
  while (node) {
    if (node.tagName === 'UL' || node.tagName === 'OL') {
      depth += 1;
    }
    node = node.parentElement;
  }
  return Math.max(0, depth - 1);
};

const getIndentLevel = (element: Element): number => {
  const msoLevel = getMsoListLevel(element);
  if (msoLevel !== null) {
    return msoLevel;
  }

  const styles = parseStyleDeclaration(element.getAttribute('style') ?? '');
  const marginPt = parseLengthToPt(styles['margin-left']);
  if (marginPt !== null && marginPt >= 18) {
    return Math.max(0, Math.round(marginPt / 36) - 1);
  }

  if (element.tagName === 'LI') {
    return getNestedListDepth(element);
  }

  const listParent = element.closest('li');
  if (listParent) {
    return getNestedListDepth(listParent);
  }

  return 0;
};

const isListElement = (element: Element): boolean => {
  if (element.tagName === 'LI') {
    return true;
  }
  const style = element.getAttribute('style') ?? '';
  const className = element.getAttribute('class') ?? '';
  if (/mso-list\s*:/i.test(style) || /MsoList/i.test(className) || Boolean(element.closest('li'))) {
    return true;
  }
  // Word sometimes keeps list indentation without an Ignore bullet span.
  const marginPt = parseLengthToPt(parseStyleDeclaration(style)['margin-left']);
  return marginPt !== null && marginPt >= 18 && /Mso/i.test(className);
};

const extractListMarkerFromElement = (element: Element): string | null => {
  const ignore = element.querySelector(
    '[style*="mso-list:Ignore"], [style*="mso-list: Ignore"], [style*="mso-list:ignore"]'
  );
  if (ignore) {
    const raw = (ignore.textContent ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const match = raw.match(/^(?:[•○●■◦▪▫‣∙\-–—*]|o|\d+\.)/);
    if (match) {
      const marker = match[0];
      return /^\d+\.$/.test(marker) ? `${marker} ` : `${marker} `;
    }
  }
  return null;
};

/** Word outline glyphs by nesting level when the clipboard omits the bullet span. */
const WORD_LIST_GLYPHS_BY_LEVEL = ['- ', 'o ', '■ ', '• ', 'o '] as const;

const defaultMarkerForElement = (element: Element, indentLevel = 0): string => {
  const li = element.tagName === 'LI' ? element : element.closest('li');
  const listParent = li?.parentElement;
  if (listParent?.tagName === 'OL') {
    const items = Array.from(listParent.children).filter((child) => child.tagName === 'LI');
    const index = li ? items.indexOf(li) + 1 : 1;
    return `${Math.max(index, 1)}. `;
  }
  return WORD_LIST_GLYPHS_BY_LEVEL[
    Math.min(Math.max(indentLevel, 0), WORD_LIST_GLYPHS_BY_LEVEL.length - 1)
  ];
};

const contentKeyForListMatch = (line: string): string =>
  splitListPrefix(line)
    .rest.replace(/\[[^\]]*\]/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48)
    .toLowerCase();

/**
 * Copies indent + bullet prefixes from plain Word text onto HTML-converted lines
 * when the HTML path kept better math but dropped list markers.
 */
export const transferListPrefixesFromPlain = (htmlText: string, plainText: string): string => {
  const sourceLines = normalizePlainListIndent(plainText)
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const { indent, marker, rest } = splitListPrefix(line);
      return {
        indent,
        marker,
        key: contentKeyForListMatch(rest),
      };
    })
    .filter((entry) => entry.marker || entry.indent);

  if (!sourceLines.length) {
    return htmlText;
  }

  let sourceIndex = 0;
  return htmlText
    .split('\n')
    .map((line) => {
      if (!line.trim()) {
        return line;
      }
      // Matrix continuation rows should not receive a new bullet.
      if (/^\s*\[[^\]]*\](?:\s+\[[^\]]*\])*\s*$/.test(line)) {
        return line;
      }

      const existing = splitListPrefix(line);
      if (existing.marker) {
        sourceIndex += 1;
        return line;
      }

      const key = contentKeyForListMatch(existing.rest);
      let chosen = sourceLines[sourceIndex];
      if (key) {
        const matchIndex = sourceLines.findIndex(
          (entry, index) =>
            index >= sourceIndex &&
            entry.key &&
            (entry.key.includes(key.slice(0, 16)) || key.includes(entry.key.slice(0, 16)))
        );
        if (matchIndex >= 0) {
          chosen = sourceLines[matchIndex];
          sourceIndex = matchIndex + 1;
        } else if (chosen) {
          sourceIndex += 1;
        }
      } else if (chosen) {
        sourceIndex += 1;
      }

      if (!chosen || (!chosen.marker && !chosen.indent)) {
        return line;
      }

      return `${chosen.indent}${chosen.marker}${existing.rest.replace(/^\s+/, '')}`;
    })
    .join('\n');
};

const TAG_INLINE_FORMAT: Partial<Record<string, InlineFormat>> = {
  B: 'bold',
  STRONG: 'bold',
  I: 'italic',
  EM: 'italic',
  U: 'underline',
  SUP: 'superscript',
  SUB: 'subscript',
};

const formatsFromElement = (element: Element): InlineFormat[] => {
  const formats: InlineFormat[] = [];
  const tagFormat = TAG_INLINE_FORMAT[element.tagName];
  if (tagFormat) {
    formats.push(tagFormat);
  }
  const style = element.getAttribute('style') ?? '';
  if (/font-weight\s*:\s*(bold|[7-9]00)/i.test(style)) {
    formats.push('bold');
  }
  if (/font-style\s*:\s*italic/i.test(style)) {
    formats.push('italic');
  }
  if (/text-decoration\s*:[^;]*underline/i.test(style)) {
    formats.push('underline');
  }
  if (/vertical-align\s*:\s*super/i.test(style)) {
    formats.push('superscript');
  }
  if (/vertical-align\s*:\s*sub/i.test(style)) {
    formats.push('subscript');
  }
  return formats;
};

const wrapWithFormats = (text: string, formats: InlineFormat[]): string => {
  if (!text.trim() || !formats.length) {
    return text;
  }
  return [...new Set(formats)].reduce(
    (value, format) => `${openTag(format)}${value}${closeTag(format)}`,
    text
  );
};

const isMsoListIgnore = (element: Element): boolean =>
  /mso-list\s*:\s*Ignore/i.test(element.getAttribute('style') ?? '');

const isBuilderMathText = (text: string): boolean =>
  hasUnicodeMath(text) ||
  /\$\$/.test(text) ||
  /\\begin\{pmatrix\}/.test(text) ||
  /\[[^\n\]]*\]/.test(text) ||
  /\([^()\n]+\)\s*\/\s*\([^()\n]+\)/.test(text);

const serializeRichText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    // Collapse HTML-source whitespace; explicit <br> handles real line breaks.
    return (node.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as Element;
  const localName = getLocalName(element);

  if (element.tagName === 'BR') {
    return '\n';
  }
  if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
    return '';
  }
  if (isMsoListIgnore(element)) {
    return '';
  }

  if (localName === 'math') {
    const latex = mathMlToLatex(element.outerHTML);
    if (!latex) {
      return (element.textContent ?? '').replace(/\u00a0/g, ' ');
    }
    return latexToInsertableText(latex);
  }

  // Word professional equations use OMML (`m:oMath` / `oMath`).
  if (localName === 'omath' || localName === 'omathpara') {
    const latex = ommlXmlToLatex(element.outerHTML) ?? ommlToLatex(element);
    if (!latex) {
      return (element.textContent ?? '').replace(/\u00a0/g, ' ');
    }
    return latexToInsertableText(latex);
  }

  const ommlPlaceholderId = element.getAttribute('data-afb-omml');
  if (ommlPlaceholderId !== null) {
    return '';
  }

  const inner = Array.from(element.childNodes).map(serializeRichText).join('');
  let formats = formatsFromElement(element);
  // Word italicizes math runs by default — don't wrap converted equations in {{i}}.
  if (formats.includes('italic') && isBuilderMathText(inner)) {
    formats = formats.filter((format) => format !== 'italic');
  }
  return wrapWithFormats(inner, formats);
};

const isHtmlBlockCandidate = (element: Element): boolean => {
  const tag = element.tagName;
  if (!['P', 'H1', 'H2', 'H3', 'H4', 'LI', 'TD', 'DIV'].includes(tag)) {
    return false;
  }
  if (tag === 'DIV' && element.querySelector('p, li, div, h1, h2, h3, h4')) {
    return false;
  }
  // Prefer inner paragraphs so `li > p` is not duplicated.
  if (tag === 'LI' && element.querySelector('p')) {
    return false;
  }
  return true;
};

type HtmlChunk = { text: string; isList: boolean; isBlank: boolean };

/**
 * Preserve real line breaks (matrix rows / `<br>` / separate equations).
 * Only normalizes tabs and leftover `\frac` inside matrix cells.
 */
const normalizeBlockRichText = (text: string): string => {
  const withBreaks = restoreMatrixRowBreaks(text);
  const sanitized = withBreaks
    .split(/(\[[^\]]*\])/g)
    .map((part) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return fracLatexToAscii(part);
      }
      // Keep alignment padding and newlines; only normalize tabs.
      return part.replace(/\t/g, ' ');
    })
    .join('');
  return fracLatexToAscii(sanitized)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const blockContainsMath = (element: Element): boolean => {
  const nodes = Array.from(element.querySelectorAll('*'));
  return nodes.some((node) => {
    const local = getLocalName(node);
    return local === 'omath' || local === 'omathpara' || local === 'math';
  });
};

const textToLatexTextCommand = (text: string): string => {
  const normalized = text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) {
    return '';
  }
  // \text{} cannot contain unescaped braces; strip rare control chars from Word.
  const safe = normalized.replace(/[{}]/g, '');
  return `\\text{${safe}}`;
};

/** Convert one visual line of mixed text/OMML LaTeX into builder ASCII. */
const mixedLatexLineToBuilderText = (line: string): string => {
  const cleaned = line.replace(/\\text\{\s*\}/g, '').trim();
  if (!cleaned) {
    return '';
  }
  const ascii = latexToBuilderAscii(cleaned);
  if (ascii) {
    return ascii.replace(/\n/g, MATRIX_ROW_SEP);
  }
  return `$$${cleaned}$$`;
};

/**
 * Converts a whole HTML block (labels + OMML/MathML) into builder text.
 * Side-by-side matrices on the same Word line stay aligned; line breaks (`<br>`,
 * newlines) start a new math line so separate equations are not merged.
 */
const serializeMathBlockToBuilderText = (
  element: Element,
  ommlLatexById: string[] = []
): string => {
  const latexParts: string[] = [];

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Collapse HTML-source whitespace; only explicit <br> creates a new math line.
      const latexText = textToLatexTextCommand(node.textContent ?? '');
      if (latexText) {
        latexParts.push(latexText);
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const el = node as Element;
    const local = getLocalName(el);
    if (el.tagName === 'BR') {
      latexParts.push('\n');
      return;
    }
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || isMsoListIgnore(el)) {
      return;
    }

    const ommlId = el.getAttribute('data-afb-omml');
    if (ommlId !== null) {
      const latex = ommlLatexById[Number(ommlId)] ?? '';
      if (latex) {
        latexParts.push(latex);
      }
      return;
    }

    if (local === 'math') {
      const latex = mathMlToLatex(el.outerHTML);
      if (latex) {
        latexParts.push(latex);
      }
      return;
    }
    if (local === 'omath' || local === 'omathpara') {
      // Prefer XML-converted latex when available; DOM-parsed OMML is unreliable.
      const latex = ommlXmlToLatex(el.outerHTML) ?? ommlToLatex(el);
      if (latex) {
        latexParts.push(latex);
      }
      return;
    }

    Array.from(el.childNodes).forEach(walk);
  };

  walk(element);
  const mixedLatex = latexParts.join('');
  if (!mixedLatex.replace(/\\text\{\s*\}/g, '').trim()) {
    return '';
  }

  // Convert each visual line separately. Combining every matrix in the paragraph
  // into one aligned block was merging distinct equations onto one line.
  const lineResults = mixedLatex
    .split('\n')
    .map((line) => mixedLatexLineToBuilderText(line))
    .filter(Boolean);

  if (lineResults.length) {
    return lineResults.join(MATRIX_ROW_SEP);
  }

  // Fall back to piecewise conversion when the mixed line uses unsupported LaTeX.
  return serializeRichText(element);
};

const joinHtmlChunks = (chunks: HtmlChunk[]): string => {
  let result = '';
  chunks.forEach((chunk, index) => {
    if (index === 0) {
      result = chunk.isBlank ? '' : chunk.text;
      return;
    }
    const previous = chunks[index - 1];
    if (chunk.isBlank) {
      result += '\n\n';
      return;
    }
    if (previous.isBlank) {
      result += chunk.text;
      return;
    }
    if (chunk.isList && previous.isList) {
      result += `\n${chunk.text}`;
      return;
    }
    result += `\n\n${chunk.text}`;
  });
  return result.replace(/^\n+/, '').replace(/\n+$/, '');
};

/**
 * Reads Word HTML paragraphs/lists and rebuilds builder text with alignment,
 * list markers, indentation, and basic inline formatting preserved.
 */
export const htmlToAlignedBuilderText = (html: string): string | null => {
  if (typeof DOMParser === 'undefined' || !html.trim() || !isWordLikeHtml(html)) {
    return null;
  }

  try {
    const unwrappedHtml = unwrapWordConditionals(html);
    const { html: preparedHtml, latexById: ommlLatexById } =
      replaceOmmlWithPlaceholders(unwrappedHtml);
    const doc = new DOMParser().parseFromString(preparedHtml, 'text/html');
    const candidates = Array.from(
      doc.body.querySelectorAll('p, h1, h2, h3, h4, li, td, div')
    ).filter(isHtmlBlockCandidate);
    const chunks: HtmlChunk[] = [];
    let sawNonLeftAlign = false;
    let sawMath = false;
    let sawList = false;
    let sawInlineFormat = false;

    candidates.forEach((element) => {
      const listItem = isListElement(element);
      const hasOmmlPlaceholder = Boolean(element.querySelector('[data-afb-omml]'));
      const rawSerialized =
        blockContainsMath(element) || hasOmmlPlaceholder
          ? serializeMathBlockToBuilderText(element, ommlLatexById)
          : serializeRichText(element);
      let richText = normalizeBlockRichText(rawSerialized.replace(/\u00a0/g, ' '));

      // If rich serialization dropped OMML/math, fall back to textContent / UnicodeMath.
      const plainFallback = normalizeBlockRichText(
        (element.textContent ?? '').replace(/\u00a0/g, ' ')
      );
      if (mathScore(plainFallback) > mathScore(richText)) {
        richText = plainFallback;
      }

      richText = richText.replace(/\{\{(b|i|u|sup|sub)\}\}\s*\{\{\/\1\}\}/g, '').trim();

      if (!richText) {
        if (element.tagName === 'P' || element.tagName === 'DIV') {
          chunks.push({ text: '', isList: false, isBlank: true });
        }
        return;
      }

      const indentLevel = listItem ? getIndentLevel(element) : 0;
      const indent = ' '.repeat(indentLevel * LIST_INDENT_SPACES_PER_LEVEL);
      const existing = splitListPrefix(richText);
      let marker = existing.marker;
      let content = existing.marker ? existing.rest : richText;

      if (listItem && !marker) {
        marker =
          extractListMarkerFromElement(element) ?? defaultMarkerForElement(element, indentLevel);
        sawList = true;
      } else if (marker || listItem) {
        sawList = true;
      }

      // Apply list prefix only to the first line of a multi-line math block.
      const contentLines = normalizeBlockRichText(content).split('\n');
      if (marker || indent) {
        contentLines[0] = `${indent}${marker}${contentLines[0]?.replace(/^\s+/, '') ?? ''}`;
        for (let index = 1; index < contentLines.length; index += 1) {
          const row = contentLines[index];
          if (/^\s*\[/.test(row) && indent && !row.startsWith(indent)) {
            contentLines[index] = `${indent}${row.replace(/^\s+/, '    ')}`;
          }
        }
      }
      const lineBody = contentLines.join('\n');
      const converted = hasUnicodeMath(lineBody) ? unicodeMathToBuilderText(lineBody) : lineBody;

      if (!converted.trim()) {
        return;
      }

      const align = extractAlignFromElement(element);
      if (align !== 'left') {
        sawNonLeftAlign = true;
      }
      if (isBuilderMathText(converted) || /[Α-ωλΛ]/.test(converted)) {
        sawMath = true;
      }
      if (/\{\{(?:b|i|u|sup|sub)\}\}/.test(converted)) {
        sawInlineFormat = true;
      }

      const text = align === 'left' ? converted : `${formatAlignMarker(align)}\n${converted}`;
      chunks.push({ text, isList: listItem || Boolean(marker), isBlank: false });
    });

    const meaningful = chunks.filter((chunk) => !chunk.isBlank || chunks.length > 1);
    if (
      !meaningful.some((chunk) => !chunk.isBlank) ||
      (!sawNonLeftAlign && !sawMath && !sawList && !sawInlineFormat && !/<math|oMath/i.test(html))
    ) {
      return null;
    }

    return joinHtmlChunks(meaningful);
  } catch {
    return null;
  }
};

/**
 * Returns a paste resolution when the clipboard carries Word/KaTeX math.
 * Returns null when the browser should handle a normal plain-text paste.
 */
export const resolveWordPaste = (clipboardData: DataTransfer): PasteResolution | null => {
  const html = clipboardData.getData('text/html') ?? '';
  const plainText = clipboardData.getData('text/plain') ?? '';
  const alignedFromHtml = htmlToAlignedBuilderText(html);

  if (alignedFromHtml) {
    // Prefer plain UnicodeMath when it keeps clearly better math.
    // If HTML kept better math but dropped bullets, copy list prefixes from plain.
    if (hasListMarkers(plainText) || hasUnicodeMath(plainText)) {
      const fromPlain = unicodeMathToBuilderText(plainText);
      const plainMath = mathScore(fromPlain);
      const htmlMath = mathScore(alignedFromHtml);
      const plainLists = countListMarkers(fromPlain);
      const htmlLists = countListMarkers(alignedFromHtml);

      if (plainMath > htmlMath && plainLists >= htmlLists) {
        return { text: fromPlain, kind: 'ascii' };
      }

      if (plainLists > htmlLists) {
        return {
          text: transferListPrefixesFromPlain(alignedFromHtml, fromPlain),
          kind: 'ascii',
        };
      }
    }
    return { text: alignedFromHtml, kind: 'ascii' };
  }

  const { latex, plainText: clipboardPlain, mathMl } = readClipboardMath(clipboardData);

  if (latex) {
    return resolvePastePayload({ latex, plainText: clipboardPlain });
  }

  if (hasUnicodeMath(clipboardPlain)) {
    return { text: unicodeMathToBuilderText(clipboardPlain), kind: 'ascii' };
  }

  if (hasListMarkers(clipboardPlain)) {
    return { text: unicodeMathToBuilderText(clipboardPlain), kind: 'ascii' };
  }

  if (!mathMl) {
    return null;
  }

  return null;
};
