import { screen } from '@testing-library/react';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import EquationBuilderPage from './EquationBuilderPage';

describe('EquationBuilderPage', () => {
  it('renders the main builder sections', () => {
    renderWithProviders(<EquationBuilderPage />);

    expect(screen.getByRole('heading', { name: /ai formula builder/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/equation builder input/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recent equations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /equation library/i })).toBeInTheDocument();
  });
});
