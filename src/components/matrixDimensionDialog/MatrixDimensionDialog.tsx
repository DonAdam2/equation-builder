import { FormEvent, useId, useState } from 'react';

import { MatrixDimensionDialogProps } from '@/components/matrixDimensionDialog/MatrixDimensionDialog.types';
import Modal from '@/components/shared/modal/Modal';

import { clampMatrixDimension } from '@/utils/matrixTemplate';

const MatrixDimensionDialog = ({
  isOpen,
  equation,
  onConfirm,
  onCancel,
  defaultRows = 2,
  defaultCols = 2,
  defaultRightCols = 2,
}: MatrixDimensionDialogProps) => {
  const formId = useId();
  const [rows, setRows] = useState(defaultRows);
  const [cols, setCols] = useState(defaultCols);
  const [rightCols, setRightCols] = useState(defaultRightCols);

  if (!equation) {
    return null;
  }

  const isAddition = equation.interactiveKind === 'matrix-addition';
  const isMultiplication = equation.interactiveKind === 'matrix-multiplication';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm({
      rows: clampMatrixDimension(rows),
      cols: clampMatrixDimension(cols),
      ...(isMultiplication ? { rightCols: clampMatrixDimension(rightCols) } : {}),
    });
  };

  const safeRows = clampMatrixDimension(rows);
  const safeCols = clampMatrixDimension(cols);
  const safeRightCols = clampMatrixDimension(rightCols);

  const description = isMultiplication
    ? 'Choose A rows, the shared inner dimension, and B columns (A is m×n, B is n×p).'
    : isAddition
      ? 'Choose rows and columns for both matrices in the addition.'
      : 'Choose how many rows and columns the matrix should have.';

  const preview = isMultiplication
    ? `A: ${safeRows}×${safeCols}  ×  B: ${safeCols}×${safeRightCols}`
    : isAddition
      ? `Preview size: ${safeRows} × ${safeCols} + same-sized matrix`
      : `Preview size: ${safeRows} × ${safeCols}`;

  return (
    <Modal
      className="matrix-dimension-dialog"
      maxWidth={420}
      header={{
        title: equation.name,
        isCloseButton: true,
      }}
      footer={{
        enableFooter: true,
        footerButtons: [
          {
            label: 'Cancel',
            variant: 'secondary',
            isOutlined: true,
            type: 'button',
            onClick: onCancel,
          },
          {
            label: isMultiplication ? 'Insert product' : 'Insert matrix',
            variant: 'primary',
            type: 'submit',
            form: formId,
          },
        ],
      }}
      wrapper={{
        show: isOpen,
        closeHandler: onCancel,
        isAnimate: true,
        animationType: 'slide-in-down',
        targetElementId: 'root',
      }}
    >
      <p className="matrix-dimension-dialog-description">{description}</p>

      <form
        id={formId}
        className={`matrix-dimension-dialog-form${isMultiplication ? ' is-multiplication' : ''}`}
        onSubmit={handleSubmit}
      >
        <label>
          {isMultiplication ? 'A rows (m)' : 'Rows'}
          <input
            type="number"
            min={1}
            max={10}
            value={rows}
            onChange={(event) => setRows(Number(event.target.value))}
            autoFocus
          />
        </label>
        <label>
          {isMultiplication ? 'Shared dim (n)' : 'Columns'}
          <input
            type="number"
            min={1}
            max={10}
            value={cols}
            onChange={(event) => setCols(Number(event.target.value))}
          />
        </label>

        {isMultiplication ? (
          <label className="matrix-dimension-dialog-right-cols">
            B columns (p)
            <input
              type="number"
              min={1}
              max={10}
              value={rightCols}
              onChange={(event) => setRightCols(Number(event.target.value))}
            />
          </label>
        ) : null}

        <div className="matrix-dimension-dialog-preview" aria-live="polite">
          {preview}
        </div>
      </form>
    </Modal>
  );
};

export default MatrixDimensionDialog;
