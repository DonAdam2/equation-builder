import { EquationToolbarProps } from '@/components/equationToolbar/EquationToolbar.types';
import Button from '@/components/shared/button/Button';
import CopyButton from '@/components/shared/copyButton/CopyButton';

const EquationToolbar = ({
  onCopy,
  onDownloadPdf,
  isCopyDisabled = false,
  isDownloadDisabled = false,
  statusMessage,
}: EquationToolbarProps) => {
  return (
    <div className="equation-toolbar-wrapper">
      <div className="equation-toolbar-actions">
        <CopyButton
          onCopy={onCopy}
          disabled={isCopyDisabled}
          dataTest="copy-equation-content"
          title="Copy the Word-style formula (MathML) to paste into Microsoft Word"
          ariaLabel="Copy formula for Word"
          successMessage="Copied Word-style formula. Paste into desktop Word (Ctrl/Cmd+V)."
        />
        <Button
          label="Download PDF"
          variant="primary"
          onClick={onDownloadPdf}
          disabled={isDownloadDisabled}
          dataTest="download-equation-pdf"
        />
      </div>
      {statusMessage ? <p className="equation-toolbar-status">{statusMessage}</p> : null}
    </div>
  );
};

export default EquationToolbar;
