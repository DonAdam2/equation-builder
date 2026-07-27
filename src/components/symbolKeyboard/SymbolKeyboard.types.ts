export type SymbolKeyboardTab = 'symbols' | 'special';

export interface SymbolKeyboardProps {
  onInsert: (character: string) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** When false, only the panel is rendered (toolbar owns the toggle). */
  showToggle?: boolean;
}
