import { ClipboardEvent, useCallback, useRef, useState } from 'react';

import useEquationInsertion from '@/hooks/useEquationInsertion';
import useInteractiveEquation from '@/hooks/useInteractiveEquation';
import useRecentEquations from '@/hooks/useRecentEquations';

import EquationBuilderLayout from '@/components/equationBuilderLayout/EquationBuilderLayout';
import EquationEditor from '@/components/equationEditor/EquationEditor';
import EquationPills from '@/components/equationPills/EquationPills';
import EquationPreview from '@/components/equationPreview/EquationPreview';
import EquationTable from '@/components/equationTable/EquationTable';
import EquationToolbar from '@/components/equationToolbar/EquationToolbar';
import MatrixDimensionDialog from '@/components/matrixDimensionDialog/MatrixDimensionDialog';

import { Equation } from '@/models/Equation';

import { equations } from '@/data/equations';

import { downloadWordStyleAsPdf } from '@/utils/downloadPdf';
import { TextAlign } from '@/utils/textAlignment';
import { copyWordStyleFormula, writeWordStyleToClipboardEvent } from '@/utils/wordClipboard';

const EquationBuilderPage = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const { recentEquations, addRecentEquation } = useRecentEquations();
  const {
    value,
    setValue,
    insertEquation,
    insertText,
    applyAlign,
    applyInlineFormat,
    applyListFormat,
    activeAlign,
    activeInlineFormats,
    activeListFormat,
    handleCursorChange,
    handleUserSelectionIntent,
    handleKeyDown,
    handlePaste,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEquationInsertion({
    textareaRef,
  });

  const handleInsertSymbol = useCallback(
    (character: string) => {
      insertText(character, { skipLeadingSpace: true });
    },
    [insertText]
  );

  const handleInsert = useCallback(
    (catalogEquation: Equation, insertableEquation: Equation) => {
      addRecentEquation(catalogEquation);
      insertEquation(insertableEquation);
    },
    [addRecentEquation, insertEquation]
  );

  const {
    pendingEquation,
    isMatrixDialogOpen,
    selectEquation,
    confirmMatrixDimensions,
    cancelMatrixDialog,
  } = useInteractiveEquation({ onInsert: handleInsert });

  const handleCopy = useCallback(async () => {
    return copyWordStyleFormula({
      editorText: value,
      plainFallback: value,
    });
  }, [value]);

  const handleEditorCopy = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      writeWordStyleToClipboardEvent(event.nativeEvent, {
        editorText: value,
        plainFallback: value,
      });
    },
    [value]
  );

  const handleAlign = useCallback(
    (align: TextAlign) => {
      applyAlign(align);
    },
    [applyAlign]
  );

  const handleDownloadPdf = useCallback(() => {
    void downloadWordStyleAsPdf(value, 'ai-formula-builder.pdf')
      .then(() => {
        setStatusMessage('Word-style PDF downloaded.');
      })
      .catch(() => {
        setStatusMessage('Unable to download PDF. Please try again.');
      });
  }, [value]);

  return (
    <div className="equation-builder-wrapper">
      <EquationBuilderLayout
        editor={
          <EquationEditor
            value={value}
            onChange={setValue}
            textareaRef={textareaRef}
            onCursorChange={handleCursorChange}
            onUserSelectionIntent={handleUserSelectionIntent}
            onKeyDown={handleKeyDown}
            onCopy={handleEditorCopy}
            onPaste={handlePaste}
            onInsertSymbol={handleInsertSymbol}
            onUndo={undo}
            onRedo={redo}
            onAlign={handleAlign}
            onInlineFormat={applyInlineFormat}
            onListFormat={applyListFormat}
            activeAlign={activeAlign}
            activeInlineFormats={activeInlineFormats}
            activeListFormat={activeListFormat}
            isUndoDisabled={!canUndo}
            isRedoDisabled={!canRedo}
          />
        }
        preview={<EquationPreview editorText={value} />}
        toolbar={
          <EquationToolbar
            onCopy={handleCopy}
            onDownloadPdf={handleDownloadPdf}
            isCopyDisabled={!value.trim()}
            isDownloadDisabled={!value.trim()}
            statusMessage={statusMessage}
          />
        }
        pills={<EquationPills equations={recentEquations} onPillClick={selectEquation} />}
        table={<EquationTable equations={equations} onEquationSelect={selectEquation} />}
      />

      <MatrixDimensionDialog
        key={pendingEquation?.id ?? 'matrix-dialog-closed'}
        isOpen={isMatrixDialogOpen}
        equation={pendingEquation}
        onConfirm={confirmMatrixDimensions}
        onCancel={cancelMatrixDialog}
      />
    </div>
  );
};

export default EquationBuilderPage;
