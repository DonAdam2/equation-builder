import cx from 'classnames';

import useCopyToClipboard from '@/hooks/useCopyToClipboard';

import { CopyButtonProps } from '@/components/shared/copyButton/CopyButton.types';

const CopyIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
);

const CopiedIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
  </svg>
);

/**
 * Ported from DonAdam2/custom-react-hooks CopyButton.
 * Uses SVG icons instead of Font Awesome so the project stays dependency-light.
 */
const CopyButton = ({
  text,
  onCopy,
  successMessage,
  disabled = false,
  title = 'Copy',
  dataTest = 'copy-button',
  className,
  ariaLabel = 'Copy',
}: CopyButtonProps) => {
  const { isCopied, handleCopy } = useCopyToClipboard(successMessage);

  const handleClick = () => {
    if (isCopied || disabled) {
      return;
    }

    if (onCopy) {
      void handleCopy(onCopy);
      return;
    }

    if (typeof text === 'string' || typeof text === 'number') {
      void handleCopy(text);
    }
  };

  return (
    <button
      type="button"
      className={cx('copy-to-clipboard-button', className)}
      onClick={handleClick}
      disabled={disabled || isCopied}
      title={isCopied ? 'Copied' : title}
      aria-label={isCopied ? 'Copied' : ariaLabel}
      data-testid={dataTest}
    >
      {isCopied ? <CopiedIcon /> : <CopyIcon />}
    </button>
  );
};

export default CopyButton;
