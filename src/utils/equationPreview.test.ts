import { buildPreviewBlocks } from '@/utils/equationPreview';

describe('buildPreviewBlocks', () => {
  it('keeps single newlines as separate preview rows', () => {
    const blocks = buildPreviewBlocks('asdf\nasdf\nasdf');
    expect(blocks).toHaveLength(3);
    expect(blocks.map((block) => block.latex)).toEqual([
      '\\text{asdf}',
      '\\text{asdf}',
      '\\text{asdf}',
    ]);
  });

  it('keeps blank-line paragraphs and math on separate rows', () => {
    const blocks = buildPreviewBlocks('hello\nworld\n\n(1)/(2)');
    expect(blocks.map((block) => block.latex)).toEqual([
      '\\text{hello}',
      '\\text{world}',
      '\\frac{1}{2}',
    ]);
  });
});
