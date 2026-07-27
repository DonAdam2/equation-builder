import { createRef } from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import EquationEditor from './EquationEditor';

describe('EquationEditor', () => {
  it('renders a controlled textarea', () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    renderWithProviders(
      <EquationEditor value="MSE(y, ŷ)" onChange={jest.fn()} textareaRef={textareaRef} />
    );

    expect(screen.getByDisplayValue('MSE(y, ŷ)')).toBeInTheDocument();
  });

  it('hides format markers in the input and styles them in the mirror', () => {
    const textareaRef = createRef<HTMLTextAreaElement>();

    renderWithProviders(
      <EquationEditor
        value="Hello {{b}}world{{/b}}"
        onChange={jest.fn()}
        textareaRef={textareaRef}
      />
    );

    expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/\{\{b\}\}/)).not.toBeInTheDocument();
    expect(screen.getByTestId('equation-editor-mirror').innerHTML).toContain('<b>world</b>');
  });

  it('shows the wysiwyg toolbar and opens symbols from it', async () => {
    const user = userEvent.setup();
    const textareaRef = createRef<HTMLTextAreaElement>();

    renderWithProviders(
      <EquationEditor
        value=""
        onChange={jest.fn()}
        textareaRef={textareaRef}
        onInsertSymbol={jest.fn()}
        onUndo={jest.fn()}
        onRedo={jest.fn()}
        onAlign={jest.fn()}
        isUndoDisabled={false}
        isRedoDisabled={false}
      />
    );

    expect(screen.getByTestId('equation-wysiwyg-toolbar')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /insert symbol/i }));
    expect(screen.getByTestId('symbol-keyboard-panel')).toBeInTheDocument();
  });
});
