import { useMemo } from 'react';

import katex from 'katex';

import { AlignedBlock, parseAlignedBlocks, TextAlign } from '@/utils/textAlignment';
import { editorTextToLatex } from '@/utils/textToLatex';

export interface PreviewBlock {
  align: TextAlign;
  latex: string;
  katexMarkup: string;
}

interface UseEquationPreviewResult {
  latex: string;
  katexMarkup: string;
  blocks: PreviewBlock[];
  hasContent: boolean;
  errorMessage: string | null;
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

const useEquationPreview = (editorText: string): UseEquationPreviewResult => {
  return useMemo(() => {
    const alignedBlocks = parseAlignedBlocks(editorText);
    const blocks = toPreviewBlocks(
      alignedBlocks.length ? alignedBlocks : [{ align: 'left', text: editorText }]
    );

    if (!blocks.length) {
      return {
        latex: '',
        katexMarkup: '',
        blocks: [],
        hasContent: false,
        errorMessage: null,
      };
    }

    try {
      const latex = blocks.map((block) => block.latex).join(' \\\\[0.75em] ');
      const katexMarkup = blocks.map((block) => block.katexMarkup).join('');

      return {
        latex,
        katexMarkup,
        blocks,
        hasContent: true,
        errorMessage: null,
      };
    } catch (error) {
      return {
        latex: '',
        katexMarkup: '',
        blocks: [],
        hasContent: false,
        errorMessage: error instanceof Error ? error.message : 'Unable to render preview.',
      };
    }
  }, [editorText]);
};

export default useEquationPreview;
