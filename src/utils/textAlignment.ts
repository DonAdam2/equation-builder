export type TextAlign = 'left' | 'center' | 'right';

export interface AlignedBlock {
  align: TextAlign;
  text: string;
}

export const ALIGN_MARKER_RE = /^\{\{align:(left|center|right)\}\}\s*$/i;

export const isTextAlign = (value: string): value is TextAlign =>
  value === 'left' || value === 'center' || value === 'right';

export const formatAlignMarker = (align: TextAlign): string => `{{align:${align}}}`;

/** Removes alignment markers so converters only see content. */
export const stripAlignMarkers = (text: string): string =>
  text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !ALIGN_MARKER_RE.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Splits editor text into alignment blocks.
 * A `{{align:left|center|right}}` line sets alignment for following lines
 * until the next marker (default: left).
 */
export const parseAlignedBlocks = (text: string): AlignedBlock[] => {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.trim()) {
    return [];
  }

  const lines = normalized.split('\n');
  const blocks: AlignedBlock[] = [];
  let currentAlign: TextAlign = 'left';
  let buffer: string[] = [];

  const flush = () => {
    const blockText = buffer.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
    buffer = [];
    if (!blockText.trim()) {
      return;
    }
    blocks.push({ align: currentAlign, text: blockText });
  };

  for (const line of lines) {
    const markerMatch = line.trim().match(ALIGN_MARKER_RE);
    if (markerMatch && isTextAlign(markerMatch[1].toLowerCase())) {
      flush();
      currentAlign = markerMatch[1].toLowerCase() as TextAlign;
      continue;
    }
    buffer.push(line);
  }

  flush();
  return blocks;
};

interface BlockRange {
  start: number;
  end: number;
  bodyStart: number;
  align: TextAlign;
}

/**
 * Finds the blank-line-delimited block that contains the cursor.
 */
export const findBlockRange = (value: string, cursor: number): BlockRange => {
  const normalized = value.replace(/\r\n/g, '\n');
  const safeCursor = Math.max(0, Math.min(cursor, normalized.length));
  const lines = normalized.split('\n');

  type Part = { start: number; end: number };
  const parts: Part[] = [];
  let offset = 0;
  let partStart = 0;
  let hasContent = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineStart = offset;
    const isLast = index === lines.length - 1;
    const nextOffset = offset + line.length + (isLast ? 0 : 1);

    if (line.trim() === '') {
      if (hasContent) {
        parts.push({ start: partStart, end: lineStart > 0 ? lineStart - 1 : 0 });
        hasContent = false;
      }
      partStart = nextOffset;
      offset = nextOffset;
      continue;
    }

    if (!hasContent) {
      partStart = lineStart;
      hasContent = true;
    }

    if (isLast && hasContent) {
      parts.push({ start: partStart, end: normalized.length });
    }

    offset = nextOffset;
  }

  if (!parts.length) {
    return { start: 0, end: normalized.length, bodyStart: 0, align: 'left' };
  }

  const active =
    parts.find((part) => safeCursor >= part.start && safeCursor <= part.end) ??
    parts[parts.length - 1];

  const blockText = normalized.slice(active.start, active.end);
  const firstLineEnd = blockText.indexOf('\n');
  const firstLine = firstLineEnd === -1 ? blockText : blockText.slice(0, firstLineEnd);
  const markerMatch = firstLine.trim().match(ALIGN_MARKER_RE);

  if (markerMatch && isTextAlign(markerMatch[1].toLowerCase())) {
    const bodyStart = firstLineEnd === -1 ? active.end : active.start + firstLineEnd + 1;
    return {
      start: active.start,
      end: active.end,
      bodyStart,
      align: markerMatch[1].toLowerCase() as TextAlign,
    };
  }

  return {
    start: active.start,
    end: active.end,
    bodyStart: active.start,
    align: 'left',
  };
};

/**
 * Sets (or replaces) the alignment marker for the block containing the cursor.
 */
export const applyAlignmentAtCursor = (
  value: string,
  cursor: number,
  align: TextAlign
): { nextValue: string; selectionStart: number; selectionEnd: number } => {
  const normalized = value.replace(/\r\n/g, '\n');
  const range = findBlockRange(normalized, cursor);
  const body = normalized.slice(range.bodyStart, range.end);
  const marker = formatAlignMarker(align);
  // Always keep a content line after the marker so later inline formats
  // (bold/italic/…) are not concatenated onto `{{align:…}}` (same-line hang).
  const alignedBlock = `${marker}\n${body}`;

  const before = normalized.slice(0, range.start);
  const after = normalized.slice(range.end);
  const nextValue = `${before}${alignedBlock}${after}`.replace(/\n{3,}/g, '\n\n');

  const caret = before.length + marker.length + 1;
  return {
    nextValue,
    selectionStart: caret,
    selectionEnd: caret,
  };
};

export const getAlignmentAtCursor = (value: string, cursor: number): TextAlign =>
  findBlockRange(value.replace(/\r\n/g, '\n'), cursor).align;

/** Maps CSS/HTML align values from Word clipboard HTML. */
export const parseCssTextAlign = (value: string | null | undefined): TextAlign | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'left' || normalized === 'start') {
    return 'left';
  }
  if (normalized === 'center' || normalized === 'middle') {
    return 'center';
  }
  if (normalized === 'right' || normalized === 'end') {
    return 'right';
  }
  return null;
};
