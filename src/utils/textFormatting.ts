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
 * Drop leading/trailing newlines from a selection so bold/italic (etc.) wrap
 * only the paragraph text — not the paragraph break. Selecting a line in a
 * textarea often includes the trailing `\n`, which would otherwise move the
 * caret onto the next row after formatting.
 */
export const trimInlineFormatSelection = (
  value: string,
  selectionStart: number,
  selectionEnd: number
): { start: number; end: number } => {
  let start = Math.max(0, Math.min(selectionStart, selectionEnd, value.length));
  let end = Math.max(selectionStart, selectionEnd);
  end = Math.min(end, value.length);

  while (start < end && (value[start] === '\n' || value[start] === '\r')) {
    start += 1;
  }
  while (end > start && (value[end - 1] === '\n' || value[end - 1] === '\r')) {
    end -= 1;
  }

  return { start, end };
};

/**
 * Collapsed caret inside an active format: leave existing styled text alone and
 * place the caret in an unformatted gap (Word-like “turn off for new typing”).
 * - at end → move past the closing marker
 * - at start → move before the opening marker
 * - in the middle → split into two styled runs with the caret between them
 */
const exitInlineFormatAtCaret = (
  value: string,
  caret: number,
  open: string,
  close: string
): TextSelectionResult | null => {
  const before = value.slice(0, caret);
  const openAt = before.lastIndexOf(open);
  const closeAt = value.indexOf(close, caret);
  if (openAt < 0 || closeAt < 0) {
    return null;
  }

  const innerStart = openAt + open.length;
  const left = value.slice(innerStart, caret);
  const right = value.slice(caret, closeAt);
  const afterClose = value.slice(closeAt + close.length);
  const beforeOpen = value.slice(0, openAt);

  if (!left && !right) {
    // Empty pair — remove it and leave the caret where it was.
    return {
      nextValue: `${beforeOpen}${afterClose}`,
      selectionStart: openAt,
      selectionEnd: openAt,
    };
  }

  if (!right) {
    // End of run: keep styling, continue typing unformatted after it.
    const caretAfter = openAt + open.length + left.length + close.length;
    return {
      nextValue: value,
      selectionStart: caretAfter,
      selectionEnd: caretAfter,
    };
  }

  if (!left) {
    // Start of run: keep styling, type unformatted before it.
    return {
      nextValue: value,
      selectionStart: openAt,
      selectionEnd: openAt,
    };
  }

  // Middle of run: split so previous/next styled text both remain.
  const nextValue = `${beforeOpen}${open}${left}${close}${open}${right}${close}${afterClose}`;
  const caretAfter = openAt + open.length + left.length + close.length;
  return {
    nextValue,
    selectionStart: caretAfter,
    selectionEnd: caretAfter,
  };
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
  const { start, end } = trimInlineFormatSelection(value, selectionStart, selectionEnd);

  const unwrapped = unwrapExactSelection(value, start, end, open, close);
  if (unwrapped) {
    return unwrapped;
  }

  if (isInlineFormatActive(value, start, end, format)) {
    // Collapsed caret: exit the format for new typing — never strip existing marks.
    if (start === end) {
      return (
        exitInlineFormatAtCaret(value, start, open, close) ?? {
          nextValue: value,
          selectionStart: start,
          selectionEnd: end,
        }
      );
    }

    // Non-empty selection inside a format — unwrap that run.
    const before = value.slice(0, start);
    const openAt = before.lastIndexOf(open);
    const closeAt = value.indexOf(close, end);
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

  const wrapped = wrapSelection(value, start, end, open, close);
  // After formatting a range, collapse to the end of the styled text so Enter
  // inserts below that paragraph instead of replacing the selection / jumping
  // to the following row.
  if (start !== end) {
    return {
      nextValue: wrapped.nextValue,
      selectionStart: wrapped.selectionEnd,
      selectionEnd: wrapped.selectionEnd,
    };
  }
  return wrapped;
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

const INLINE_OPEN_AT_RE = /^\{\{(b|i|u|sup|sub)\}\}/;
const INLINE_CLOSE_AT_RE = /^\{\{\/(b|i|u|sup|sub)\}\}/;
const ALIGN_MARKER_AT_RE = /^\{\{align:(?:left|center|right)\}\}/i;
const ANY_BRACED_MARKER_AT_RE = /^\{\{[^}]*\}\}/;

/**
 * Advances past a `{{...}}` that is not an inline open tag.
 * Orphan closes / align markers are skipped; anything else is emitted as literal text.
 * Always moves forward so parsers cannot spin on unknown markers.
 */
const consumeNonOpenMarker = (
  input: string,
  index: number
): { end: number; literal: string | null } => {
  const closeMatch = input.slice(index).match(INLINE_CLOSE_AT_RE);
  if (closeMatch) {
    return { end: index + closeMatch[0].length, literal: null };
  }

  const alignMatch = input.slice(index).match(ALIGN_MARKER_AT_RE);
  if (alignMatch) {
    return { end: index + alignMatch[0].length, literal: null };
  }

  const braced = input.slice(index).match(ANY_BRACED_MARKER_AT_RE);
  if (braced) {
    return { end: index + braced[0].length, literal: braced[0] };
  }

  return { end: index + 1, literal: input[index] ?? '' };
};

/**
 * Converts inline format markers into HTML for Word plain-text paragraphs.
 */
export const richTextToHtml = (text: string): string => {
  const parse = (input: string): string => {
    let result = '';
    let index = 0;

    while (index < input.length) {
      const openMatch = input.slice(index).match(INLINE_OPEN_AT_RE);
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
        index = nextMarker === -1 ? input.length : nextMarker;
        continue;
      }

      // Sitting on `{{` that isn't a valid inline open — never stall here.
      const consumed = consumeNonOpenMarker(input, index);
      if (consumed.literal) {
        result += escapeHtmlText(consumed.literal);
      }
      index = consumed.end;
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
      const openMatch = input.slice(index).match(INLINE_OPEN_AT_RE);
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
        index = nextMarker === -1 ? input.length : nextMarker;
        continue;
      }

      // Sitting on `{{` that isn't a valid inline open — never stall here.
      const consumed = consumeNonOpenMarker(input, index);
      if (consumed.literal) {
        result += wrapPlainLatex(consumed.literal, escapeText, style);
      }
      index = consumed.end;
    }

    return result;
  };

  return parse(text);
};
