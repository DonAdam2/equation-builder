import {
  applyDisplayEdit,
  buildRichTextDisplay,
  cleanupRichTextMarkers,
  displayCaretToModel,
  modelCaretToDisplay,
  modelToMirrorHtml,
  toDisplayText,
} from '@/utils/richTextDisplay';

describe('richTextDisplay', () => {
  it('hides inline and align markers in the display string', () => {
    const model = '{{align:center}}\nHello {{b}}world{{/b}} {{i}}now{{/i}}';
    expect(toDisplayText(model)).toBe('Hello world now');
  });

  it('maps caret inside an empty format pair for Word-like bold-then-type', () => {
    const map = buildRichTextDisplay('{{b}}{{/b}}');
    expect(map.display).toBe('');
    expect(displayCaretToModel(map, 0)).toBe('{{b}}'.length);

    const typed = applyDisplayEdit('{{b}}{{/b}}', 'a');
    expect(typed.nextModel).toBe('{{b}}a{{/b}}');
  });

  it('preserves markers outside an edited display span', () => {
    const model = 'A{{b}}B{{/b}}C';
    const deleted = applyDisplayEdit(model, 'AC');
    expect(deleted.nextModel).toBe('AC');

    // Boundary after unstyled "A" prefers the following bold span (Word-like affinity).
    const inserted = applyDisplayEdit(model, 'AxBC');
    expect(inserted.nextModel).toBe('A{{b}}xB{{/b}}C');
  });

  it('round-trips model caret through display offsets', () => {
    const model = 'Hi {{b}}there{{/b}}';
    const map = buildRichTextDisplay(model);
    const insideBold = model.indexOf('there') + 2; // caret before 'e'
    const displayOffset = modelCaretToDisplay(map, insideBold);
    expect(map.display[displayOffset]).toBe('e');
    expect(displayCaretToModel(map, displayOffset)).toBe(insideBold);
  });

  it('builds a styled mirror without marker text', () => {
    const html = modelToMirrorHtml('{{align:right}}\n{{b}}Bold{{/b}} {{i}}Italic{{/i}}');
    expect(html).toContain('<b>Bold</b>');
    expect(html).toContain('<i>Italic</i>');
    expect(html).not.toContain('{{b}}');
    expect(html).not.toContain('align:right');
  });

  it('cleans empty and orphan markers', () => {
    expect(cleanupRichTextMarkers('A{{b}}{{/b}}C')).toBe('AC');
    expect(cleanupRichTextMarkers('A{{/b}}C')).toBe('AC');
  });
});
