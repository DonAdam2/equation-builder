import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from 'react-toastify';

type CopyValue = string | number | (() => boolean | Promise<boolean>);

const DEFAULT_SUCCESS_MESSAGE = 'Copied successfully';
const TOAST_DURATION_MS = 3000;

/**
 * Ported from DonAdam2/custom-react-hooks (UseCopyToClipboard).
 * Supports plain string/number copy plus an async custom copy callback (e.g. Word MathML).
 */
function useCopyToClipboard(successMessage = DEFAULT_SUCCESS_MESSAGE) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    toast.success(successMessage, { autoClose: TOAST_DURATION_MS });
    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, TOAST_DURATION_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isCopied, successMessage]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async (value: CopyValue) => {
    if (typeof value === 'function') {
      const success = await value();
      setIsCopied(Boolean(success));
      return;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const text = value.toString();

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          setIsCopied(true);
          return;
        }
      } catch {
        // Fall through to legacy copy.
      }

      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        setIsCopied(document.execCommand('copy'));
      } finally {
        document.body.removeChild(textarea);
      }
      return;
    }

    setIsCopied(false);
    console.error(`Cannot copy typeof ${typeof value} to clipboard, must be a string or number.`);
  }, []);

  return { isCopied, handleCopy };
}

export default useCopyToClipboard;
