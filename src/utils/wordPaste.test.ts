import { editorTextToLatex } from '@/utils/textToLatex';
import {
  extractLatexFromMathMl,
  extractLatexFromPlain,
  fracLatexToAscii,
  hasUnicodeMath,
  htmlToAlignedBuilderText,
  latexToBuilderAscii,
  mathMlToLatex,
  ommlToLatex,
  resolvePastePayload,
  resolveWordPaste,
  transferListPrefixesFromPlain,
  unicodeMathToBuilderText,
} from '@/utils/wordPaste';

const createClipboardData = ({
  plain = '',
  html = '',
}: {
  plain?: string;
  html?: string;
}): DataTransfer =>
  ({
    getData: (type: string) => {
      if (type === 'text/plain') {
        return plain;
      }
      if (type === 'text/html') {
        return html;
      }
      return '';
    },
  }) as DataTransfer;

describe('extractLatexFromPlain', () => {
  it('unwraps $$latex$$ from plain clipboard text', () => {
    expect(extractLatexFromPlain('$$\\frac{a}{b}$$')).toBe('\\frac{a}{b}');
  });

  it('accepts bare LaTeX command text', () => {
    expect(extractLatexFromPlain('\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}')).toContain(
      'pmatrix'
    );
  });
});

describe('mathMlToLatex', () => {
  it('prefers the application/x-tex annotation from KaTeX MathML', () => {
    const mathMl =
      '<math><semantics><mrow><mfrac><mn>1</mn><mn>2</mn></mfrac></mrow>' +
      '<annotation encoding="application/x-tex">\\frac{1}{2}</annotation></semantics></math>';

    expect(extractLatexFromMathMl(mathMl)).toBe('\\frac{1}{2}');
    expect(mathMlToLatex(mathMl)).toBe('\\frac{1}{2}');
  });

  it('walks MathML when no annotation is present', () => {
    const mathMl =
      '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>';

    expect(mathMlToLatex(mathMl)).toBe('\\frac{1}{2}');
  });
});

describe('latexToBuilderAscii', () => {
  it('converts fractions and labeled matrices into editable ASCII', () => {
    const latex =
      '\\text{A} = \\begin{pmatrix} 4 & 0 \\\\ 0 & 4 \\end{pmatrix} ' +
      '\\text{B} = \\begin{pmatrix} 0 & \\frac{1}{-2} \\\\ \\frac{1}{2} & 0 \\end{pmatrix}';

    const ascii = latexToBuilderAscii(latex);

    expect(ascii).toContain('A =');
    expect(ascii).toContain('B =');
    expect(ascii).toContain('[ 4  0 ]');
    expect(ascii).toContain('(1)/(-2)');
    expect(ascii).toContain('(1)/(2)');
  });

  it('returns null for unsupported LaTeX commands', () => {
    expect(latexToBuilderAscii('\\int_0^1 x dx')).toBeNull();
  });
});

describe('resolvePastePayload', () => {
  it('prefers ASCII when conversion succeeds', () => {
    const result = resolvePastePayload({
      latex: '\\frac{1}{2}',
      plainText: '$$\\frac{1}{2}$$',
    });

    expect(result).toEqual({ text: '(1)/(2)', kind: 'ascii' });
  });

  it('falls back to $$latex$$ when ASCII conversion is unsupported', () => {
    const result = resolvePastePayload({
      latex: '\\int_0^1 x dx',
      plainText: '$$\\int_0^1 x dx$$',
    });

    expect(result.kind).toBe('latex');
    expect(result.text).toBe('$$\\int_0^1 x dx$$');
  });
});

