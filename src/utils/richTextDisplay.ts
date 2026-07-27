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

/**
 * Newlines inside open inline spans break line-based mirror/preview parsers
 * (`{{b}}line\n{{/b}}` shows raw `{{b}}`). Close formats before each newline
 * and reopen after so bold/italic continue Word-like on the next line.
 */
export const rebalanceInlineFormatsAcrossNewlines = (value: string): string => {
  const normalized = value.replace(/\r\n/g, '\n');
  if (!normalized.includes('\n') || !/\{\{(b|i|u|sup|sub)\}\}/.test(normalized)) {
    return normalized;
  }

  let result = '';
  const stack: string[] = [];
  let index = 0;

  while (index < normalized.length) {
    if (normalized[index] === '\n') {
      if (stack.length) {
        for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
          result += `{{/${stack[depth]}}}`;
        }
        result += '\n';
        for (const tag of stack) {
          result += `{{${tag}}}`;
        }
      } else {
        result += '\n';
      }
      index += 1;
      continue;
    }

    const openMatch = normalized.slice(index).match(INLINE_OPEN_RE);
    if (openMatch) {
      stack.push(openMatch[1] ?? '');
      result += openMatch[0];
      index += openMatch[0].length;
      continue;
    }

    const closeMatch = normalized.slice(index).match(INLINE_CLOSE_RE);
    if (closeMatch) {
      const tag = closeMatch[1] ?? '';
      for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
        if (stack[depth] === tag) {
          stack.splice(depth, 1);
          break;
        }
      }
      result += closeMatch[0];
      index += closeMatch[0].length;
      continue;
    }

    result += normalized[index];
    index += 1;
  }

  return result;
};

export interface DisplayEditResult {
  nextModel: string;
  /** Preferred display caret after the edit. */
  displayCaret: number;
}

/**
 * Maps a textarea display-string edit back onto the marked model.
 * Uses a prefix/suffix diff so markers outside the edited span are preserved.
 *
 * @param preferredDisplayCaret When provided (textarea selection after the edit),
 *   preferred over the diff heuristic — Enter at end-of-line is ambiguous in the diff.
 * @param preferredModelCaret When the display caret sits on a marker boundary
 *   (e.g. end of a `{{sup}}…{{/sup}}` run), the model caret chooses inside vs
 *   outside affinity — needed after “exit format” so new typing stays plain.
 */
export const applyDisplayEdit = (
  model: string,
  nextDisplay: string,
  preferredDisplayCaret?: number,
  preferredModelCaret?: number
): DisplayEditResult => {
  const map = buildRichTextDisplay(model);
  const prevDisplay = map.display;

  if (prevDisplay === nextDisplay) {
    const caret =
      preferredDisplayCaret === undefined
        ? nextDisplay.length
        : Math.max(0, Math.min(preferredDisplayCaret, nextDisplay.length));
    return { nextModel: model, displayCaret: caret };
  }

  /**
   * Prefer a pure insertion at the pre-edit caret when the textarea tells us the
   * post-edit caret. Prefix/suffix diff can “slide” an Enter past a trailing
   * `{{/b}}` onto the next paragraph, which drops bold continuation.
   */
  if (preferredDisplayCaret !== undefined && nextDisplay.length > prevDisplay.length) {
    const insertLength = nextDisplay.length - prevDisplay.length;
    const preEditCaret = preferredDisplayCaret - insertLength;
    if (
      preEditCaret >= 0 &&
      preEditCaret <= prevDisplay.length &&
      nextDisplay.slice(0, preEditCaret) === prevDisplay.slice(0, preEditCaret) &&
      nextDisplay.slice(preferredDisplayCaret) === prevDisplay.slice(preEditCaret)
    ) {
      const inserted = nextDisplay.slice(preEditCaret, preferredDisplayCaret);
      let insertAt = displayCaretToModel(map, preEditCaret);
      // Same display index can map before or after a closing marker. Honor the
      // model caret when it still projects to this display position.
      if (
        preferredModelCaret !== undefined &&
        modelCaretToDisplay(map, preferredModelCaret) === preEditCaret
      ) {
        insertAt = preferredModelCaret;
      }
      const merged = `${map.model.slice(0, insertAt)}${inserted}${map.model.slice(insertAt)}`;
      const nextModel = rebalanceInlineFormatsAcrossNewlines(cleanupRichTextMarkers(merged));
      return {
        nextModel,
        displayCaret: Math.max(0, Math.min(preferredDisplayCaret, nextDisplay.length)),
      };
    }
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

  const merged = `${map.model.slice(0, modelStart)}${inserted}${map.model.slice(modelEnd)}`;
  // Clean first so rebalance can leave intentional empty pairs on the new line
  // (`{{b}}text{{/b}}\n{{b}}{{/b}}`) for continued typing.
  const nextModel = rebalanceInlineFormatsAcrossNewlines(cleanupRichTextMarkers(merged));

  let displayCaret = prefix + inserted.length;
  // Diff ambiguity: Enter at end-of-line (`asdf|` + existing `\n…`) can extend the
  // common prefix through that `\n` and place the caret on the next paragraph.
  // Prefer the blank line between the two newlines.
  if (
    inserted === '\n' &&
    prefix > 0 &&
    nextDisplay[prefix - 1] === '\n' &&
    nextDisplay[prefix] === '\n'
  ) {
    displayCaret = prefix;
  }

  if (preferredDisplayCaret !== undefined) {
    displayCaret = Math.max(0, Math.min(preferredDisplayCaret, nextDisplay.length));
  }

  return {
    nextModel,
    displayCaret,
  };
};

/**
 * Styled HTML mirror for the equation input (markers hidden, B/I/U visible).
 * Lines stay start-aligned so glyph positions match the transparent textarea caret.
 * Paragraph alignment still applies in the KaTeX preview.
 */
export const modelToMirrorHtml = (rawModel: string): string => {
  const model = rebalanceInlineFormatsAcrossNewlines(rawModel.replace(/\r\n/g, '\n'));
  if (!model) {
    return '';
  }

  const lines = model.split('\n');
  const parts: string[] = [];

  for (const line of lines) {
    if (ALIGN_MARKER_RE.test(line.trim())) {
      continue;
    }

    // Defensive: drop a leading align marker if it was glued onto content.
    const content = line.replace(/^\{\{align:(?:left|center|right)\}\}\s*/i, '');

    parts.push(
      `<div class="equation-editor-mirror-line">${
        content.length ? richTextToHtml(content) : '<br>'
      }</div>`
    );
  }

  return parts.join('');
};

/** Convenience: display string only. */
export const toDisplayText = (model: string): string => buildRichTextDisplay(model).display;
