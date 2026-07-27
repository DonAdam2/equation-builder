import { TextAlign } from '@/utils/textAlignment';
import { InlineFormat, ListFormat } from '@/utils/textFormatting';

export interface EquationWysiwygToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onAlign?: (align: TextAlign) => void;
  onToggleSymbols?: () => void;
  onInlineFormat?: (format: InlineFormat) => void;
  onListFormat?: (list: ListFormat) => void;
  activeAlign?: TextAlign;
  activeInlineFormats?: InlineFormat[];
  activeListFormat?: ListFormat | null;
  isSymbolsOpen?: boolean;
  isUndoDisabled?: boolean;
  isRedoDisabled?: boolean;
  isAlignDisabled?: boolean;
}
