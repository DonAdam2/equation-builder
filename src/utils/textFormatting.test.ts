import {
  continueListOnEnter,
  isInlineFormatActive,
  isListFormatActive,
  richTextToLatex,
  toggleInlineFormat,
  toggleListFormat,
} from '@/utils/textFormatting';

const escape = (value: string) => value.replace(/([{}$#%&_])/g, '\\$1');

describe('textFormatting', () => {
  it('wraps and unwraps bold around a selection', () => {
    const wrapped = toggleInlineFormat('hello world', 6, 11, 'bold');
    expect(wrapped.nextValue).toBe('hello {{b}}world{{/b}}');
    expect(
      isInlineFormatActive(wrapped.nextValue, wrapped.selectionStart, wrapped.selectionEnd, 'bold')
    ).toBe(true);

    const unwrapped = toggleInlineFormat(
      wrapped.nextValue,
      wrapped.selectionStart,
      wrapped.selectionEnd,
      'bold'
    );
    expect(unwrapped.nextValue).toBe('hello world');
  });

  it('toggles bullet and numbered lists on selected lines', () => {
    const bullets = toggleListFormat('One\nTwo', 0, 7, 'bullet');
    expect(bullets.nextValue).toBe('• One\n• Two');

    const numbers = toggleListFormat('One\nTwo', 0, 7, 'number');
    expect(numbers.nextValue).toBe('1. One\n2. Two');
  });

  it('starts a list on an empty line before typing (Word-like)', () => {
    const bullet = toggleListFormat('', 0, 0, 'bullet');
    expect(bullet.nextValue).toBe('• ');
    expect(bullet.selectionStart).toBe(2);
    expect(bullet.selectionEnd).toBe(2);
    expect(isListFormatActive(bullet.nextValue, 2, 2, 'bullet')).toBe(true);

    const numbered = toggleListFormat('hello\n\nworld', 6, 6, 'number');
    expect(numbered.nextValue).toBe('hello\n1. \nworld');
    expect(numbered.selectionStart).toBe('hello\n1. '.length);

    const remove = toggleListFormat('• ', 2, 2, 'bullet');
    expect(remove.nextValue).toBe('');
  });

  it('continues bullet and numbered lists on Enter', () => {
    const bullet = continueListOnEnter(
      '• First item',
      '• First item'.length,
      '• First item'.length
    );
    expect(bullet?.nextValue).toBe('• First item\n• ');
    expect(bullet?.selectionStart).toBe('• First item\n• '.length);

    const numbered = continueListOnEnter('1. First', '1. First'.length, '1. First'.length);
    expect(numbered?.nextValue).toBe('1. First\n2. ');

    const split = continueListOnEnter('• helloworld', '• hello'.length, '• hello'.length);
    expect(split?.nextValue).toBe('• hello\n• world');
  });

  it('exits an empty list item on Enter', () => {
    const exited = continueListOnEnter('• item\n• ', '• item\n• '.length, '• item\n• '.length);
    expect(exited?.nextValue).toBe('• item\n');
    expect(continueListOnEnter('plain line', 5, 5)).toBeNull();
  });

  it('does not treat blank lines as an active list', () => {
    expect(isListFormatActive('', 0, 0, 'bullet')).toBe(false);
    expect(isListFormatActive('\n\n', 1, 1, 'bullet')).toBe(false);
    expect(isListFormatActive('\n\n', 1, 1, 'number')).toBe(false);
    expect(isListFormatActive('• item', 0, 6, 'bullet')).toBe(true);
  });

  it('converts rich-text markers into LaTeX', () => {
    const latex = richTextToLatex('Hello {{b}}world{{/b}} {{i}}now{{/i}}', escape);
    expect(latex).toContain('\\text{Hello }');
    // KaTeX keeps \textit{\text{...}} upright — emit styled text directly.
    expect(latex).toContain('\\textbf{world}');
    expect(latex).toContain('\\textit{now}');
  });

  it('converts superscript and subscript markers', () => {
    const latex = richTextToLatex('x{{sup}}2{{/sup}} y{{sub}}i{{/sub}}', escape);
    expect(latex).toContain('^{\\text{2}}');
    expect(latex).toContain('_{\\text{i}}');
  });
});
