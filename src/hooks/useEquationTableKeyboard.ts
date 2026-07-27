import { KeyboardEvent, RefObject, useCallback, useEffect, useState } from 'react';

import { Equation } from '@/models/Equation';

interface UseEquationTableKeyboardParams {
  containerRef: RefObject<HTMLDivElement | null>;
  equations: Equation[];
  onSelect: (equation: Equation) => void;
  onEscape?: () => void;
}

const ACTIVE_ROW_CLASS = 'is-keyboard-active';

const useEquationTableKeyboard = ({
  containerRef,
  equations,
  onSelect,
  onEscape,
}: UseEquationTableKeyboardParams) => {
  const [activeEquationId, setActiveEquationId] = useState<string | null>(null);

  const getVisibleRowElements = useCallback((): HTMLTableRowElement[] => {
    const container = containerRef.current;
    if (!container) {
      return [];
    }

    return Array.from(container.querySelectorAll<HTMLTableRowElement>('tr.body-tr'));
  }, [containerRef]);

  const getEquationIdFromRow = (row: HTMLTableRowElement): string | null =>
    row.querySelector<HTMLElement>('[data-equation-id]')?.dataset.equationId ?? null;

  useEffect(() => {
    const rows = getVisibleRowElements();

    rows.forEach((row) => {
      const equationId = getEquationIdFromRow(row);
      row.classList.toggle(
        ACTIVE_ROW_CLASS,
        Boolean(equationId && equationId === activeEquationId)
      );
    });
  }, [activeEquationId, equations, getVisibleRowElements]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const rows = getVisibleRowElements();
      if (!rows.length) {
        return;
      }

      const visibleIds = rows
        .map((row) => getEquationIdFromRow(row))
        .filter((id): id is string => Boolean(id));

      if (!visibleIds.length) {
        return;
      }

      const currentIndex = activeEquationId ? visibleIds.indexOf(activeEquationId) : -1;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % visibleIds.length;
        setActiveEquationId(visibleIds[nextIndex]);
        rows[nextIndex]?.scrollIntoView({ block: 'nearest' });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex =
          currentIndex <= 0 ? visibleIds.length - 1 : (currentIndex - 1) % visibleIds.length;
        setActiveEquationId(visibleIds[nextIndex]);
        rows[nextIndex]?.scrollIntoView({ block: 'nearest' });
        return;
      }

      if (event.key === 'Enter' && activeEquationId) {
        event.preventDefault();
        const equation = equations.find((item) => item.id === activeEquationId);
        if (equation) {
          onSelect(equation);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setActiveEquationId(null);
        onEscape?.();
        event.currentTarget.blur();
      }
    },
    [activeEquationId, equations, getVisibleRowElements, onEscape, onSelect]
  );

  return {
    activeEquationId,
    setActiveEquationId,
    handleKeyDown,
  };
};

export default useEquationTableKeyboard;
