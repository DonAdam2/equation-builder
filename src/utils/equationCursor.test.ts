import { Equation } from '@/models/Equation';

import { insertTemplateAtCursor } from '@/utils/equationCursor';

describe('insertTemplateAtCursor', () => {
  it('merges a multiline matrix into existing equation rows at the cursor', () => {
    const currentValue = [
      '[ a11  a12 ] × [ b11  b12  b13 ] =',
      '[ a21  a22 ]   [ b21  b22  b23 ]',
    ].join('\n');

    const equation: Equation = {
      id: 'matrix',
      name: 'Matrix',
      description: 'matrix',
      template: '[ c11  c12  c13 ]\n[ c21  c22  c23 ]',
      expectedVariables: ['c11', 'c12', 'c13', 'c21', 'c22', 'c23'],
      interactiveKind: 'matrix',
    };

    const cursor = currentValue.indexOf('=') + 1;
    const result = insertTemplateAtCursor({
      currentValue,
      selectionStart: cursor,
      selectionEnd: cursor,
      equation,
    });

    expect(result.nextValue).toBe(
      [
        '[ a11  a12 ] × [ b11  b12  b13 ] = [ c11  c12  c13 ]',
        '[ a21  a22 ]   [ b21  b22  b23 ]   [ c21  c22  c23 ]',
      ].join('\n')
    );
    expect(result.nextValue.slice(result.selectionStart, result.selectionEnd)).toBe('c11');
  });

  it('inserts a single-line template at the caret', () => {
    const equation: Equation = {
      id: 'sigmoid',
      name: 'Sigmoid',
      description: 'sigmoid',
      template: 'σ(x)',
      expectedVariables: ['x'],
    };

    const result = insertTemplateAtCursor({
      currentValue: 'f = ',
      selectionStart: 4,
      selectionEnd: 4,
      equation,
    });

    expect(result.nextValue).toBe('f = σ(x)');
    expect(result.nextValue.slice(result.selectionStart, result.selectionEnd)).toBe('x');
  });
});