describe('resolveWordPaste', () => {
  it('returns null for ordinary plain text without math', () => {
    expect(resolveWordPaste(createClipboardData({ plain: 'hello world' }))).toBeNull();
  });

  it('resolves $$latex$$ clipboard payloads from this app', () => {
    const result = resolveWordPaste(
      createClipboardData({
        plain: '$$\\frac{a}{b}$$',
        html: '<math><annotation encoding="application/x-tex">\\frac{a}{b}</annotation></math>',
      })
    );

    expect(result?.kind).toBe('ascii');
    expect(result?.text).toBe('(a)/(b)');
  });

  it('converts Word UnicodeMath plain text into editable ASCII', () => {
    const plain = '"A"=(■(4&0@0&4))" B"=(■(0&-1/2@1/2&0))" C"=(■(1&0@0&-1))" D"=(■(4&2@0&-1))';

    const result = resolveWordPaste(createClipboardData({ plain }));

    expect(result?.kind).toBe('ascii');
    expect(result?.text).toContain('A =');
    expect(result?.text).toContain('[ 4  0 ]');
    expect(result?.text).toContain('(-1)/(2)');
    expect(result?.text).toContain('(1)/(2)');
    expect(result?.text).not.toContain('■');
  });

  it('preserves text-align from Word HTML paragraphs', () => {
    const html = `
      <html><body>
        <p class="MsoNormal" style="text-align:center">Centered title</p>
        <p class="MsoNormal" align="right">Right note</p>
      </body></html>
    `;

    const text = htmlToAlignedBuilderText(html);
    expect(text).toContain('{{align:center}}');
    expect(text).toContain('Centered title');
    expect(text).toContain('{{align:right}}');
    expect(text).toContain('Right note');
  });

  it('preserves nested Word list markers, indent, and conditional-comment bullets', () => {
    const html = `
      <html><body>
        <p class="MsoListParagraph" style="margin-left:36.0pt;mso-list:l0 level1 lfo1">
          <!--[if !supportLists]--><span style="mso-list:Ignore">-<span>&nbsp;</span></span><!--[endif]-->
          We define the following matrices
        </p>
        <p class="MsoListParagraph" style="margin-left:72.0pt;mso-list:l0 level2 lfo1">
          <!--[if !supportLists]--><span style="mso-list:Ignore">o<span>&nbsp;</span></span><!--[endif]-->
          A=(■(4&0@0&4))
        </p>
        <p class="MsoListParagraph" style="margin-left:108.0pt;mso-list:l0 level3 lfo1">
          <!--[if !supportLists]--><span style="mso-list:Ignore">■<span>&nbsp;</span></span><!--[endif]-->
          From T-λI:
        </p>
        <p class="MsoListParagraph" style="margin-left:144.0pt;mso-list:l0 level4 lfo1">
          <!--[if !supportLists]--><span style="mso-list:Ignore">●<span>&nbsp;</span></span><!--[endif]-->
          (■(4&0@0&4))-(■(λ&0@0&λ))
        </p>
      </body></html>
    `;

    const text = htmlToAlignedBuilderText(html);
    expect(text).toContain('- We define the following matrices');
    expect(text).toMatch(/^ {2}o A =/m);
    expect(text).toContain('[ 4  0 ]');
    expect(text).toMatch(/^ {4}■ From T-λI:/m);
    expect(text).toMatch(/^ {6}● /m);
    expect(text).toContain('[ λ  0 ]');
  });

  it('preserves bold/italic from Word HTML', () => {
    const html = `
      <html><body>
        <p class="MsoNormal"><b>Bold</b> and <i>italic</i> note</p>
      </body></html>
    `;

    const text = htmlToAlignedBuilderText(html);
    expect(text).toContain('{{b}}Bold{{/b}}');
    expect(text).toContain('{{i}}italic{{/i}}');
  });

  it('prefers plain text when it keeps more math than HTML', () => {
    const plain = [
      '- We define the following matrices',
      '\to A=(■(4&0@0&4))',
      '\t\t■ From T-λI:',
    ].join('\n');
    const html = `
      <html><body>
        <p class="MsoNormal">We define the following matrices</p>
        <p class="MsoNormal">A=(■(4&0@0&4))</p>
      </body></html>
    `;

    const result = resolveWordPaste(createClipboardData({ plain, html }));
    expect(result?.text).toContain('- We define the following matrices');
    expect(result?.text).toMatch(/o A =/);
    expect(result?.text).toContain('■ From T-λI:');
  });

  it('does not prefer list-heavy plain text when it drops equations', () => {
    const plain = ['- We define the following matrices', '- Find eigenvalues', '  • From :'].join(
      '\n'
    );
    const html = `
      <html><body>
        <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">
          <!--[if !supportLists]><span style="mso-list:Ignore">-<span>&nbsp;</span></span><![endif]-->
          We define the following matrices
          <!--[if gte msEquation 12]>
          <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
            <m:r><m:t>A</m:t></m:r><m:r><m:t>=</m:t></m:r>
            <m:d>
              <m:e>
                <m:m>
                  <m:mr>
                    <m:e><m:r><m:t>4</m:t></m:r></m:e>
                    <m:e><m:r><m:t>0</m:t></m:r></m:e>
                  </m:mr>
                  <m:mr>
                    <m:e><m:r><m:t>0</m:t></m:r></m:e>
                    <m:e><m:r><m:t>4</m:t></m:r></m:e>
                  </m:mr>
                </m:m>
              </m:e>
            </m:d>
          </m:oMath>
          <![endif]-->
        </p>
      </body></html>
    `;

    const result = resolveWordPaste(createClipboardData({ plain, html }));
    expect(result?.text).toContain('[ 4  0 ]');
    expect(result?.text).toContain('A =');
  });
});

