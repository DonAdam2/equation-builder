import { ClipboardEvent, KeyboardEvent, RefObject, useCallback, useState } from 'react';

import { toast } from 'react-toastify';

import useEditorHistory from '@/hooks/useEditorHistory';

import { Equation } from '@/models/Equation';

import { insertTemplateAtCursor, insertTextAtCursor } from '@/utils/equationCursor';
import {
  applyDisplayEdit,
  buildRichTextDisplay,
  displayCaretToModel,
  modelCaretToDisplay,
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

  const syncSelectionFromElement = useCallback(() => {
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
    syncFormatState(modelValue, mapped.start, mapped.end);
  }, [displaySelectionToModel, getValue, selectionRef, syncFormatState, textareaRef]);

  const restoreSnapshotSelection = useCallback(
    (selectionStart: number, selectionEnd: number, modelValue = getValue()) => {
      requestAnimationFrame(() => {
        const editor = textareaRef.current;
        if (!editor) {
          return;
        }

        const map = buildRichTextDisplay(modelValue);
        const displayStart = modelCaretToDisplay(map, selectionStart);
        const displayEnd = modelCaretToDisplay(map, selectionEnd);

        editor.focus();
        editor.setSelectionRange(displayStart, displayEnd);
        selectionRef.current = {
          start: selectionStart,
          end: selectionEnd,
        };
        syncFormatState(modelValue, selectionStart, selectionEnd);
      });
    },
    [getValue, selectionRef, syncFormatState, textareaRef]
  );

  /** Textarea onChange provides marker-free display text; map back onto the model. */
  const handleChange = useCallback(
    (nextDisplay: string) => {
      const { nextModel, displayCaret } = applyDisplayEdit(getValue(), nextDisplay);
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
          applyImmediateChange({
            value: result.nextValue,
            selectionStart: result.selectionStart,
            selectionEnd: result.selectionEnd,
          });
          restoreSnapshotSelection(result.selectionStart, result.selectionEnd, result.nextValue);
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
      const { displayStart, displayEnd } = readDisplaySelection();
      const { start, end } = displaySelectionToModel(modelValue, displayStart, displayEnd);
      selectionRef.current = { start, end };

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
