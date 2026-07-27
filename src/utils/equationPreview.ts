import katex from 'katex';

import { AlignedBlock, parseAlignedBlocks, TextAlign } from '@/utils/textAlignment';
import { editorTextToLatex } from '@/utils/textToLatex';

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

const toPreviewBlocks = (alignedBlocks: AlignedBlock[]): PreviewBlock[] =>
  alignedBlocks
    .map((block) => {
      const latex = editorTextToLatex(block.text);
      if (!latex) {
        return null;
      }
      return {
        align: block.align,
        latex,
        katexMarkup: renderKatexMarkup(latex),
      };
    })
    .filter((block): block is PreviewBlock => Boolean(block));

/** Builds the same Word-style KaTeX blocks used by the live preview. */
export const buildPreviewBlocks = (editorText: string): PreviewBlock[] => {
  const alignedBlocks = parseAlignedBlocks(editorText);
  return toPreviewBlocks(
    alignedBlocks.length ? alignedBlocks : [{ align: 'left', text: editorText }]
  );
};
