import {
  continueListOnEnter,
  isInlineFormatActive,
  isListFormatActive,
  richTextToHtml,
  richTextToLatex,
  toggleInlineFormat,
  toggleListFormat,
} from '@/utils/textFormatting';

const escape = (value: string) => value.replace(/([{}$#%&_])/g, '\\$1');

describe('textFormatting', () => {
  it('wraps and unwraps bold around a selection', () => {
    const wrapped = toggleInlineFormat('hello world', 6, 11, 'bold');
    expect(wrapped.nextValue).toBe('hello {{b}}world{{/b}}');
    // Toolbar formatting collapses to the end of the styled run.
    expect(wrapped.selectionStart).toBe(wrapped.selectionEnd);
    expect(
      isInlineFormatActive(wrapped.nextValue, wrapped.selectionStart, wrapped.selectionEnd, 'bold')
    ).toBe(true);

    // Second click at the end exits bold for new typing — keeps existing bold text.
    const exited = toggleInlineFormat(
      wrapped.nextValue,
      wrapped.selectionStart,
      wrapped.selectionEnd,
      'bold'
    );
    expect(exited.nextValue).toBe('hello {{b}}world{{/b}}');
    expect(
      isInlineFormatActive(exited.nextValue, exited.selectionStart, exited.selectionEnd, 'bold')
    ).toBe(false);

    // Selecting the bold run and toggling removes the markers.
    const innerStart = exited.nextValue.indexOf('world');
    const unwrapped = toggleInlineFormat(
      exited.nextValue,
      innerStart,
      innerStart + 'world'.length,
      'bold'
    );
    expect(unwrapped.nextValue).toBe('hello world');
  });

  it('keeps superscript text when turning superscript off at the end of the run', () => {
    const base = 'y = x2';
    const wrapped = toggleInlineFormat(base, base.indexOf('2'), base.indexOf('2') + 1, 'superscript');
    expect(wrapped.nextValue).toBe('y = x{{sup}}2{{/sup}}');
    expect(
      isInlineFormatActive(
        wrapped.nextValue,
        wrapped.selectionStart,
        wrapped.selectionEnd,
        'superscript'
      )
    ).toBe(true);

    const exited = toggleInlineFormat(
      wrapped.nextValue,
      wrapped.selectionStart,
      wrapped.selectionEnd,
      'superscript'
    );
    expect(exited.nextValue).toBe('y = x{{sup}}2{{/sup}}');
    expect(
      isInlineFormatActive(
        exited.nextValue,
        exited.selectionStart,
        exited.selectionEnd,
        'superscript'
      )
    ).toBe(false);
  });

  it('exits superscript at end even if the styled run is still reported as selected', () => {
    // Simulates: format applied (caret collapsed in selectionRef), but textarea
    // still reports the previous range covering the whole run.
    const value = 'asdf asd{{sup}}fasdf{{/sup}}';
    const innerStart = value.indexOf('fasdf');
    const innerEnd = innerStart + 'fasdf'.length;

    // If we used the stale range, toggle would unwrap. Collapsed end must exit.
    const atEnd = toggleInlineFormat(value, innerEnd, innerEnd, 'superscript');
    expect(atEnd.nextValue).toBe(value);
    expect(isInlineFormatActive(atEnd.nextValue, atEnd.selectionStart, atEnd.selectionEnd, 'superscript')).toBe(
      false
    );

    // Explicit selection of the run still removes the format.
    const removed = toggleInlineFormat(value, innerStart, innerEnd, 'superscript');
    expect(removed.nextValue).toBe('asdf asdfasdf');
  });

  it('does not wrap a trailing paragraph break when bolding a line selection', () => {
    const wrapped = toggleInlineFormat('asdf\nadsf\nasdf', 0, 'asdf\n'.length, 'bold');
    expect(wrapped.nextValue).toBe('{{b}}asdf{{/b}}\nadsf\nasdf');
    expect(wrapped.selectionStart).toBe('{{b}}asdf'.length);
    expect(wrapped.selectionEnd).toBe('{{b}}asdf'.length);
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

  it('does not hang on align markers or orphan closes mixed with bold', () => {
    const mixed = '{{align:center}}{{b}}hello{{/b}}';
    expect(richTextToHtml(mixed)).toBe('<b>hello</b>');
    expect(richTextToLatex(mixed, escape)).toContain('\\textbf{hello}');
    expect(richTextToHtml('{{/b}}')).toBe('');
    expect(richTextToLatex('{{/b}}', escape)).toBe('');
  });
});
