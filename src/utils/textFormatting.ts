export type InlineFormat = 'bold' | 'italic' | 'underline' | 'superscript' | 'subscript';
export type ListFormat = 'bullet' | 'number';

export const INLINE_FORMAT_TAGS: Record<InlineFormat, string> = {
  bold: 'b',
  italic: 'i',
  underline: 'u',
  superscript: 'sup',
  subscript: 'sub',
};

export const openTag = (format: InlineFormat): string => `{{${INLINE_FORMAT_TAGS[format]}}}`;

export const closeTag = (format: InlineFormat): string => `{{/${INLINE_FORMAT_TAGS[format]}}}`;

/** Word and editor bullet glyphs (■ is a list marker when not followed by `(`). */
const BULLET_PREFIX_RE = /^(\s*)(?:[•○●■◦▪▫‣∙\-–—*]|o)\s+/;
const NUMBER_PREFIX_RE = /^(\s*)\d+\.\s+/;

export const LIST_INDENT_SPACES_PER_LEVEL = 2;

export interface TextSelectionResult {
  nextValue: string;
  selectionStart: number;
  selectionEnd: number;
}

const wrapSelection = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  open: string,
  close: string
): TextSelectionResult => {
  const selected = value.slice(selectionStart, selectionEnd);
  const nextValue = `${value.slice(0, selectionStart)}${open}${selected}${close}${value.slice(selectionEnd)}`;

  if (selectionStart === selectionEnd) {
    const caret = selectionStart + open.length;
    return { nextValue, selectionStart: caret, selectionEnd: caret };
  }

  return {
    nextValue,
    selectionStart: selectionStart + open.length,
    selectionEnd: selectionStart + open.length + selected.length,
  };
};

const unwrapExactSelection = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  open: string,
  close: string
): TextSelectionResult | null => {
  const before = value.slice(Math.max(0, selectionStart - open.length), selectionStart);
  const after = value.slice(selectionEnd, selectionEnd + close.length);
  if (before !== open || after !== close) {
    return null;
  }

  const selected = value.slice(selectionStart, selectionEnd);
  const nextValue = `${value.slice(0, selectionStart - open.length)}${selected}${value.slice(selectionEnd + close.length)}`;
  return {
    nextValue,
    selectionStart: selectionStart - open.length,
    selectionEnd: selectionStart - open.length + selected.length,
  };
};

/** True when the caret/selection sits inside an open format pair. */
export const isInlineFormatActive = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: InlineFormat
): boolean => {
  const open = openTag(format);
  const close = closeTag(format);
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);

  const lastOpen = before.lastIndexOf(open);
  const lastCloseBefore = before.lastIndexOf(close);
  if (lastOpen === -1 || lastOpen < lastCloseBefore) {
    return false;
  }

  const nextClose = after.indexOf(close);
  const nextOpen = after.indexOf(open);
  if (nextClose === -1) {
    return false;
  }
  return nextOpen === -1 || nextClose < nextOpen;
};

/**
 * Toggles an inline format around the current selection.
 * Empty selection inserts an empty pair and places the caret inside.
 */
export const toggleInlineFormat = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: InlineFormat
): TextSelectionResult => {
  const open = openTag(format);
  const close = closeTag(format);

  const unwrapped = unwrapExactSelection(value, selectionStart, selectionEnd, open, close);
  if (unwrapped) {
    return unwrapped;
  }

  if (
    selectionStart !== selectionEnd &&
    isInlineFormatActive(value, selectionStart, selectionEnd, format)
  ) {
    // Selection inside markers — expand to outer markers and unwrap.
    const before = value.slice(0, selectionStart);
    const openAt = before.lastIndexOf(open);
    const closeAt = value.indexOf(close, selectionEnd);
    if (openAt >= 0 && closeAt >= 0) {
      const inner = value.slice(openAt + open.length, closeAt);
      const nextValue = `${value.slice(0, openAt)}${inner}${value.slice(closeAt + close.length)}`;
      return {
        nextValue,
        selectionStart: openAt,
        selectionEnd: openAt + inner.length,
      };
    }
  }

  return wrapSelection(value, selectionStart, selectionEnd, open, close);
};

const getLineBounds = (
  value: string,
  offset: number
): { lineStart: number; lineEnd: number; line: string } => {
  const lineStart = value.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  const nextBreak = value.indexOf('\n', offset);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  return {
    lineStart,
    lineEnd,
    line: value.slice(lineStart, lineEnd),
  };
};

