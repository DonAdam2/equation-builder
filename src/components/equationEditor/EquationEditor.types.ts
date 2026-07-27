import { ClipboardEventHandler, KeyboardEventHandler, RefObject } from 'react';

import { TextAlign } from '@/utils/textAlignment';
import { InlineFormat, ListFormat } from '@/utils/textFormatting';

export interface EquationEditorProps {
  /** Marked model value (may include {{b}}/{{i}}/align markers). */
  value: string;
  /** Receives marker-free display text from the textarea; parent maps back to the model. */
  onChange: (displayValue: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onCursorChange?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  onCopy?: ClipboardEventHandler<HTMLTextAreaElement>;
  onPaste?: ClipboardEventHandler<HTMLTextAreaElement>;
  onInsertSymbol?: (character: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onAlign?: (align: TextAlign) => void;
  onInlineFormat?: (format: InlineFormat) => void;
  onListFormat?: (list: ListFormat) => void;
  activeAlign?: TextAlign;
  activeInlineFormats?: InlineFormat[];
  activeListFormat?: ListFormat | null;
  isUndoDisabled?: boolean;
  isRedoDisabled?: boolean;
  placeholder?: string;
}
