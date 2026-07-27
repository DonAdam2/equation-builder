import { cellToLatex, convertCalculus, editorTextToLatex } from '@/utils/textToLatex';

describe('editorTextToLatex', () => {
  it('converts a matrix multiplication block into pmatrix LaTeX', () => {
    const input = ['[ a11  a12 ] × [ b11  b12  b13 ] =', '[ a21  a22 ]   [ b21  b22  b23 ]'].join(
      '\n'
    );

    const latex = editorTextToLatex(input);

    expect(latex).toContain('\\begin{pmatrix}');
    expect(latex).toContain('a_{11}');
    expect(latex).toContain('\\times');
    expect(latex).toContain('=');
  });

  it('converts fraction templates into \\frac', () => {
    expect(editorTextToLatex('(numerator)/(denominator)')).toContain(
      '\\frac{numerator}{denominator}'
    );
  });

  it('renders fractions inside matrix cells with a proper fraction bar', () => {
    const input = ['B = [ 0  (1)/(-2) ]', '    [ (1)/(2)  0 ]'].join('\n');

    const latex = editorTextToLatex(input);

    expect(latex).toContain('\\text{B}');
    expect(latex).toContain('=');
    expect(latex).toContain('\\frac{1}{-2}');
    expect(latex).toContain('\\frac{1}{2}');
    expect(latex).not.toContain('(1)/(-2)');
  });

  it('keeps non-equation labels next to matrices', () => {
    const input = [
      'A = [ 4  0 ]   B = [ 0  (1)/(-2) ]   C = [ 1  0 ]   D = [ 4  2 ]',
      '    [ 0  4 ]       [ (1)/(2)  0 ]       [ 0 -1 ]       [ 0 -1 ]',
    ].join('\n');

    const latex = editorTextToLatex(input);

    expect(latex).toContain('\\text{A}');
    expect(latex).toContain('\\text{B}');
    expect(latex).toContain('\\text{C}');
    expect(latex).toContain('\\text{D}');
    expect(latex).toContain('\\frac{1}{-2}');
    expect(latex.match(/\\begin\{pmatrix\}/g)).toHaveLength(4);
  });

  it('passes embedded $$latex$$ segments through for Word paste fallbacks', () => {
    const latex = editorTextToLatex('Notes\n\n$$\\int_0^1 x\\,dx$$\n\n(1)/(2)');

    expect(latex).toContain('\\text{Notes}');
    expect(latex).toContain('\\int_0^1 x\\,dx');
    expect(latex).toContain('\\frac{1}{2}');
  });

  it('round-trips labeled matrix ASCII through LaTeX', () => {
    const input = ['A = [ 4  0 ]', '    [ 0  4 ]'].join('\n');
    const latex = editorTextToLatex(input);

    expect(latex).toContain('\\text{A}');
    expect(latex).toContain('\\begin{pmatrix}');
    expect(latex).toContain('4');
  });

  it('keeps spaces in prose and stretchy matrices for mixed Word pastes', () => {
    const input = [
      'We define the following matrices',
      'A = [ 4  0 ]   B = [ 0  (-1)/(2) ]',
      '    [ 0  4 ]       [ (1)/(2)  0 ]',
      'Find the eigenvalues for A, C and D',
      '(4-λ)(4-λ) = 0',
    ].join('\n');

    const latex = editorTextToLatex(input);

    expect(latex).toContain('\\text{We define the following matrices}');
    expect(latex).toContain('\\text{Find the eigenvalues for A, C and D}');
    expect(latex).toContain('\\begin{pmatrix}');
    expect(latex).toContain('\\frac{-1}{2}');
    expect(latex).not.toContain('[ 4  0 ]');
    expect(latex).toContain('(4-λ)(4-λ) = 0');
  });

  it('converts a full Word UnicodeMath paste into spaced prose + pmatrices', () => {
    const pasted = [
      '- We define the following matrices',
      '"A"=(■(4&0@0&4))" B"=(■(0&-1/2@1/2&0))" C"=(■(1&0@0&-1))" D"=(■(4&2@0&-1))',
      '- Find the eigenvalues for A, C and D',
      '  o "A"=(■(4&0@0&4))',
      '    ■ From "T"-λ"I":',
      '      ● "I"=(■(1&0@0&1))"  "λI"=(■(λ&0@0&λ))',
      '      ● (■(4&0@0&4))-(■(λ&0@0&λ))=(■(4-λ&0@0&4-λ))',
    ].join('\n');

    const latex = editorTextToLatex(pasted);

    expect(latex).toContain('\\text{- We define the following matrices}');
    expect(latex).toContain('\\text{- Find the eigenvalues for A, C and D}');
    expect(latex).toContain('\\text{■ From T-λI:}');
    expect(latex).toContain('\\hspace{1.25em}');
    expect(latex).toContain('\\hspace{2.5em}');
    expect(latex.match(/\\begin\{pmatrix\}/g)?.length).toBeGreaterThanOrEqual(4);
    expect(latex).toContain('\\frac{-1}{2}');
    expect(latex).not.toContain('■(');
    // 2x2 matrices must stay 2 rows (not merge the next equation into the same pmatrix).
    expect(latex).toMatch(/\\begin\{pmatrix\} 1 & 0 \\\\ 0 & 1 \\end\{pmatrix\}/);
    expect(latex).toMatch(/\\begin\{pmatrix\} 4 & 0 \\\\ 0 & 4 \\end\{pmatrix\}/);
  });

  it('does not merge the next equation rows into I / λI matrices', () => {
    const pasted = [
      '      ● I = [ 1  0 ]   λI = [ λ  0 ]',
      '            [ 0  1 ]         [ 0  λ ]',
      '            [ 4  0 ] - [ λ  0 ] = [ 4-λ  0 ]',
      '            [ 0  4 ]   [ 0  λ ]   [ 0  4-λ ]',
    ].join('\n');

    const latex = editorTextToLatex(pasted);

    expect(latex).toMatch(/\\begin\{pmatrix\} 1 & 0 \\\\ 0 & 1 \\end\{pmatrix\}/);
    expect(latex).toMatch(/\\begin\{pmatrix\} λ & 0 \\\\ 0 & λ \\end\{pmatrix\}/);
    expect(latex).toMatch(/\\begin\{pmatrix\} 4 & 0 \\\\ 0 & 4 \\end\{pmatrix\}/);
    expect(latex).toMatch(/\\begin\{pmatrix\} 4-λ & 0 \\\\ 0 & 4-λ \\end\{pmatrix\}/);
    // Must not become a 4-row I matrix (I rows + next equation rows).
    expect(latex).not.toMatch(
      /\\begin\{pmatrix\} 1 & 0 \\\\ 0 & 1 \\\\ 4 & 0 \\\\ 0 & 4 \\end\{pmatrix\}/
    );
  });

  it('keeps column-0 side-by-side matrix rows as 2x2 blocks for Word copy', () => {
    const input = ['[ a11  a12 ] = [ a11  a12 ]', '[ a21  a22 ]   [ a21  a22 ]'].join('\n');
    const latex = editorTextToLatex(input);

    expect(latex).toMatch(
      /\\begin\{pmatrix\} a_\{11\} & a_\{12\} \\\\ a_\{21\} & a_\{22\} \\end\{pmatrix\}/
    );
    expect(latex).toMatch(
      /=\s*\\begin\{pmatrix\} a_\{11\} & a_\{12\} \\\\ a_\{21\} & a_\{22\} \\end\{pmatrix\}/
    );
    // Must not flatten into four separate 1x2 matrices.
    expect(latex).not.toMatch(
      /\\begin\{pmatrix\} a_\{11\} & a_\{12\} \\end\{pmatrix\} = \\begin\{pmatrix\} a_\{11\} & a_\{12\} \\end\{pmatrix\} \\\\ /
    );
  });
});

describe('cellToLatex', () => {
  it('converts parenthesized fraction cells', () => {
    expect(cellToLatex('(1)/(-2)')).toBe('\\frac{1}{-2}');
    expect(cellToLatex('(1)/(2)')).toBe('\\frac{1}{2}');
  });
});

describe('convertCalculus', () => {
  it('converts derivative and integral templates', () => {
    expect(convertCalculus('d(f)/d(x)')).toBe('\\frac{d}{dx}f');
    expect(convertCalculus('∫ (f) d(x)')).toBe('\\int f\\,dx');
    expect(convertCalculus('∫_(a)^(b) (f) d(x)')).toBe('\\int_{a}^{b} f\\,dx');
    expect(convertCalculus('∂(f)/∂(x)')).toBe('\\frac{\\partial}{\\partial x}f');
  });

  it('renders calculus templates from the editor as math', () => {
    expect(editorTextToLatex('d(y)/d(x)')).toContain('\\frac{d}{dx}y');
    expect(editorTextToLatex('∫_(0)^(1) (x) d(x)')).toContain('\\int_{0}^{1} x\\,dx');
  });
});