const getSelectedLineRange = (
  value: string,
  selectionStart: number,
  selectionEnd: number
): { start: number; end: number; lines: string[] } => {
  const startBounds = getLineBounds(value, selectionStart);
  const endBounds = getLineBounds(
    value,
    Math.max(selectionStart, selectionEnd - (selectionEnd > selectionStart ? 1 : 0))
  );
  const block = value.slice(startBounds.lineStart, endBounds.lineEnd);
  return {
    start: startBounds.lineStart,
    end: endBounds.lineEnd,
    lines: block.split('\n'),
  };
};

const stripListPrefix = (
  line: string
): { indent: string; content: string; kind: ListFormat | null } => {
  const bulletMatch = line.match(BULLET_PREFIX_RE);
  if (bulletMatch) {
    return {
      indent: bulletMatch[1] ?? '',
      content: line.slice(bulletMatch[0].length),
      kind: 'bullet',
    };
  }

  const numberMatch = line.match(NUMBER_PREFIX_RE);
  if (numberMatch) {
    return {
      indent: numberMatch[1] ?? '',
      content: line.slice(numberMatch[0].length),
      kind: 'number',
    };
  }

  const indentMatch = line.match(/^(\s*)/);
  return {
    indent: indentMatch?.[1] ?? '',
    content: line.trimStart(),
    kind: null,
  };
};

export const isListFormatActive = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  list: ListFormat
): boolean => {
  const { lines } = getSelectedLineRange(value, selectionStart, selectionEnd);
  if (!lines.length) {
    return false;
  }
  // Plain blank lines are not an active list. A marker-only line ("• " / "1. ")
  // is active so the toolbar matches Word after starting a list before typing.
  return lines.every((line) => {
    if (!line.trim()) {
      return false;
    }
    return stripListPrefix(line).kind === list;
  });
};

/** Toggles bullets or numbered list prefixes on the selected lines. */
export const toggleListFormat = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  list: ListFormat
): TextSelectionResult => {
  const range = getSelectedLineRange(value, selectionStart, selectionEnd);
  // Blank lines still count as paragraphs (Word): click list before typing
  // inserts a marker. Only remove when every selected line is already that list.
  const shouldRemove =
    range.lines.length > 0 &&
    range.lines.every((line) => {
      if (!line.trim()) {
        return false;
      }
      return stripListPrefix(line).kind === list;
    });

  let number = 1;
  const nextLines = range.lines.map((line) => {
    const { indent, content, kind } = stripListPrefix(line);
    if (shouldRemove) {
      return kind === list ? `${indent}${content}` : line;
    }
    if (list === 'bullet') {
      return `${indent}• ${content}`;
    }
    const prefixed = `${indent}${number}. ${content}`;
    number += 1;
    return prefixed;
  });

  const nextBlock = nextLines.join('\n');
  const nextValue = `${value.slice(0, range.start)}${nextBlock}${value.slice(range.end)}`;

  // Collapsed caret: place after the marker so the user can type immediately.
  if (selectionStart === selectionEnd) {
    const caret = range.start + (nextLines[0]?.length ?? 0);
    return { nextValue, selectionStart: caret, selectionEnd: caret };
  }

  return {
    nextValue,
    selectionStart: range.start,
    selectionEnd: range.start + nextBlock.length,
  };
};

/**
 * Continues the current bullet/number list when Enter is pressed.
 * Returns null when the cursor is not on a list line (browser default Enter).
 * Empty list items exit the list (marker removed), matching Word-like behavior.
 */
export const continueListOnEnter = (
  value: string,
  selectionStart: number,
  selectionEnd: number
): TextSelectionResult | null => {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineBreak = value.indexOf('\n', start);
  const lineEnd = lineBreak === -1 ? value.length : lineBreak;
  const line = value.slice(lineStart, lineEnd);

  const bulletMatch = line.match(/^(\s*)([•○●■◦▪▫‣∙\-–—*]|o)(\s+)/);
  const numberMatch = line.match(/^(\s*)(\d+)\.(\s+)/);
  if (!bulletMatch && !numberMatch) {
    return null;
  }

  const indent = bulletMatch?.[1] ?? numberMatch?.[1] ?? '';
  const prefixLength = bulletMatch?.[0].length ?? numberMatch?.[0].length ?? 0;
  const content = line.slice(prefixLength);

  // Enter on an empty list item exits the list.
  if (!content.trim() && start >= lineStart + prefixLength) {
    const nextValue = `${value.slice(0, lineStart)}${indent}${value.slice(lineEnd)}`;
    const caret = lineStart + indent.length;
    return { nextValue, selectionStart: caret, selectionEnd: caret };
  }

  const contentStart = lineStart + prefixLength;
  const breakAt = Math.max(start, contentStart);
  const newPrefix = bulletMatch
    ? `${indent}${bulletMatch[2]} `
    : `${indent}${Number(numberMatch?.[2] ?? '1') + 1}. `;
  const nextValue = `${value.slice(0, breakAt)}\n${newPrefix}${value.slice(end)}`;
  const caret = breakAt + 1 + newPrefix.length;
  return { nextValue, selectionStart: caret, selectionEnd: caret };
};

