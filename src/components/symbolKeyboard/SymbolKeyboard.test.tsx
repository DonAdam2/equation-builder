import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import SymbolKeyboard from './SymbolKeyboard';

describe('SymbolKeyboard', () => {
  it('opens the symbol panel and inserts a clicked character', async () => {
    const user = userEvent.setup();
    const onInsert = jest.fn();

    renderWithProviders(<SymbolKeyboard onInsert={onInsert} />);

    await user.click(screen.getByRole('button', { name: /insert symbol/i }));
    expect(screen.getByTestId('symbol-keyboard-panel')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /symbols/i })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', { name: 'Insert λ' }));
    expect(onInsert).toHaveBeenCalledWith('λ');
  });

  it('switches to special characters and inserts from the list', async () => {
    const user = userEvent.setup();
    const onInsert = jest.fn();

    renderWithProviders(<SymbolKeyboard onInsert={onInsert} />);

    await user.click(screen.getByRole('button', { name: /insert symbol/i }));
    await user.click(screen.getByRole('tab', { name: /special characters/i }));
    await user.click(screen.getByRole('button', { name: /insert em dash/i }));

    expect(onInsert).toHaveBeenCalledWith('—');
  });
});
