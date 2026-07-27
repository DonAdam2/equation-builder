import { screen } from '@testing-library/react';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import { Equation } from '@/models/Equation';

import EquationTable from './EquationTable';

const sampleEquations: Equation[] = [
  {
    id: 'mse',
    name: 'MSE',
    description: 'Mean Squared Error',
    template: 'MSE(y, ŷ)',
    expectedVariables: ['y', 'ŷ'],
  },
];

describe('EquationTable', () => {
  it('renders equation library content', () => {
    renderWithProviders(<EquationTable equations={sampleEquations} onEquationSelect={jest.fn()} />);

    expect(screen.getByRole('heading', { name: /equation library/i })).toBeInTheDocument();
    expect(screen.getByText('MSE')).toBeInTheDocument();
  });
});
