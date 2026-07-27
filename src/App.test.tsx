import { screen } from '@testing-library/react';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import App from './App';

describe('App Component', () => {
  it('Should render the equation builder page', async () => {
    renderWithProviders(<App />);
    const title = await screen.findByRole('heading', { name: /ai formula builder/i });
    expect(title).toBeInTheDocument();
  });
});
