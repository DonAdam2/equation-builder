import 'katex/dist/katex.min.css';

import useEquationPreview from '@/hooks/useEquationPreview';

import { EquationPreviewProps } from '@/components/equationPreview/EquationPreview.types';

const EquationPreview = ({ editorText }: EquationPreviewProps) => {
  const { blocks, hasContent, errorMessage } = useEquationPreview(editorText);

  return (
    <section className="equation-preview-wrapper" aria-label="Word-style formula preview">
      <div className="equation-section-heading">
        <h2>Word-style Preview</h2>
        <p>
          Matrices, fractions, and paragraph alignment (left / center / right) match Word-style
          layout.
        </p>
      </div>

      <div className="equation-preview-canvas">
        {!hasContent ? (
          <p className="equation-preview-empty">
            Your formula preview will appear here as you type or insert equations.
          </p>
        ) : errorMessage ? (
          <p className="equation-preview-error">{errorMessage}</p>
        ) : (
          <div className="equation-preview-blocks" data-testid="equation-preview-math">
            {blocks.map((block, index) => (
              <div
                key={`${block.align}-${index}`}
                className={`equation-preview-block is-${block.align}`}
                data-align={block.align}
                dangerouslySetInnerHTML={{ __html: block.katexMarkup }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default EquationPreview;
