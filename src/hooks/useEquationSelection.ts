import { useCallback } from 'react';

import { Equation } from '@/models/Equation';

interface UseEquationSelectionParams {
  insertEquation: (equation: Equation) => void;
  addRecentEquation: (equation: Equation) => void;
}

/** Inserts an equation and records it in recent pills (catalog entry). */
const useEquationSelection = ({
  insertEquation,
  addRecentEquation,
}: UseEquationSelectionParams) => {
  const selectEquation = useCallback(
    (catalogEquation: Equation, insertableEquation: Equation = catalogEquation) => {
      addRecentEquation(catalogEquation);
      insertEquation(insertableEquation);
    },
    [addRecentEquation, insertEquation]
  );

  return { selectEquation };
};

export default useEquationSelection;
