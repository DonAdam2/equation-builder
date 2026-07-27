import { Equation } from '@/models/Equation';

import { MAX_RECENT_EQUATIONS } from '@/constants/Constants';

export const upsertRecentEquation = (
  recentEquations: Equation[],
  equation: Equation,
  maxItems = MAX_RECENT_EQUATIONS
): Equation[] => {
  const withoutDuplicate = recentEquations.filter((item) => item.id !== equation.id);
  return [equation, ...withoutDuplicate].slice(0, maxItems);
};
