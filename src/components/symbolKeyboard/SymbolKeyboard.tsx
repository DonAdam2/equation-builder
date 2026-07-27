import { useId, useState } from 'react';

import {
  SymbolKeyboardProps,
  SymbolKeyboardTab,
} from '@/components/symbolKeyboard/SymbolKeyboard.types';

import { WORD_SPECIAL_CHARACTERS, WORD_SYMBOL_SECTIONS } from '@/data/wordSymbols';

const KeyboardIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" />
  </svg>
);

const displayChar = (char: string): string => {
  if (char === '\u00A0') {
    return 'NBSP';
  }
  if (char === '\u2003') {
    return 'Em';
  }
  if (char === '\u2002') {
    return 'En';
  }
  if (char === '\u2005') {
    return '¼';
  }
  if (char === '­') {
    return '-?';
  }
  if (char === '‑') {
    return '‑';
  }
  return char;
};

const SymbolKeyboard = ({
  onInsert,
  isOpen,
  onOpenChange,
  showToggle = true,
}: SymbolKeyboardProps) => {
  const panelId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SymbolKeyboardTab>('symbols');

  const open = isOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (isOpen === undefined) {
      setInternalOpen(next);
    }
  };

  const handleInsert = (character: string) => {
    onInsert(character);
  };

  return (
    <div className="symbol-keyboard-wrapper">
      {showToggle ? (
        <button
          type="button"
          className="symbol-keyboard-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          title="Insert symbol"
          data-testid="symbol-keyboard-toggle"
        >
          <KeyboardIcon />
          <span>Insert symbol</span>
        </button>
      ) : null}

      {open ? (
        <div
          id={panelId}
          className="symbol-keyboard-panel"
          role="dialog"
          aria-label="Symbol keyboard"
          data-testid="symbol-keyboard-panel"
        >
          <div className="symbol-keyboard-tabs" role="tablist" aria-label="Symbol categories">
            <button
              type="button"
              role="tab"
              className={`symbol-keyboard-tab${activeTab === 'symbols' ? ' is-active' : ''}`}
              aria-selected={activeTab === 'symbols'}
              onClick={() => setActiveTab('symbols')}
            >
              Symbols
            </button>
            <button
              type="button"
              role="tab"
              className={`symbol-keyboard-tab${activeTab === 'special' ? ' is-active' : ''}`}
              aria-selected={activeTab === 'special'}
              onClick={() => setActiveTab('special')}
            >
              Special Characters
            </button>
          </div>

          {activeTab === 'symbols' ? (
            <div className="symbol-keyboard-body" role="tabpanel">
              <p className="symbol-keyboard-hint">
                Word-style symbol grid. Click a character to insert it at the cursor.
              </p>
              {WORD_SYMBOL_SECTIONS.map((section) => (
                <section key={section.title} className="symbol-keyboard-section">
                  <h3 className="symbol-keyboard-section-title">{section.title}</h3>
                  <div className="symbol-keyboard-grid">
                    {section.symbols.map((symbol, index) => (
                      <button
                        key={`${section.title}-${symbol.char}-${index}`}
                        type="button"
                        className="symbol-keyboard-key"
                        title={symbol.label ?? symbol.char}
                        aria-label={`Insert ${symbol.label ?? symbol.char}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleInsert(symbol.char)}
                      >
                        {displayChar(symbol.char)}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="symbol-keyboard-body" role="tabpanel">
              <p className="symbol-keyboard-hint">
                Special characters from Word’s Insert Symbol dialog.
              </p>
              <div className="symbol-keyboard-special-list">
                {WORD_SPECIAL_CHARACTERS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className="symbol-keyboard-special-row"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleInsert(item.char)}
                    aria-label={`Insert ${item.name}`}
                  >
                    <span className="symbol-keyboard-special-char" aria-hidden="true">
                      {displayChar(item.char)}
                    </span>
                    <span className="symbol-keyboard-special-name">{item.name}</span>
                    {item.shortcut ? (
                      <span className="symbol-keyboard-special-shortcut">{item.shortcut}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SymbolKeyboard;