describe('ommlToLatex', () => {
  it('converts OMML matrices and fractions', () => {
    const html = `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:r><m:t>B</m:t></m:r><m:r><m:t>=</m:t></m:r>
        <m:d>
          <m:e>
            <m:m>
              <m:mr>
                <m:e><m:r><m:t>0</m:t></m:r></m:e>
                <m:e>
                  <m:f>
                    <m:num><m:r><m:t>-1</m:t></m:r></m:num>
                    <m:den><m:r><m:t>2</m:t></m:r></m:den>
                  </m:f>
                </m:e>
              </m:mr>
              <m:mr>
                <m:e>
                  <m:f>
                    <m:num><m:r><m:t>1</m:t></m:r></m:num>
                    <m:den><m:r><m:t>2</m:t></m:r></m:den>
                  </m:f>
                </m:e>
                <m:e><m:r><m:t>0</m:t></m:r></m:e>
              </m:mr>
            </m:m>
          </m:e>
        </m:d>
      </m:oMath>
    `;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const ommath = Array.from(doc.body.querySelectorAll('*')).find(
      (el) => (el.localName || el.nodeName).replace(/^.*:/, '').toLowerCase() === 'omath'
    );
    expect(ommath).toBeTruthy();
    const latex = ommlToLatex(ommath as Element);
    expect(latex).toContain('B');
    expect(latex).toContain('\\begin{pmatrix}');
    expect(latex).toContain('\\frac{-1}{2}');
    expect(latex).toContain('\\frac{1}{2}');
  });
});

