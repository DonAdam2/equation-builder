import {
  ClipboardEvent,
  KeyboardEvent,
  RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { toast } from 'react-toastify';

import useEditorHistory from '@/hooks/useEditorHistory';

import { Equation } from '@/models/Equation';

import { insertTemplateAtCursor, insertTextAtCursor } from '@/utils/equationCursor';
import {
  applyDisplayEdit,
  buildRichTextDisplay,
  displayCaretToModel,
  modelCaretToDisplay,
  rebalanceInlineFormatsAcrossNewlines,
} from '@/utils/richTextDisplay';
import { applyAlignmentAtCursor, getAlignmentAtCursor, TextAlign } from '@/utils/textAlignment';
import {
  continueListOnEnter,
  InlineFormat,
  isInlineFormatActive,
  isListFormatActive,
  ListFormat,
  toggleInlineFormat,
  toggleListFormat,
} from '@/utils/textFormatting';
import { resolveWordPaste } from '@/utils/wordPaste';

interface UseEquationInsertionParams {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

const useEquationInsertion = ({ textareaRef }: UseEquationInsertionParams) => {
  const {
    value,
    canUndo,
    canRedo,
    selectionRef,
    applyTypingChange,
    applyImmediateChange,
    undo: undoHistory,
    redo: redoHistory,
    getValue,
  } = useEditorHistory();
  const [activeAlign, setActiveAlign] = useState<TextAlign>('left');
  const [activeInlineFormats, setActiveInlineFormats] = useState<InlineFormat[]>([]);
  const [activeListFormat, setActiveListFormat] = useState<ListFormat | null>(null);
  // After toolbar formatting, the controlled textarea often keeps the old range
  // (markers are hidden so the display string is unchanged). Ignore those
  // onSelect/onClick syncs until the user interacts with the textarea again.
  const suppressSelectionSyncRef = useRef(false);
  const pendingDisplaySelectionRef = useRef<{ start: number; end: number } | null>(null);

  const syncFormatState = useCallback((nextValue: string, start: number, end: number) => {
    setActiveAlign(getAlignmentAtCursor(nextValue, start));
    const formats: InlineFormat[] = (
      ['bold', 'italic', 'underline', 'superscript', 'subscript'] as InlineFormat[]
    ).filter((format) => isInlineFormatActive(nextValue, start, end, format));
    setActiveInlineFormats(formats);

    if (isListFormatActive(nextValue, start, end, 'bullet')) {
      setActiveListFormat('bullet');
    } else if (isListFormatActive(nextValue, start, end, 'number')) {
      setActiveListFormat('number');
    } else {
      setActiveListFormat(null);
    }
  }, []);

  const readDisplaySelection = useCallback(() => {
    const element = textareaRef.current;
    return {
      displayStart: element?.selectionStart ?? 0,
      displayEnd: element?.selectionEnd ?? 0,
    };
  }, [textareaRef]);

  const displaySelectionToModel = useCallback(
    (modelValue: string, displayStart: number, displayEnd: number) => {
      const map = buildRichTextDisplay(modelValue);
      return {
        start: displayCaretToModel(map, displayStart),
        end: displayCaretToModel(map, displayEnd),
      };
    },
    []
  );

  const commitModelSelection = useCallback(
    (selectionStart: number, selectionEnd: number, modelValue: string) => {
      suppressSelectionSyncRef.current = true;
      selectionRef.current = { start: selectionStart, end: selectionEnd };
      syncFormatState(modelValue, selectionStart, selectionEnd);

      const map = buildRichTextDisplay(modelValue);
      const displayStart = modelCaretToDisplay(map, selectionStart);
      const displayEnd = modelCaretToDisplay(map, selectionEnd);
      pendingDisplaySelectionRef.current = { start: displayStart, end: displayEnd };

      const editor = textareaRef.current;
      if (editor) {
        editor.focus();
        editor.setSelectionRange(displayStart, displayEnd);
      }
    },
    [selectionRef, syncFormatState, textareaRef]
  );

  useLayoutEffect(() => {
    const pending = pendingDisplaySelectionRef.current;
    const editor = textareaRef.current;
    if (!pending || !editor) {
      return;
    }
    // Re-assert after React commits — controlled textareas restore stale ranges
    // when the visible value string does not change (hidden markers).
    editor.setSelectionRange(pending.start, pending.end);
  }, [value, textareaRef]);

  const syncSelectionFromElement = useCallback(() => {
    if (suppressSelectionSyncRef.current) {
      return;
    }

    const element = textareaRef.current;
    if (!element) {
      return;
    }

    const modelValue = getValue();
    const mapped = displaySelectionToModel(
      modelValue,
      element.selectionStart ?? 0,
      element.selectionEnd ?? 0
    );
    selectionRef.current = mapped;
    pendingDisplaySelectionRef.current = null;
    syncFormatState(modelValue, mapped.start, mapped.end);
  }, [displaySelectionToModel, getValue, selectionRef, syncFormatState, textareaRef]);

  /** Call when the user interacts with the textarea so selection sync resumes. */
  const handleUserSelectionIntent = useCallback(() => {
    suppressSelectionSyncRef.current = false;
    pendingDisplaySelectionRef.current = null;
  }, []);

  const restoreSnapshotSelection = useCallback(
    (selectionStart: number, selectionEnd: number, modelValue = getValue()) => {
      commitModelSelection(selectionStart, selectionEnd, modelValue);
      requestAnimationFrame(() => {
        const editor = textareaRef.current;
        const pending = pendingDisplaySelectionRef.current;
        if (!editor || !pending) {
          return;
        }
        editor.focus();
        editor.setSelectionRange(pending.start, pending.end);
      });
    },
    [commitModelSelection, getValue, textareaRef]
  );

  /** Textarea onChange provides marker-free display text; map back onto the model. */
  const handleChange = useCallback(
    (nextDisplay: string, preferredDisplayCaret?: number) => {
      // Typing is a real user edit — resume selection sync for arrow keys, etc.
      suppressSelectionSyncRef.current = false;
      pendingDisplaySelectionRef.current = null;

      const stored = selectionRef.current;
      const preferredModelCaret = stored.start === stored.end ? stored.start : undefined;
      const { nextModel, displayCaret } = applyDisplayEdit(
        getValue(),
        nextDisplay,
        preferredDisplayCaret,
        preferredModelCaret
      );
      applyTypingChange(nextModel);

      const map = buildRichTextDisplay(nextModel);
      const modelCaret = displayCaretToModel(map, displayCaret);
      selectionRef.current = { start: modelCaret, end: modelCaret };
      syncFormatState(nextModel, modelCaret, modelCaret);

      requestAnimationFrame(() => {
        const editor = textareaRef.current;
        if (!editor) {
          return;
        }
        editor.setSelectionRange(displayCaret, displayCaret);
      });
    },
    [applyTypingChange, getValue, selectionRef, syncFormatState, textareaRef]
  );

  const handleCursorChange = useCallback(() => {
    syncSelectionFromElement();
  }, [syncSelectionFromElement]);

  const focusEditor = useCallback(() => {
    textareaRef.current?.focus();
  }, [textareaRef]);

  /**
   * Inserts an equation template at the last known cursor position,
   * focuses the editor, and selects the first variable when possible.
   */
  const insertEquation = useCallback(
    (equation: Equation) => {
      // Always prefer the cached caret. After clicking the table/dialog the
      // textarea is blurred and some browsers reset selectionStart to 0.
      const selectionStart = selectionRef.current.start;
      const selectionEnd = selectionRef.current.end;

      const {
        nextValue,
        selectionStart: nextStart,
        selectionEnd: nextEnd,
      } = insertTemplateAtCursor({
        currentValue: value,
        selectionStart,
        selectionEnd,
        equation,
      });

      applyImmediateChange({
        value: nextValue,
        selectionStart: nextStart,
        selectionEnd: nextEnd,
      });
      restoreSnapshotSelection(nextStart, nextEnd, nextValue);
    },
    [applyImmediateChange, restoreSnapshotSelection, selectionRef, value]
  );

  const undo = useCallback(() => {
    const snapshot = undoHistory();
    if (!snapshot) {
      return;
    }

    restoreSnapshotSelection(snapshot.selectionStart, snapshot.selectionEnd, snapshot.value);
  }, [restoreSnapshotSelection, undoHistory]);

  const redo = useCallback(() => {
    const snapshot = redoHistory();
    if (!snapshot) {
      return;
    }

    restoreSnapshotSelection(snapshot.selectionStart, snapshot.selectionEnd, snapshot.value);
  }, [redoHistory, restoreSnapshotSelection]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      // Keyboard caret moves must update selectionRef again after a toolbar action.
      suppressSelectionSyncRef.current = false;
      pendingDisplaySelectionRef.current = null;

      if (
        event.key === 'Enter' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        const modelValue = getValue();
        const { displayStart, displayEnd } = readDisplaySelection();
        const { start, end } = displaySelectionToModel(modelValue, displayStart, displayEnd);
        const result = continueListOnEnter(modelValue, start, end);
        if (result) {
          event.preventDefault();
          const nextValue = rebalanceInlineFormatsAcrossNewlines(result.nextValue);
          applyImmediateChange({
            value: nextValue,
            selectionStart: result.selectionStart,
            selectionEnd: result.selectionEnd,
          });
          restoreSnapshotSelection(result.selectionStart, result.selectionEnd, nextValue);
        }
        return;
      }

      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) {
        return;
      }

      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey);

      if (isUndo) {
        event.preventDefault();
        undo();
        return;
      }

      if (isRedo) {
        event.preventDefault();
        redo();
      }
    },
    [
      applyImmediateChange,
      displaySelectionToModel,
      getValue,
      readDisplaySelection,
      redo,
      restoreSnapshotSelection,
      undo,
    ]
  );

  const insertText = useCallback(
    (text: string, options?: { skipLeadingSpace?: boolean }) => {
      const selectionStart = selectionRef.current.start;
      const selectionEnd = selectionRef.current.end;
      const {
        nextValue,
        selectionStart: nextStart,
        selectionEnd: nextEnd,
      } = insertTextAtCursor({
        currentValue: value,
        selectionStart,
        selectionEnd,
        text,
        skipLeadingSpace: options?.skipLeadingSpace,
      });

      applyImmediateChange({
        value: nextValue,
        selectionStart: nextStart,
        selectionEnd: nextEnd,
      });
      restoreSnapshotSelection(nextStart, nextEnd, nextValue);
    },
    [applyImmediateChange, restoreSnapshotSelection, selectionRef, value]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      if (!event.clipboardData) {
        return;
      }

      const resolution = resolveWordPaste(event.clipboardData);
      if (!resolution || resolution.kind === 'plain') {
        return;
      }

      event.preventDefault();
      syncSelectionFromElement();
      insertText(resolution.text);

      if (resolution.kind === 'ascii') {
        toast.success('Pasted as editable equation text.', { autoClose: 3000 });
      } else {
        toast.success('Pasted Word equation for preview and re-copy.', { autoClose: 3000 });
      }
    },
    [insertText, syncSelectionFromElement]
  );

  const applyAlign = useCallback(
    (align: TextAlign) => {
      const modelValue = getValue();
      const { displayStart, displayEnd } = readDisplaySelection();
      const { start, end } = displaySelectionToModel(modelValue, displayStart, displayEnd);
      selectionRef.current = { start, end };

      const { nextValue, selectionStart, selectionEnd } = applyAlignmentAtCursor(
        modelValue,
        start,
        align
      );

      applyImmediateChange({
        value: nextValue,
        selectionStart,
        selectionEnd,
      });
      restoreSnapshotSelection(selectionStart, selectionEnd, nextValue);
    },
    [
      applyImmediateChange,
      displaySelectionToModel,
      getValue,
      readDisplaySelection,
      restoreSnapshotSelection,
      selectionRef,
    ]
  );

  const applyInlineFormat = useCallback(
    (format: InlineFormat) => {
      const modelValue = getValue();
      // Trust selectionRef, not the textarea. After formatting, the controlled
      // textarea often still reports the whole styled run as selected even though
      // the model caret was collapsed — reading that range would unwrap.
      const { start, end } = selectionRef.current;

      const { nextValue, selectionStart, selectionEnd } = toggleInlineFormat(
        modelValue,
        start,
        end,
        format
      );

      applyImmediateChange({
        value: nextValue,
        selectionStart,
        selectionEnd,
      });
      commitModelSelection(selectionStart, selectionEnd, nextValue);
    },
    [applyImmediateChange, commitModelSelection, getValue, selectionRef]
  );

  const applyListFormat = useCallback(
    (list: ListFormat) => {
      const modelValue = getValue();
      const { displayStart, displayEnd } = readDisplaySelection();
      const { start, end } = displaySelectionToModel(modelValue, displayStart, displayEnd);
      selectionRef.current = { start, end };

      const { nextValue, selectionStart, selectionEnd } = toggleListFormat(
        modelValue,
        start,
        end,
        list
      );

      applyImmediateChange({
        value: nextValue,
        selectionStart,
        selectionEnd,
      });
      restoreSnapshotSelection(selectionStart, selectionEnd, nextValue);
    },
    [
      applyImmediateChange,
      displaySelectionToModel,
      getValue,
      readDisplaySelection,
      restoreSnapshotSelection,
      selectionRef,
    ]
  );

  return {
    value,
    setValue: handleChange,
    insertEquation,
    insertText,
    applyAlign,
    applyInlineFormat,
    applyListFormat,
    activeAlign,
    activeInlineFormats,
    activeListFormat,
    focusEditor,
    handleCursorChange,
    handleUserSelectionIntent,
    handleKeyDown,
    handlePaste,
    syncSelectionFromElement,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};

export default useEquationInsertion;
