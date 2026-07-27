import { useCallback, useEffect, useState } from 'react';

import LocalStorageManager from '@/managers/LocalStorageManger';

import { Equation } from '@/models/Equation';

import { upsertRecentEquation } from '@/utils/recentEquations';

import { LocalStorageKeys, MAX_RECENT_EQUATIONS } from '@/constants/Constants';

const readStoredRecentEquations = (): Equation[] => {
  const stored = LocalStorageManager.getItem(LocalStorageKeys.RECENT_EQUATIONS);

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.filter(
    (item): item is Equation =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.template === 'string' &&
      Array.isArray(item.expectedVariables)
  );
};

const useRecentEquations = () => {
  const [recentEquations, setRecentEquations] = useState<Equation[]>(() =>
    readStoredRecentEquations()
  );

  useEffect(() => {
    LocalStorageManager.setItem(LocalStorageKeys.RECENT_EQUATIONS, recentEquations);
  }, [recentEquations]);

  const addRecentEquation = useCallback((equation: Equation) => {
    setRecentEquations((current) => upsertRecentEquation(current, equation, MAX_RECENT_EQUATIONS));
  }, []);

  const clearRecentEquations = useCallback(() => {
    setRecentEquations([]);
  }, []);

  return {
    recentEquations,
    addRecentEquation,
    clearRecentEquations,
  };
};

export default useRecentEquations;
