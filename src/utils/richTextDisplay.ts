import { ALIGN_MARKER_RE } from '@/utils/textAlignment';
import { richTextToHtml } from '@/utils/textFormatting';

export interface RichTextDisplayMap {
  /** Marker-free text shown in the textarea. */
  display: string;
  /** Model offset for a caret at each display index (length = display.length + 1). */
  caretToModel: number[];
  /** Model index of each display character. */
  displayToModel: number[];
  model: string;
}

const INLINE_OPEN_RE = /^\{\{(b|i|u|sup|sub)\}\}/;
const INLINE_CLOSE_RE = /^\{\{\/(b|i|u|sup|sub)\}\}/;

const matchAlignLine = (model: string, index: number): { end: number } | null => {
  if (index > 0 && model[index - 1] !== '\n') {
    return null;
  }
  const lineEnd = model.indexOf('\n', index);
  const line = lineEnd === -1 ? model.slice(index) : model.slice(index, lineEnd);
  if (!ALIGN_MARKER_RE.test(line.trim())) {
    return null;
  }
  return { end: lineEnd === -1 ? model.length : lineEnd + 1 };
};

const matchInlineOpen = (model: string, index: number): { end: number } | null => {
  const match = model.slice(index).match(INLINE_OPEN_RE);
  return match ? { end: index + match[0].length } : null;
};

const matchInlineClose = (model: string, index: number): { start: number; end: number } | null => {
  const match = model.slice(index).match(INLINE_CLOSE_RE);
  return match ? { start: index, end: index + match[0].length } : null;
};

/**
 * Builds display text and caret maps so `{{b}}` / `{{i}}` / align markers stay
 * in the model but are hidden from the equation input (Word-like).
 */
export const buildRichTextDisplay = (rawModel: string): RichTextDisplayMap => {
  const model = rawModel.replace(/\r\n/g, '\n');
  let display = '';
  const caretToModel: number[] = [];
  const displayToModel: number[] = [];

  let i = 0;
  let caret = 0;

  const skipZeroWidth = (): boolean => {
    const align = matchAlignLine(model, i);
    if (align) {
      i = align.end;
      caret = i;
      return true;
    }

    const open = matchInlineOpen(model, i);
    if (open) {
      i = open.end;
      caret = i;
      return true;
    }

    const close = matchInlineClose(model, i);
    if (close) {
      i = close.end;
      // Keep caret inside the format when it already sits before this close.
      if (caret > close.start) {
        caret = i;
      }
      return true;
    }

    return false;
  };

  while (i < model.length && skipZeroWidth()) {
    // absorb leading markers
  }
  caretToModel.push(caret);

  while (i < model.length) {
    if (skipZeroWidth()) {
      caretToModel[caretToModel.length - 1] = caret;
      continue;
    }

    display += model[i];
    displayToModel.push(i);
    i += 1;
    caret = i;

    while (i < model.length && skipZeroWidth()) {
      // absorb markers between display characters
    }
    caretToModel.push(caret);
  }

  return { display, caretToModel, displayToModel, model };
};

export const displayCaretToModel = (map: RichTextDisplayMap, displayOffset: number): number => {
  const safe = Math.max(0, Math.min(displayOffset, map.caretToModel.length - 1));
  return map.caretToModel[safe] ?? 0;
};

export const modelCaretToDisplay = (map: RichTextDisplayMap, modelOffset: number): number => {
  const safeModel = Math.max(0, Math.min(modelOffset, map.model.length));
  let best = 0;
  for (let d = 0; d < map.caretToModel.length; d += 1) {
    if (map.caretToModel[d] === safeModel) {
      return d;
    }
    if ((map.caretToModel[d] ?? 0) <= safeModel) {
      best = d;
    }
  }
  return best;
};

const hasOpenDepth = (before: string, tag: string): boolean => {
  const open = `{{${tag}}}`;
  const close = `{{/${tag}}}`;
  let depth = 0;
  let index = 0;
  while (index < before.length) {
    if (before.startsWith(open, index)) {
      depth += 1;
      index += open.length;
      continue;
    }
    if (before.startsWith(close, index)) {
      depth = Math.max(0, depth - 1);
      index += close.length;
      continue;
    }
    index += 1;
  }
  return depth > 0;
};

/** Removes empty inline pairs and clearly orphaned close markers. */
export const cleanupRichTextMarkers = (value: string): string => {
  let next = value;
  let previous = '';
  while (next !== previous) {
    previous = next;
    next = next.replace(/\{\{(b|i|u|sup|sub)\}\}\{\{\/\1\}\}/g, '');
  }

  // Drop orphan close tags (no matching open before them).
  let cleaned = '';
  let index = 0;
  while (index < next.length) {
    const closeMatch = next.slice(index).match(INLINE_CLOSE_RE);
    if (closeMatch) {
      const tag = closeMatch[1] ?? '';
      if (hasOpenDepth(cleaned, tag)) {
        cleaned += closeMatch[0];
      }
      index += closeMatch[0].length;
      continue;
    }
    cleaned += next[index];
    index += 1;
  }

  previous = '';
  next = cleaned;
  while (next !== previous) {
    previous = next;
    next = next.replace(/\{\{(b|i|u|sup|sub)\}\}\{\{\/\1\}\}/g, '');
  }

  return next;
};

export interface DisplayEditResult {
  nextModel: string;
  /** Preferred display caret after the edit. */
  displayCaret: number;
}

/**
 * Maps a textarea display-string edit back onto the marked model.
 * Uses a prefix/suffix diff so markers outside the edited span are preserved.
 */
export const applyDisplayEdit = (model: string, nextDisplay: string): DisplayEditResult => {
  const map = buildRichTextDisplay(model);
  const prevDisplay = map.display;

  if (prevDisplay === nextDisplay) {
    return { nextModel: model, displayCaret: nextDisplay.length };
  }

  let prefix = 0;
  const maxPrefix = Math.min(prevDisplay.length, nextDisplay.length);
  while (prefix < maxPrefix && prevDisplay[prefix] === nextDisplay[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < prevDisplay.length - prefix &&
    suffix < nextDisplay.length - prefix &&
    prevDisplay[prevDisplay.length - 1 - suffix] === nextDisplay[nextDisplay.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const prevMidEnd = prevDisplay.length - suffix;
  const inserted = nextDisplay.slice(prefix, nextDisplay.length - suffix);
  const modelStart = displayCaretToModel(map, prefix);
  const modelEnd = displayCaretToModel(map, prevMidEnd);

  const nextModel = cleanupRichTextMarkers(
    `${map.model.slice(0, modelStart)}${inserted}${map.model.slice(modelEnd)}`
  );

  return {
    nextModel,
    displayCaret: prefix + inserted.length,
  };
};

/**
 * Styled HTML mirror for the equation input (markers hidden, B/I/U visible).
 * Lines stay start-aligned so glyph positions match the transparent textarea caret.
 * Paragraph alignment still applies in the KaTeX preview.
 */
export const modelToMirrorHtml = (rawModel: string): string => {
  const model = rawModel.replace(/\r\n/g, '\n');
  if (!model) {
    return '';
  }

  const lines = model.split('\n');
  const parts: string[] = [];

  for (const line of lines) {
    if (ALIGN_MARKER_RE.test(line.trim())) {
      continue;
    }

    parts.push(
      `<div class="equation-editor-mirror-line">${
        line.length ? richTextToHtml(line) : '<br>'
      }</div>`
    );
  }

  return parts.join('');
};

/** Convenience: display string only. */
export const toDisplayText = (model: string): string => buildRichTextDisplay(model).display;
