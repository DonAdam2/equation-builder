import { screen } from '@testing-library/react';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import EquationBuilderLayout from './EquationBuilderLayout';

describe('EquationBuilderLayout', () => {
  it('renders provided sections', () => {
    renderWithProviders(
      <EquationBuilderLayout
        editor={<div>editor</div>}
        preview={<div>preview</div>}
        toolbar={<div>toolbar</div>}
        pills={<div>pills</div>}
        table={<div>table</div>}
      />
    );

    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.getByText('preview')).toBeInTheDocument();
    expect(screen.getByText('toolbar')).toBeInTheDocument();
    expect(screen.getByText('pills')).toBeInTheDocument();
    expect(screen.getByText('table')).toBeInTheDocument();
  });
});
