import { MutableRefObject, useCallback, useRef, useState } from 'react';

import { EditorSnapshot } from '@/models/EditorHistory';

const MAX_HISTORY = 100;
const TYPING_IDLE_MS = 400;

interface UseEditorHistoryResult {
  value: string;
  canUndo: boolean;
  canRedo: boolean;
  selectionRef: MutableRefObject<{ start: number; end: number }>;
  applyTypingChange: (nextValue: string) => void;
  applyImmediateChange: (snapshot: EditorSnapshot) => void;
  undo: () => EditorSnapshot | null;
  redo: () => EditorSnapshot | null;
  getCurrentSnapshot: () => EditorSnapshot;
  /** Latest model value (avoids stale React state during rapid typing). */
  getValue: () => string;
}

const useEditorHistory = (): UseEditorHistoryResult => {
  const [value, setValue] = useState('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const selectionRef = useRef({ start: 0, end: 0 });
  const undoStackRef = useRef<EditorSnapshot[]>([]);
  const redoStackRef = useRef<EditorSnapshot[]>([]);
  const isTypingBurstRef = useRef(false);
  const typingIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef('');

  const syncCapabilityFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const getCurrentSnapshot = useCallback(
    (): EditorSnapshot => ({
      value: valueRef.current,
      selectionStart: selectionRef.current.start,
      selectionEnd: selectionRef.current.end,
    }),
    []
  );

  const pushUndoSnapshot = useCallback(
    (snapshot: EditorSnapshot) => {
      const last = undoStackRef.current[undoStackRef.current.length - 1];
      if (last?.value === snapshot.value) {
        return;
      }

      undoStackRef.current = [...undoStackRef.current, snapshot].slice(-MAX_HISTORY);
      redoStackRef.current = [];
      syncCapabilityFlags();
    },
    [syncCapabilityFlags]
  );

  const endTypingBurst = useCallback(() => {
    isTypingBurstRef.current = false;
    if (typingIdleTimerRef.current) {
      clearTimeout(typingIdleTimerRef.current);
      typingIdleTimerRef.current = null;
    }
  }, []);

  const applyTypingChange = useCallback(
    (nextValue: string) => {
      if (!isTypingBurstRef.current) {
        pushUndoSnapshot(getCurrentSnapshot());
        isTypingBurstRef.current = true;
      }

      valueRef.current = nextValue;
      setValue(nextValue);

      if (typingIdleTimerRef.current) {
        clearTimeout(typingIdleTimerRef.current);
      }

      typingIdleTimerRef.current = setTimeout(() => {
        isTypingBurstRef.current = false;
        typingIdleTimerRef.current = null;
      }, TYPING_IDLE_MS);
    },
    [getCurrentSnapshot, pushUndoSnapshot]
  );

  const applyImmediateChange = useCallback(
    (snapshot: EditorSnapshot) => {
      endTypingBurst();
      pushUndoSnapshot(getCurrentSnapshot());

      valueRef.current = snapshot.value;
      selectionRef.current = {
        start: snapshot.selectionStart,
        end: snapshot.selectionEnd,
      };
      setValue(snapshot.value);
    },
    [endTypingBurst, getCurrentSnapshot, pushUndoSnapshot]
  );

  const undo = useCallback((): EditorSnapshot | null => {
    endTypingBurst();
    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    if (!previous) {
      return null;
    }

    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, getCurrentSnapshot()].slice(-MAX_HISTORY);

    valueRef.current = previous.value;
    selectionRef.current = {
      start: previous.selectionStart,
      end: previous.selectionEnd,
    };
    setValue(previous.value);
    syncCapabilityFlags();
    return previous;
  }, [endTypingBurst, getCurrentSnapshot, syncCapabilityFlags]);

  const redo = useCallback((): EditorSnapshot | null => {
    endTypingBurst();
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    if (!next) {
      return null;
    }

    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, getCurrentSnapshot()].slice(-MAX_HISTORY);

    valueRef.current = next.value;
    selectionRef.current = {
      start: next.selectionStart,
      end: next.selectionEnd,
    };
    setValue(next.value);
    syncCapabilityFlags();
    return next;
  }, [endTypingBurst, getCurrentSnapshot, syncCapabilityFlags]);

  const getValue = useCallback(() => valueRef.current, []);

  return {
    value,
    canUndo,
    canRedo,
    selectionRef,
    applyTypingChange,
    applyImmediateChange,
    undo,
    redo,
    getCurrentSnapshot,
    getValue,
  };
};

export default useEditorHistory;
