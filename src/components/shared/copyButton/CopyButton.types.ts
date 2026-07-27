export interface CopyButtonProps {
  /** Plain text/number to copy. Ignored when `onCopy` is provided. */
  text?: string | number;
  /** Custom copy handler (e.g. Word MathML). Return true on success. */
  onCopy?: () => boolean | Promise<boolean>;
  /** Toast message shown after a successful copy. */
  successMessage?: string;
  disabled?: boolean;
  title?: string;
  dataTest?: string;
  className?: string;
  ariaLabel?: string;
}
