import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import { Equation } from '@/models/Equation';

import MatrixDimensionDialog from './MatrixDimensionDialog';

const matrixEquation: Equation = {
  id: 'matrix',
  name: 'Matrix',
  description: 'Build a matrix',
  template: '[ a11  a12 ]\n[ a21  a22 ]',
  expectedVariables: ['a11', 'a12', 'a21', 'a22'],
  interactiveKind: 'matrix',
};

const multiplicationEquation: Equation = {
  id: 'matrix-multiply',
  name: 'Matrix Multiplication',
  description: 'Build A × B',
  template: '[ a11  a12 ] × [ b11  b12 ]\n[ a21  a22 ]   [ b21  b22 ]',
  expectedVariables: ['a11', 'a12', 'a21', 'a22', 'b11', 'b12', 'b21', 'b22'],
  interactiveKind: 'matrix-multiplication',
};

describe('MatrixDimensionDialog', () => {
  it('submits chosen rows and columns', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    renderWithProviders(
      <MatrixDimensionDialog
        isOpen
        equation={matrixEquation}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    const rowsInput = await screen.findByLabelText(/rows/i);
    const colsInput = screen.getByLabelText(/columns/i);

    await user.clear(rowsInput);
    await user.type(rowsInput, '3');
    await user.clear(colsInput);
    await user.type(colsInput, '4');
    await user.click(screen.getByRole('button', { name: /insert matrix/i }));

    expect(onConfirm).toHaveBeenCalledWith({ rows: 3, cols: 4 });
  });

  it('submits multiplication dimensions including right columns', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    renderWithProviders(
      <MatrixDimensionDialog
        isOpen
        equation={multiplicationEquation}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    await screen.findByLabelText(/a rows/i);
    await user.clear(screen.getByLabelText(/a rows/i));
    await user.type(screen.getByLabelText(/a rows/i), '2');
    await user.clear(screen.getByLabelText(/shared dim/i));
    await user.type(screen.getByLabelText(/shared dim/i), '3');
    await user.clear(screen.getByLabelText(/b columns/i));
    await user.type(screen.getByLabelText(/b columns/i), '4');
    await user.click(screen.getByRole('button', { name: /insert product/i }));

    expect(onConfirm).toHaveBeenCalledWith({ rows: 2, cols: 3, rightCols: 4 });
  });

  it('cancels from the modal close control', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    renderWithProviders(
      <MatrixDimensionDialog
        isOpen
        equation={matrixEquation}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    await screen.findByRole('dialog', { name: /matrix/i });
    await user.click(screen.getByTestId('modal-header-close-btn'));
    expect(onCancel).toHaveBeenCalled();
  });
});