describe('htmlToAlignedBuilderText OMML', () => {
  it('keeps Word OMML equations inside nested lists', () => {
    const html = `
      <html><body>
        <p class="MsoListParagraph" style="margin-left:36.0pt;mso-list:l0 level1 lfo1">
          <!--[if !supportLists]><span style="mso-list:Ignore">-<span>&nbsp;</span></span><![endif]-->
          From
          <!--[if gte msEquation 12]>
          <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
            <m:r><m:t>T</m:t></m:r>
            <m:r><m:t>-</m:t></m:r>
            <m:r><m:t>λ</m:t></m:r>
            <m:r><m:t>I</m:t></m:r>
          </m:oMath>
          <![endif]-->
          :
        </p>
        <p class="MsoListParagraph" style="margin-left:72.0pt;mso-list:l0 level2 lfo1">
          <!--[if !supportLists]><span style="mso-list:Ignore">●<span>&nbsp;</span></span><![endif]-->
          <i>
          <!--[if gte msEquation 12]>
          <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
            <m:r><m:t>I</m:t></m:r><m:r><m:t>=</m:t></m:r>
            <m:d>
              <m:e>
                <m:m>
                  <m:mr>
                    <m:e><m:r><m:t>1</m:t></m:r></m:e>
                    <m:e><m:r><m:t>0</m:t></m:r></m:e>
                  </m:mr>
                  <m:mr>
                    <m:e><m:r><m:t>0</m:t></m:r></m:e>
                    <m:e><m:r><m:t>1</m:t></m:r></m:e>
                  </m:mr>
                </m:m>
              </m:e>
            </m:d>
          </m:oMath>
          <![endif]-->
          </i>
        </p>
      </body></html>
    `;

    const text = htmlToAlignedBuilderText(html);
    expect(text).toContain('From');
    expect(text).toContain('T');
    expect(text).toContain('λ');
    expect(text).toContain('I =');
    expect(text).toContain('[ 1  0 ]');
    expect(text).toMatch(/I = \[ 1 {2}0 \]\n\s+\[ 0 {2}1 \]/);
    expect(text).not.toContain('{{i}}{{/i}}');
    expect(text).not.toContain('\\frac');
    expect(text).not.toMatch(/From\s*:/);
  });

  it('keeps side-by-side OMML matrices as aligned 2x2 blocks with ASCII fractions', () => {
    const matrix = (a: string, b: string, c: string, d: string) => `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:d><m:e><m:m>
          <m:mr>
            <m:e>${a}</m:e>
            <m:e>${b}</m:e>
          </m:mr>
          <m:mr>
            <m:e>${c}</m:e>
            <m:e>${d}</m:e>
          </m:mr>
        </m:m></m:e></m:d>
      </m:oMath>
    `;
    const run = (value: string) => `<m:r><m:t>${value}</m:t></m:r>`;
    const frac = (num: string, den: string) => `
      <m:f>
        <m:num>${run(num)}</m:num>
        <m:den>${run(den)}</m:den>
      </m:f>
    `;
    const signedFrac = `
      <m:r><m:t>-</m:t></m:r>
      ${frac('1', '2')}
    `;

    const html = `
      <html><body>
        <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">
          <!--[if !supportLists]><span style="mso-list:Ignore">-<span>&nbsp;</span></span><![endif]-->
          We define the following matrices
          A =
          <!--[if gte msEquation 12]>${matrix(run('4'), run('0'), run('0'), run('4'))}<![endif]-->
          B =
          <!--[if gte msEquation 12]>${matrix(run('0'), signedFrac, frac('1', '2'), run('0'))}<![endif]-->
          C =
          <!--[if gte msEquation 12]>${matrix(run('1'), run('0'), run('0'), run('-1'))}<![endif]-->
          D =
          <!--[if gte msEquation 12]>${matrix(run('4'), run('2'), run('0'), run('-1'))}<![endif]-->
        </p>
      </body></html>
    `;

    const text = htmlToAlignedBuilderText(html);
    expect(text).toContain('A =');
    expect(text).toContain('B =');
    expect(text).toContain('(-1)/(2)');
    expect(text).toContain('(1)/(2)');
    expect(text).not.toContain('\\frac');
    expect(text).not.toContain('\\textbackslash');
    expect(text).not.toMatch(/-\s+\(1\)\/\(2\)/);
    // Side-by-side matrices keep a dedicated continuation row (not one flat 1xN line).
    const lines = text?.split('\n') ?? [];
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toMatch(/A =\s*\[ 4 {2}0 \]/);
    expect(lines[0]).toContain('B =');
    expect(lines[1]).toMatch(/^\s+\[ 0 {2}4 \]/);
    expect(lines[1]).toContain('[ (1)/(2)  0 ]');

    // Preview must keep each matrix as a true 2x2 (not four 1x2 blocks).
    const latex = editorTextToLatex(text ?? '');
    expect(latex).toMatch(/\\begin\{pmatrix\} 4 & 0 \\\\ 0 & 4 \\end\{pmatrix\}/);
    expect(latex).toContain('\\frac{-1}{2}');
    expect(latex).not.toContain('\\textbackslash');
  });
});

describe('transferListPrefixesFromPlain', () => {
  it('restores Word bullets onto HTML math lines that lost list markers', () => {
    const htmlText = [
      'We define the following matrices',
      'A = [ 4  0 ]',
      '    [ 0  4 ]',
      'From T-λI:',
      'I = [ 1  0 ]',
      '    [ 0  1 ]',
    ].join('\n');
    const plainText = [
      '- We define the following matrices',
      '\to A = (■(4&0@0&4))',
      '\t\t■ From T-λI:',
      '\t\t\t● I = (■(1&0@0&1))',
    ].join('\n');

    const merged = transferListPrefixesFromPlain(htmlText, plainText);
    expect(merged).toContain('- We define the following matrices');
    expect(merged).toMatch(/^ {2}o A = \[ 4 {2}0 \]/m);
    expect(merged).toMatch(/^ {4}■ From T-λI:/m);
    expect(merged).toMatch(/^ {6}● I = \[ 1 {2}0 \]/m);
    // Continuation rows stay marker-free.
    expect(merged).toMatch(/\n\s+\[ 0 {2}4 \]/);
  });

  it('keeps HTML math when plain text has lists but weaker equations', () => {
    const plain = ['- We define the following matrices', '\to From T-λI:', '\t\t● I ='].join('\n');
    const html = `
      <html><body>
        <p class="MsoListParagraphCxSpFirst" style="margin-left:36.0pt;mso-list:l0 level1 lfo1">
          We define the following matrices
          <!--[if gte msEquation 12]>
          <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
            <m:r><m:t>A</m:t></m:r><m:r><m:t>=</m:t></m:r>
            <m:d><m:e><m:m>
              <m:mr><m:e><m:r><m:t>4</m:t></m:r></m:e><m:e><m:r><m:t>0</m:t></m:r></m:e></m:mr>
              <m:mr><m:e><m:r><m:t>0</m:t></m:r></m:e><m:e><m:r><m:t>4</m:t></m:r></m:e></m:mr>
            </m:m></m:e></m:d>
          </m:oMath>
          <![endif]-->
        </p>
        <p class="MsoListParagraphCxSpMiddle" style="margin-left:72.0pt;mso-list:l0 level2 lfo1">
          From T-λI:
        </p>
      </body></html>
    `;

    const result = resolveWordPaste(createClipboardData({ plain, html }));
    expect(result?.text).toContain('[ 4  0 ]');
    expect(result?.text).toMatch(/[-•]\s+We define the following matrices/);
    expect(result?.text).toMatch(/o From T-λI:|■ From T-λI:|• From T-λI:/);
  });
});

