export interface EquationToolbarProps {
  onCopy: () => boolean | Promise<boolean>;
  onDownloadPdf: () => void;
  isCopyDisabled?: boolean;
  isDownloadDisabled?: boolean;
  statusMessage?: string;
}
