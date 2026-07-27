import {
  applyDisplayEdit,
  buildRichTextDisplay,
  cleanupRichTextMarkers,
  displayCaretToModel,
  modelCaretToDisplay,
  modelToMirrorHtml,
  rebalanceInlineFormatsAcrossNewlines,
  toDisplayText,
} from '@/utils/richTextDisplay';
import { isInlineFormatActive, toggleInlineFormat } from '@/utils/textFormatting';

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
    expect(cleanupRichTextMarkers('{{b}}')).toBe('');
    expect(cleanupRichTextMarkers('A{{b}}C')).toBe('AC');
    expect(cleanupRichTextMarkers('{{b}}x{{/b}}{{b}}y')).toBe('{{b}}x{{/b}}y');
  });

  it('select-all delete drops the surviving open marker instead of showing it raw', () => {
    // Bold first lines, plain rest — the state from the reported bug.
    const model = '{{b}}asdf{{/b}}\n{{b}}asdf{{/b}}\n{{b}}adsf{{/b}}\nasdf\nadsf\nasdf';
    const result = applyDisplayEdit(model, '', 0);
    expect(result.nextModel).toBe('');
    expect(modelToMirrorHtml(result.nextModel)).toBe('');
  });

  it('rebalances bold across Enter so markers are not left open on a line', () => {
    expect(rebalanceInlineFormatsAcrossNewlines('{{b}}asdf asdf adsf\n{{/b}}')).toBe(
      '{{b}}asdf asdf adsf{{/b}}\n{{b}}{{/b}}'
    );

    let model = '{{b}}{{/b}}';
    for (const character of 'asdf asdf adsf') {
      model = applyDisplayEdit(model, `${toDisplayText(model)}${character}`).nextModel;
    }
    expect(model).toBe('{{b}}asdf asdf adsf{{/b}}');

    const afterEnter = applyDisplayEdit(model, `${toDisplayText(model)}\n`);
    expect(afterEnter.nextModel).toBe('{{b}}asdf asdf adsf{{/b}}\n{{b}}{{/b}}');
    expect(toDisplayText(afterEnter.nextModel)).toBe('asdf asdf adsf\n');
    expect(modelToMirrorHtml(afterEnter.nextModel)).toContain('<b>asdf asdf adsf</b>');
    expect(modelToMirrorHtml(afterEnter.nextModel)).not.toContain('{{b}}');
  });

  it('bolds first paragraph without wrapping the trailing newline, then Enter stays on the new line', () => {
    const paragraphs = 'asdf\nadsf\nasdf';

    // Selecting the first line often includes the trailing \\n in the textarea.
    const bolded = toggleInlineFormat(paragraphs, 0, 'asdf\n'.length, 'bold');
    expect(bolded.nextValue).toBe('{{b}}asdf{{/b}}\nadsf\nasdf');
    expect(toDisplayText(bolded.nextValue)).toBe(paragraphs);

    // Caret must stay on the bold line (end), not jump to the start of "adsf".
    const map = buildRichTextDisplay(bolded.nextValue);
    const displayStart = modelCaretToDisplay(map, bolded.selectionStart);
    const displayEnd = modelCaretToDisplay(map, bolded.selectionEnd);
    expect(displayStart).toBeGreaterThanOrEqual(0);
    expect(displayEnd).toBeLessThanOrEqual(4);
    expect(displayEnd).not.toBe(5);

    // Enter at end of first line — caret lands on the new blank line (not on "adsf").
    const display = toDisplayText(bolded.nextValue);
    const caretAtEndOfFirst = 4;
    const nextDisplay = `${display.slice(0, caretAtEndOfFirst)}\n${display.slice(caretAtEndOfFirst)}`;
    // Browser places selectionStart right after the inserted newline (5).
    const afterEnter = applyDisplayEdit(bolded.nextValue, nextDisplay, 5);
    expect(afterEnter.displayCaret).toBe(5);
    expect(toDisplayText(afterEnter.nextModel).slice(0, 6)).toBe('asdf\n\n');
    expect(toDisplayText(afterEnter.nextModel).slice(afterEnter.displayCaret)).toBe('\nadsf\nasdf');

    // Diff-only path (no preferred caret) should also keep the blank-line caret.
    const afterEnterHeuristic = applyDisplayEdit(bolded.nextValue, nextDisplay);
    expect(afterEnterHeuristic.displayCaret).toBe(5);
  });

  it('continues bold on the next line after Enter so typed text stays bold', () => {
    const bolded = toggleInlineFormat('hello', 0, 5, 'bold');
    expect(bolded.nextValue).toBe('{{b}}hello{{/b}}');

    const display = toDisplayText(bolded.nextValue);
    const withNewline = `${display}\n`;
    const afterEnter = applyDisplayEdit(bolded.nextValue, withNewline, withNewline.length);
    expect(afterEnter.nextModel).toBe('{{b}}hello{{/b}}\n{{b}}{{/b}}');

    const map = buildRichTextDisplay(afterEnter.nextModel);
    const modelCaret = displayCaretToModel(map, afterEnter.displayCaret);
    expect(isInlineFormatActive(afterEnter.nextModel, modelCaret, modelCaret, 'bold')).toBe(true);

    const typed = applyDisplayEdit(
      afterEnter.nextModel,
      `${withNewline}x`,
      withNewline.length + 1
    );
    expect(typed.nextModel).toBe('{{b}}hello{{/b}}\n{{b}}x{{/b}}');
  });

  it('continues bold after Enter even when more paragraphs follow', () => {
    const bolded = toggleInlineFormat('asdf\nadsf\nasdf', 0, 4, 'bold');
    expect(bolded.nextValue).toBe('{{b}}asdf{{/b}}\nadsf\nasdf');

    // Enter at end of first line (display 4) → browser caret 5.
    const nextDisplay = 'asdf\n\nadsf\nasdf';
    const afterEnter = applyDisplayEdit(bolded.nextValue, nextDisplay, 5);
    expect(afterEnter.nextModel).toBe('{{b}}asdf{{/b}}\n{{b}}{{/b}}\nadsf\nasdf');

    const map = buildRichTextDisplay(afterEnter.nextModel);
    const modelCaret = displayCaretToModel(map, afterEnter.displayCaret);
    expect(isInlineFormatActive(afterEnter.nextModel, modelCaret, modelCaret, 'bold')).toBe(true);

    const typed = applyDisplayEdit(afterEnter.nextModel, 'asdf\nx\nadsf\nasdf', 6);
    expect(typed.nextModel).toBe('{{b}}asdf{{/b}}\n{{b}}x{{/b}}\nadsf\nasdf');
  });

  it('types plain text after exiting superscript at the end of a run', () => {
    const wrapped = toggleInlineFormat('y = x2', 5, 6, 'superscript');
    expect(wrapped.nextValue).toBe('y = x{{sup}}2{{/sup}}');
    const exited = toggleInlineFormat(
      wrapped.nextValue,
      wrapped.selectionStart,
      wrapped.selectionEnd,
      'superscript'
    );
    expect(exited.selectionStart).toBe('y = x{{sup}}2{{/sup}}'.length);
    expect(
      isInlineFormatActive(exited.nextValue, exited.selectionStart, exited.selectionEnd, 'superscript')
    ).toBe(false);

    // Display caret at end maps inside the run without model affinity — pass the
    // exited model caret so new characters stay outside {{sup}}.
    const display = toDisplayText(exited.nextValue);
    const typed = applyDisplayEdit(
      exited.nextValue,
      `${display}z`,
      display.length + 1,
      exited.selectionStart
    );
    expect(typed.nextModel).toBe('y = x{{sup}}2{{/sup}}z');
    expect(
      isInlineFormatActive(typed.nextModel, typed.nextModel.length, typed.nextModel.length, 'superscript')
    ).toBe(false);
  });
});
