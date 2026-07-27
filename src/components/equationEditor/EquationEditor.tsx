import { useMemo, useState } from 'react';

import { EquationEditorProps } from '@/components/equationEditor/EquationEditor.types';
import EquationWysiwygToolbar from '@/components/equationWysiwygToolbar/EquationWysiwygToolbar';
import SymbolKeyboard from '@/components/symbolKeyboard/SymbolKeyboard';

import { modelToMirrorHtml, toDisplayText } from '@/utils/richTextDisplay';

const EquationEditor = ({
  value,
  onChange,
  textareaRef,
  onCursorChange,
  onUserSelectionIntent,
  onKeyDown,
  onCopy,
  onPaste,
  onInsertSymbol,
  onUndo,
  onRedo,
  onAlign,
  onInlineFormat,
  onListFormat,
  activeAlign = 'left',
  activeInlineFormats = [],
  activeListFormat = null,
  isUndoDisabled = true,
  isRedoDisabled = true,
  placeholder = 'Start writing your notes, then insert equations at the cursor…',
}: EquationEditorProps) => {
  const [isSymbolsOpen, setIsSymbolsOpen] = useState(false);
  const displayValue = useMemo(() => toDisplayText(value), [value]);
  const mirrorHtml = useMemo(() => modelToMirrorHtml(value), [value]);

  return (
    <div className="equation-editor-wrapper">
      <label className="equation-editor-label" htmlFor="equation-builder-input">
        Equation Builder
      </label>

      <div className="equation-editor-surface">
        <EquationWysiwygToolbar
          onUndo={onUndo}
          onRedo={onRedo}
          onAlign={onAlign}
          onInlineFormat={onInlineFormat}
          onListFormat={onListFormat}
          activeAlign={activeAlign}
          activeInlineFormats={activeInlineFormats}
          activeListFormat={activeListFormat}
          isUndoDisabled={isUndoDisabled}
          isRedoDisabled={isRedoDisabled}
          onToggleSymbols={
            onInsertSymbol ? () => setIsSymbolsOpen((current) => !current) : undefined
          }
          isSymbolsOpen={isSymbolsOpen}
        />

        <div className="equation-editor-input-stack">
          <div
            className="equation-editor-mirror"
            aria-hidden="true"
            data-testid="equation-editor-mirror"
            dangerouslySetInnerHTML={{ __html: mirrorHtml }}
          />
          <textarea
            id="equation-builder-input"
            ref={textareaRef}
            className="equation-editor-input"
            value={displayValue}
            onChange={(event) =>
              onChange(event.target.value, event.target.selectionStart ?? undefined)
            }
            onMouseDown={onUserSelectionIntent}
            onSelect={onCursorChange}
            onKeyUp={onCursorChange}
            onKeyDown={onKeyDown}
            onCopy={onCopy}
            onPaste={onPaste}
            onClick={onCursorChange}
            onBlur={onCursorChange}
            onScroll={(event) => {
              const mirror = event.currentTarget.previousElementSibling;
              if (mirror instanceof HTMLElement) {
                mirror.scrollTop = event.currentTarget.scrollTop;
                mirror.scrollLeft = event.currentTarget.scrollLeft;
              }
            }}
            placeholder={placeholder}
            spellCheck={false}
            aria-label="Equation builder input"
          />
        </div>
      </div>

      {onInsertSymbol && isSymbolsOpen ? (
        <SymbolKeyboard
          onInsert={onInsertSymbol}
          isOpen
          onOpenChange={setIsSymbolsOpen}
          showToggle={false}
        />
      ) : null}
    </div>
  );
};

export default EquationEditor;
