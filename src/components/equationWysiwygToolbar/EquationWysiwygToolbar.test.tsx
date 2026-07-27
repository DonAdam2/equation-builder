import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import EquationWysiwygToolbar from './EquationWysiwygToolbar';

describe('EquationWysiwygToolbar', () => {
  it('triggers undo, redo, align, and symbol actions', async () => {
    const user = userEvent.setup();
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    const onAlign = jest.fn();
    const onInlineFormat = jest.fn();
    const onListFormat = jest.fn();
    const onToggleSymbols = jest.fn();

    renderWithProviders(
      <EquationWysiwygToolbar
        onUndo={onUndo}
        onRedo={onRedo}
        onAlign={onAlign}
        onInlineFormat={onInlineFormat}
        onListFormat={onListFormat}
        onToggleSymbols={onToggleSymbols}
        activeAlign="left"
        isUndoDisabled={false}
        isRedoDisabled={false}
      />
    );

    await user.click(screen.getByRole('button', { name: /^undo$/i }));
    await user.click(screen.getByRole('button', { name: /^redo$/i }));
    await user.click(screen.getByRole('button', { name: /^bold$/i }));
    await user.click(screen.getByRole('button', { name: /bullet list/i }));
    await user.click(screen.getByRole('button', { name: /align center/i }));
    await user.click(screen.getByRole('button', { name: /insert symbol/i }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onInlineFormat).toHaveBeenCalledWith('bold');
    expect(onListFormat).toHaveBeenCalledWith('bullet');
    expect(onAlign).toHaveBeenCalledWith('center');
    expect(onToggleSymbols).toHaveBeenCalledTimes(1);
  });
});
