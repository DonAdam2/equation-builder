import {
  applyAlignmentAtCursor,
  parseAlignedBlocks,
  stripAlignMarkers,
} from '@/utils/textAlignment';

describe('textAlignment', () => {
  it('parses alignment markers into blocks', () => {
    const blocks = parseAlignedBlocks(
      ['{{align:center}}', 'A = [ 1  0 ]', '', '{{align:right}}', 'Notes'].join('\n')
    );

    expect(blocks).toEqual([
      { align: 'center', text: 'A = [ 1  0 ]' },
      { align: 'right', text: 'Notes' },
    ]);
  });

  it('defaults unmarked content to left', () => {
    expect(parseAlignedBlocks('Hello world')).toEqual([{ align: 'left', text: 'Hello world' }]);
  });

  it('applies alignment to the block at the cursor', () => {
    const value = ['First paragraph', '', 'Second paragraph'].join('\n');
    const result = applyAlignmentAtCursor(value, value.indexOf('Second'), 'center');

    expect(result.nextValue).toContain('{{align:center}}');
    expect(result.nextValue).toContain('Second paragraph');
    expect(stripAlignMarkers(result.nextValue)).toContain('First paragraph');
  });

  it('strips alignment markers for converters', () => {
    expect(stripAlignMarkers('{{align:right}}\nλ = 4')).toBe('λ = 4');
  });

  it('keeps a content line after align so bold is not glued to the marker', () => {
    const result = applyAlignmentAtCursor('', 0, 'center');
    expect(result.nextValue).toBe('{{align:center}}\n');
    expect(result.selectionStart).toBe('{{align:center}}\n'.length);

    const boldAtCaret = `${result.nextValue.slice(0, result.selectionStart)}{{b}}{{/b}}${result.nextValue.slice(result.selectionEnd)}`;
    expect(boldAtCaret).toBe('{{align:center}}\n{{b}}{{/b}}');
  });
});
