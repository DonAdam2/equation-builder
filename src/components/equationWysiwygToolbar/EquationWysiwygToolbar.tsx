import { ReactElement } from 'react';

import { EquationWysiwygToolbarProps } from '@/components/equationWysiwygToolbar/EquationWysiwygToolbar.types';

import { TextAlign } from '@/utils/textAlignment';
import { InlineFormat, ListFormat } from '@/utils/textFormatting';

const ALIGN_OPTIONS: Array<{ align: TextAlign; title: string }> = [
  { align: 'left', title: 'Align left' },
  { align: 'center', title: 'Align center' },
  { align: 'right', title: 'Align right' },
];

const INLINE_OPTIONS: Array<{ format: InlineFormat; title: string; label: string }> = [
  { format: 'bold', title: 'Bold', label: 'B' },
  { format: 'italic', title: 'Italic', label: 'I' },
  { format: 'underline', title: 'Underline', label: 'U' },
  { format: 'superscript', title: 'Superscript', label: 'x²' },
  { format: 'subscript', title: 'Subscript', label: 'x₂' },
];

const LIST_OPTIONS: Array<{ list: ListFormat; title: string }> = [
  { list: 'bullet', title: 'Bullet list' },
  { list: 'number', title: 'Numbered list' },
];

const UndoIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
  </svg>
);

const RedoIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22l2.36.78c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
  </svg>
);

const AlignLeftIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" />
  </svg>
);

const AlignCenterIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" />
  </svg>
);

const AlignRightIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" />
  </svg>
);

const KeyboardIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" />
  </svg>
);

/** Word-style bulleted list: round bullets + text lines. */
const BulletListIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <circle cx="4" cy="6" r="1.5" />
    <circle cx="4" cy="12" r="1.5" />
    <circle cx="4" cy="18" r="1.5" />
    <path d="M8 5.25h12v1.5H8zm0 6h12v1.5H8zm0 6h12v1.5H8z" />
  </svg>
);

/** Word-style numbered list: 1/2/3 + text lines. */
const NumberedListIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
  </svg>
);

const ALIGN_ICONS: Record<TextAlign, () => ReactElement> = {
  left: AlignLeftIcon,
  center: AlignCenterIcon,
  right: AlignRightIcon,
};

const LIST_ICONS: Record<ListFormat, () => ReactElement> = {
  bullet: BulletListIcon,
  number: NumberedListIcon,
};

const EquationWysiwygToolbar = ({
  onUndo,
  onRedo,
  onAlign,
  onToggleSymbols,
  onInlineFormat,
  onListFormat,
  activeAlign = 'left',
  activeInlineFormats = [],
  activeListFormat = null,
  isSymbolsOpen = false,
  isUndoDisabled = true,
  isRedoDisabled = true,
  isAlignDisabled = false,
}: EquationWysiwygToolbarProps) => {
  return (
    <div
      className="equation-wysiwyg-toolbar-wrapper"
      role="toolbar"
      aria-label="Equation formatting"
      data-testid="equation-wysiwyg-toolbar"
    >
      <div className="equation-wysiwyg-group" role="group" aria-label="History">
        <button
          type="button"
          className="equation-wysiwyg-button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onUndo}
          disabled={isUndoDisabled}
          title="Undo (Ctrl/Cmd+Z)"
          aria-label="Undo"
          data-testid="wysiwyg-undo"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="equation-wysiwyg-button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onRedo}
          disabled={isRedoDisabled}
          title="Redo (Ctrl/Cmd+Shift+Z)"
          aria-label="Redo"
          data-testid="wysiwyg-redo"
        >
          <RedoIcon />
        </button>
      </div>

      <span className="equation-wysiwyg-divider" aria-hidden="true" />

      <div className="equation-wysiwyg-group" role="group" aria-label="Inline formatting">
        {INLINE_OPTIONS.map((option) => {
          const isActive = activeInlineFormats.includes(option.format);
          return (
            <button
              key={option.format}
              type="button"
              className={`equation-wysiwyg-button equation-wysiwyg-format-${option.format}${
                isActive ? ' is-active' : ''
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onInlineFormat?.(option.format)}
              disabled={!onInlineFormat}
              title={option.title}
              aria-label={option.title}
              aria-pressed={isActive}
              data-testid={`wysiwyg-${option.format}`}
            >
              <span aria-hidden="true">{option.label}</span>
            </button>
          );
        })}
      </div>

      <span className="equation-wysiwyg-divider" aria-hidden="true" />

      <div className="equation-wysiwyg-group" role="group" aria-label="Lists">
        {LIST_OPTIONS.map((option) => {
          const Icon = LIST_ICONS[option.list];
          const isActive = activeListFormat === option.list;
          return (
            <button
              key={option.list}
              type="button"
              className={`equation-wysiwyg-button${isActive ? ' is-active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onListFormat?.(option.list)}
              disabled={!onListFormat}
              title={option.title}
              aria-label={option.title}
              aria-pressed={isActive}
              data-testid={`wysiwyg-list-${option.list}`}
            >
              <Icon />
            </button>
          );
        })}
      </div>

      <span className="equation-wysiwyg-divider" aria-hidden="true" />

      <div className="equation-wysiwyg-group" role="group" aria-label="Text alignment">
        {ALIGN_OPTIONS.map((option) => {
          const Icon = ALIGN_ICONS[option.align];
          const isActive = activeAlign === option.align;
          return (
            <button
              key={option.align}
              type="button"
              className={`equation-wysiwyg-button${isActive ? ' is-active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onAlign?.(option.align)}
              disabled={isAlignDisabled || !onAlign}
              title={option.title}
              aria-label={option.title}
              aria-pressed={isActive}
              data-testid={`wysiwyg-align-${option.align}`}
            >
              <Icon />
            </button>
          );
        })}
      </div>

      <span className="equation-wysiwyg-divider" aria-hidden="true" />

      <div className="equation-wysiwyg-group" role="group" aria-label="Insert">
        <button
          type="button"
          className={`equation-wysiwyg-button equation-wysiwyg-button-wide${
            isSymbolsOpen ? ' is-active' : ''
          }`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleSymbols}
          disabled={!onToggleSymbols}
          title="Insert symbol"
          aria-label="Insert symbol"
          aria-pressed={isSymbolsOpen}
          data-testid="wysiwyg-symbols"
        >
          <KeyboardIcon />
          <span>Symbol</span>
        </button>
      </div>
    </div>
  );
};

export default EquationWysiwygToolbar;
