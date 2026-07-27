import { editorTextToLatex } from '@/utils/textToLatex';
import { buildAlignedWordHtml, buildMixedWordHtml, extractMathMl } from '@/utils/wordClipboard';

describe('wordClipboard', () => {
  it('extracts a math element from KaTeX MathML output', () => {
    const mathml = extractMathMl('\\frac{a}{b}');
    expect(mathml.startsWith('<math')).toBe(true);
    expect(mathml).toContain('</math>');
    expect(mathml.includes('mfrac') || mathml.includes('<mfrac')).toBe(true);
  });

  it('wraps MathML blocks with text-align styles for Word', () => {
    const html = buildAlignedWordHtml([
      { align: 'center', latex: '\\frac{a}{b}' },
      { align: 'right', latex: 'x = 1' },
    ]);

    expect(html).toContain('text-align:center');
    expect(html).toContain('text-align:right');
    expect(html).toContain('<math');
  });

  it('exports side-by-side 2x2 matrices as MathML tables with two rows', () => {
    const latex = editorTextToLatex(
      ['[ a11  a12 ] = [ a11  a12 ]', '[ a21  a22 ]   [ a21  a22 ]'].join('\n')
    );
    const mathml = extractMathMl(latex);

    expect(latex).toContain('a_{21}');
    expect((mathml.match(/<mtr[\s>]/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(mathml).toMatch(/<mtr[\s\S]*?<mtr/i);
  });

  it('keeps prose as HTML paragraphs and matrices as MathML equations', () => {
    const editorText = [
      '{{align:center}}',
      'This is an example of inserting matrix from this builder',
      '[ a11  a12 ] = [ a11  a12 ]',
      '[ a21  a22 ]   [ a21  a22 ]',
    ].join('\n');

    const html = buildMixedWordHtml(editorText);

    expect(html).toContain(
      '<p style="text-align:center;margin:0">This is an example of inserting matrix from this builder</p>'
    );
    expect(html).toContain('<math');
    expect(html).toContain('text-align:center');
    // Prose must not be inside the math element.
    expect(html).not.toMatch(
      /<math[\s\S]*This is an example of inserting matrix from this builder[\s\S]*<\/math>/i
    );
    expect((html.match(/<mtr[\s>]/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('preserves bold/italic markers as HTML in prose paragraphs', () => {
    const html = buildMixedWordHtml('Hello {{b}}world{{/b}} {{i}}now{{/i}}');
    expect(html).toContain('<p style="text-align:left;margin:0">Hello <b>world</b> <i>now</i></p>');
    expect(html).not.toContain('<math');
  });
});
