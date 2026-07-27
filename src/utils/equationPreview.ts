import katex from 'katex';

import { rebalanceInlineFormatsAcrossNewlines } from '@/utils/richTextDisplay';
import {
  AlignedBlock,
  parseAlignedBlocks,
  stripAlignMarkers,
  TextAlign,
} from '@/utils/textAlignment';
import { editorLineGroupToLatex, editorTextToLatex, groupEditorLines } from '@/utils/textToLatex';
import { hasUnicodeMath, unicodeMathToBuilderText } from '@/utils/wordPaste';

export interface PreviewBlock {
  align: TextAlign;
  latex: string;
  katexMarkup: string;
}

const renderKatexMarkup = (latex: string): string =>
  katex.renderToString(latex, {
    throwOnError: false,
    displayMode: true,
    output: 'html',
    strict: 'ignore',
  });

const prepareEditorText = (text: string): string => {
  const withoutAlign = stripAlignMarkers(rebalanceInlineFormatsAcrossNewlines(text));
  const prepared = hasUnicodeMath(withoutAlign)
    ? unicodeMathToBuilderText(withoutAlign)
    : withoutAlign;
  return prepared.replace(/\r\n/g, '\n');
};

const pushPreviewBlock = (blocks: PreviewBlock[], align: TextAlign, latex: string): void => {
  const trimmed = latex.trim();
  if (!trimmed) {
    return;
  }
  blocks.push({
    align,
    latex: trimmed,
    katexMarkup: renderKatexMarkup(trimmed),
  });
};

/**
 * Turns one aligned editor region into one preview row per visual line/group.
 * KaTeX does not reliably honor top-level `\\`, so we use separate DOM blocks
 * (CSS column + gap) instead of packing newlines into a single formula.
 */
const alignedTextToPreviewBlocks = (align: TextAlign, text: string): PreviewBlock[] => {
  const normalized = prepareEditorText(text);
  if (!normalized.trim()) {
    return [];
  }

  const blocks: PreviewBlock[] = [];
  const paragraphs = normalized.split(/\n{2,}/);

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      continue;
    }

    // Keep $$…$$ chunks as their own rows; convert ASCII around them per line group.
    const dollarLatexRe = /\$\$([\s\S]+?)\$\$/g;
    let lastIndex = 0;
    let match = dollarLatexRe.exec(paragraph);

    const consumeAscii = (ascii: string) => {
      if (!ascii.trim()) {
        return;
      }
      const groups = groupEditorLines(ascii.replace(/\r\n/g, '\n').split('\n'));
      for (const group of groups) {
        if (group.kind === 'prose') {
          for (const line of group.lines) {
            if (!line.trim()) {
              continue;
            }
            pushPreviewBlock(
              blocks,
              align,
              editorLineGroupToLatex({ kind: 'prose', lines: [line] })
            );
          }
          continue;
        }
        pushPreviewBlock(blocks, align, editorLineGroupToLatex(group));
      }
    };

    while (match) {
      consumeAscii(paragraph.slice(lastIndex, match.index));
      pushPreviewBlock(blocks, align, match[1].trim());
      lastIndex = match.index + match[0].length;
      match = dollarLatexRe.exec(paragraph);
    }

    consumeAscii(paragraph.slice(lastIndex));
  }

  // Fallback if nothing was produced (shouldn't happen for normal text).
  if (!blocks.length) {
    const latex = editorTextToLatex(text);
    pushPreviewBlock(blocks, align, latex);
  }

  return blocks;
};

const toPreviewBlocks = (alignedBlocks: AlignedBlock[]): PreviewBlock[] =>
  alignedBlocks.flatMap((block) => alignedTextToPreviewBlocks(block.align, block.text));

/** Builds the same Word-style KaTeX blocks used by the live preview. */
export const buildPreviewBlocks = (editorText: string): PreviewBlock[] => {
  const alignedBlocks = parseAlignedBlocks(editorText);
  return toPreviewBlocks(
    alignedBlocks.length ? alignedBlocks : [{ align: 'left', text: editorText }]
  );
};
