import { useMemo } from 'react';

import { buildPreviewBlocks, PreviewBlock } from '@/utils/equationPreview';

interface UseEquationPreviewResult {
  latex: string;
  katexMarkup: string;
  blocks: PreviewBlock[];
  hasContent: boolean;
  errorMessage: string | null;
}

const useEquationPreview = (editorText: string): UseEquationPreviewResult => {
  return useMemo(() => {
    try {
      const blocks = buildPreviewBlocks(editorText);

      if (!blocks.length) {
        return {
          latex: '',
          katexMarkup: '',
          blocks: [],
          hasContent: false,
          errorMessage: null,
        };
      }

      return {
        latex: blocks.map((block) => block.latex).join(' \\\\[0.75em] '),
        katexMarkup: blocks.map((block) => block.katexMarkup).join(''),
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

export type { PreviewBlock };
export default useEquationPreview;
