import { screen } from '@testing-library/react';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import EquationPreview from './EquationPreview';

describe('EquationPreview', () => {
  it('renders the preview heading and empty state', () => {
    renderWithProviders(<EquationPreview editorText="" />);

    expect(screen.getByRole('heading', { name: /word-style preview/i })).toBeInTheDocument();
    expect(screen.getByText(/formula preview will appear here/i)).toBeInTheDocument();
  });

  it('renders math preview markup for a matrix', () => {
    renderWithProviders(
      <EquationPreview editorText={['[ a11  a12 ]', '[ a21  a22 ]'].join('\n')} />
    );

    expect(screen.getByTestId('equation-preview-math')).toBeInTheDocument();
  });
});