describe('htmlToAlignedBuilderText line breaks', () => {
  it('keeps equations separated by <br> on their own lines', () => {
    const matrix = (a: string, b: string, c: string, d: string) => `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:d><m:e><m:m>
          <m:mr><m:e><m:r><m:t>${a}</m:t></m:r></m:e><m:e><m:r><m:t>${b}</m:t></m:r></m:e></m:mr>
          <m:mr><m:e><m:r><m:t>${c}</m:t></m:r></m:e><m:e><m:r><m:t>${d}</m:t></m:r></m:e></m:mr>
        </m:m></m:e></m:d>
      </m:oMath>
    `;

    const html = `
      <html><body>
        <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">
          <!--[if !supportLists]><span style="mso-list:Ignore">●<span>&nbsp;</span></span><![endif]-->
          I =
          <!--[if gte msEquation 12]>${matrix('1', '0', '0', '1')}<![endif]-->
          <br/>
          λI =
          <!--[if gte msEquation 12]>${matrix('λ', '0', '0', 'λ')}<![endif]-->
        </p>
      </body></html>
    `;

    const text = htmlToAlignedBuilderText(html);
    expect(text).toContain('I =');
    expect(text).toContain('λI =');
    // `<br>` must keep λI on its own equation line (not glued to I's second row).
    expect(text).toMatch(/I =\s*\[ 1 {2}0 \]\n\s+\[ 0 {2}1 \]\nλI =\s*\[ λ {2}0 \]/);
    expect(text).not.toMatch(/\[ 0 {2}1 \][^\S\n]+λI =/);
  });
});

describe('fracLatexToAscii', () => {
  it('converts signed and unsigned frac commands', () => {
    expect(fracLatexToAscii('-\\frac{1}{2}')).toBe('(-1)/(2)');
    expect(fracLatexToAscii('\\frac{1}{2}')).toBe('(1)/(2)');
    expect(fracLatexToAscii('\\frac{-1}{2}')).toBe('(-1)/(2)');
  });
});

describe('unicodeMathToBuilderText', () => {
  it('detects and converts Word matrix linear format', () => {
    expect(hasUnicodeMath('(■(4&0@0&4))')).toBe(true);

    const ascii = unicodeMathToBuilderText('● (■(4&0@0&4))-(■(λ&0@0&λ))=(■(4-λ&0@0&4-λ))');

    expect(ascii).toContain('[ 4  0 ]');
    expect(ascii).toContain('[ λ  0 ]');
    expect(ascii).toContain('4-λ');
    expect(ascii).not.toContain('■');
  });

  it('renders Word UnicodeMath through the preview pipeline', () => {
    const pasted = '"A"=(■(4&0@0&4))" B"=(■(0&-1/2@1/2&0))" C"=(■(1&0@0&-1))" D"=(■(4&2@0&-1))';

    const latex = editorTextToLatex(pasted);

    expect(latex).toContain('\\begin{pmatrix}');
    expect(latex).toContain('\\frac{-1}{2}');
    expect(latex).toContain('\\text{A}');
    expect(latex).not.toContain('■');
  });
});