const escapeHtmlText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Converts inline format markers into HTML for Word plain-text paragraphs.
 */
export const richTextToHtml = (text: string): string => {
  const parse = (input: string): string => {
    let result = '';
    let index = 0;

    while (index < input.length) {
      const openMatch = input.slice(index).match(/^\{\{(b|i|u|sup|sub)\}\}/);
      if (openMatch) {
        const tag = openMatch[1];
        const contentStart = index + openMatch[0].length;
        const close = `{{/${tag}}}`;
        const closeAt = input.indexOf(close, contentStart);

        if (closeAt === -1) {
          result += escapeHtmlText(input[index]);
          index += 1;
          continue;
        }

        const inner = parse(input.slice(contentStart, closeAt));
        const htmlTag =
          tag === 'b' ? 'b' : tag === 'i' ? 'i' : tag === 'u' ? 'u' : tag === 'sup' ? 'sup' : 'sub';
        result += `<${htmlTag}>${inner}</${htmlTag}>`;
        index = closeAt + close.length;
        continue;
      }

      const nextMarker = input.indexOf('{{', index);
      const plain = nextMarker === -1 ? input.slice(index) : input.slice(index, nextMarker);
      if (plain) {
        result += escapeHtmlText(plain);
      }
      index = nextMarker === -1 ? input.length : nextMarker;
    }

    return result;
  };

  return parse(text);
};

type RichTextLatexStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

/**
 * KaTeX keeps `\textit{\text{...}}` upright, so styled runs emit `\textit{...}` /
 * `\textbf{...}` directly instead of nesting over `\text`.
 */
const wrapPlainLatex = (
  plain: string,
  escapeText: (value: string) => string,
  style: RichTextLatexStyle
): string => {
  const escaped = escapeText(plain);
  let body = escaped;
  if (style.italic && style.bold) {
    body = `\\textbf{\\textit{${escaped}}}`;
  } else if (style.italic) {
    body = `\\textit{${escaped}}`;
  } else if (style.bold) {
    body = `\\textbf{${escaped}}`;
  } else {
    body = `\\text{${escaped}}`;
  }
  return style.underline ? `\\underline{${body}}` : body;
};

/**
 * Converts inline format markers into KaTeX-friendly LaTeX fragments.
 * Plain text segments are wrapped with `\text{...}` (or styled equivalents).
 */
export const richTextToLatex = (text: string, escapeText: (value: string) => string): string => {
  const parse = (input: string, style: RichTextLatexStyle = {}): string => {
    let result = '';
    let index = 0;

    while (index < input.length) {
      const openMatch = input.slice(index).match(/^\{\{(b|i|u|sup|sub)\}\}/);
      if (openMatch) {
        const tag = openMatch[1];
        const contentStart = index + openMatch[0].length;
        const close = `{{/${tag}}}`;
        const closeAt = input.indexOf(close, contentStart);

        if (closeAt === -1) {
          result += wrapPlainLatex(input[index], escapeText, style);
          index += 1;
          continue;
        }

        const innerText = input.slice(contentStart, closeAt);
        switch (tag) {
          case 'b':
            result += parse(innerText, { ...style, bold: true });
            break;
          case 'i':
            result += parse(innerText, { ...style, italic: true });
            break;
          case 'u':
            result += parse(innerText, { ...style, underline: true });
            break;
          case 'sup':
            result += `^{${parse(innerText, style)}}`;
            break;
          case 'sub':
            result += `_{${parse(innerText, style)}}`;
            break;
          default:
            result += parse(innerText, style);
        }
        index = closeAt + close.length;
        continue;
      }

      const nextMarker = input.indexOf('{{', index);
      const plain = nextMarker === -1 ? input.slice(index) : input.slice(index, nextMarker);
      if (plain) {
        result += wrapPlainLatex(plain, escapeText, style);
      }
      index = nextMarker === -1 ? input.length : nextMarker;
    }

    return result;
  };

  return parse(text);
};
