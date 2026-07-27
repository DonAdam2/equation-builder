import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import { Equation } from '@/models/Equation';

import EquationPills from './EquationPills';

const sampleEquation: Equation = {
  id: 'mse',
  name: 'MSE',
  description: 'Mean Squared Error',
  template: 'MSE(y, ŷ)',
  expectedVariables: ['y', 'ŷ'],
};

describe('EquationPills', () => {
  it('calls onPillClick when a pill is clicked', async () => {
    const user = userEvent.setup();
    const onPillClick = jest.fn();

    renderWithProviders(<EquationPills equations={[sampleEquation]} onPillClick={onPillClick} />);

    await user.click(screen.getByRole('button', { name: 'MSE' }));
    expect(onPillClick).toHaveBeenCalledWith(sampleEquation);
  });
});
