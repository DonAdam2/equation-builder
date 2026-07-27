import { useCallback, useState } from 'react';

import { Equation, MatrixDimensions } from '@/models/Equation';

import {
  buildFractionEquation,
  buildInteractiveMatrixEquation,
  requiresMatrixDimensions,
} from '@/utils/matrixTemplate';

interface UseInteractiveEquationParams {
  onInsert: (catalogEquation: Equation, insertableEquation: Equation) => void;
}

const useInteractiveEquation = ({ onInsert }: UseInteractiveEquationParams) => {
  const [pendingEquation, setPendingEquation] = useState<Equation | null>(null);

  const selectEquation = useCallback(
    (equation: Equation) => {
      if (requiresMatrixDimensions(equation)) {
        setPendingEquation(equation);
        return;
      }

      if (equation.interactiveKind === 'fraction') {
        onInsert(equation, buildFractionEquation(equation));
        return;
      }

      onInsert(equation, equation);
    },
    [onInsert]
  );

  const confirmMatrixDimensions = useCallback(
    (dimensions: MatrixDimensions) => {
      if (!pendingEquation) {
        return;
      }

      onInsert(pendingEquation, buildInteractiveMatrixEquation(pendingEquation, dimensions));
      setPendingEquation(null);
    },
    [onInsert, pendingEquation]
  );

  const cancelMatrixDialog = useCallback(() => {
    setPendingEquation(null);
  }, []);

  return {
    pendingEquation,
    isMatrixDialogOpen: Boolean(pendingEquation),
    selectEquation,
    confirmMatrixDimensions,
    cancelMatrixDialog,
  };
};

export default useInteractiveEquation;
