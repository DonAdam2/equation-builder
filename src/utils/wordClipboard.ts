import katex from 'katex';

import { parseAlignedBlocks, TextAlign } from '@/utils/textAlignment';
import { richTextToHtml } from '@/utils/textFormatting';
import { editorLineGroupToLatex, EditorLineGroup, groupEditorLines } from '@/utils/textToLatex';
import { hasUnicodeMath, unicodeMathToBuilderText } from '@/utils/wordPaste';

/* eslint-disable testing-library/render-result-naming-convention -- katex.renderToString is not RTL render() */

export interface WordCopyBlock {
  align: TextAlign;
  latex: string;
}

/**
 * Word (desktop) converts bare Presentation MathML from text/html into a
 * native editable equation. See EquaPaste clipboard findings.
 */
export const extractMathMl = (latex: string): string => {
  const katexMathMl = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: true,
    output: 'mathml',
    strict: 'ignore',
  });
  const match = katexMathMl.match(/<math[\s\S]*?<\/math>/i);
  return match?.[0] ?? katexMathMl;
};

/** Legacy helper: one MathML equation per latex block. */
export const buildAlignedWordHtml = (blocks: WordCopyBlock[]): string => {
  if (!blocks.length) {
    return '';
  }

  return blocks
    .map((block) => {
      const mathml = extractMathMl(block.latex);
      return `<div style="text-align:${block.align}">${mathml}</div>`;
    })
    .join('');
};

const proseGroupToHtml = (group: EditorLineGroup, align: TextAlign): string =>
  group.lines
    .map((line) => {
      if (!line.trim()) {
        return '<p style="margin:0">&nbsp;</p>';
      }
      return `<p style="text-align:${align};margin:0">${richTextToHtml(line)}</p>`;
    })
    .join('');

const mathGroupToHtml = (group: EditorLineGroup, align: TextAlign): string => {
  const latex = editorLineGroupToLatex(group);
  if (!latex.trim()) {
    return '';
  }
  return `<div style="text-align:${align}">${extractMathMl(latex)}</div>`;
};

const asciiChunkToWordHtml = (text: string, align: TextAlign): string => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  return groupEditorLines(lines)
    .map((group) => {
      if (group.kind === 'prose') {
        return proseGroupToHtml(group, align);
      }
      return mathGroupToHtml(group, align);
    })
    .filter(Boolean)
    .join('');
};

/**
 * Builds Word HTML where prose stays normal paragraph text and only real
 * math/matrices become MathML equation objects.
 */
export const buildMixedWordHtml = (editorText: string): string => {
  const normalized = editorText.replace(/\r\n/g, '\n');
  if (!normalized.trim()) {
    return '';
  }

  const alignedBlocks = parseAlignedBlocks(normalized);
  const blocks = alignedBlocks.length
    ? alignedBlocks
    : [{ align: 'left' as const, text: normalized }];

  return blocks
    .map((block) => {
      const prepared = hasUnicodeMath(block.text)
        ? unicodeMathToBuilderText(block.text)
        : block.text;
      const parts: string[] = [];
      const dollarLatexRe = /\$\$([\s\S]+?)\$\$/g;
      let lastIndex = 0;
      let match = dollarLatexRe.exec(prepared);

      while (match) {
        const before = prepared.slice(lastIndex, match.index);
        if (before.trim()) {
          parts.push(asciiChunkToWordHtml(before, block.align));
        }
        const latexSegment = match[1].trim();
        if (latexSegment) {
          parts.push(`<div style="text-align:${block.align}">${extractMathMl(latexSegment)}</div>`);
        }
        lastIndex = match.index + match[0].length;
        match = dollarLatexRe.exec(prepared);
      }

      const after = prepared.slice(lastIndex);
      if (after.trim() || !parts.length) {
        parts.push(asciiChunkToWordHtml(after, block.align));
      }

      return parts.filter(Boolean).join('');
    })
    .join('');
};

const resolveCopyPayload = ({
  editorText,
  blocks,
  latex,
  plainFallback,
}: {
  editorText?: string;
  blocks?: WordCopyBlock[];
  latex?: string;
  plainFallback: string;
}): { html: string; plainText: string } => {
  if (editorText?.trim()) {
    return {
      html: buildMixedWordHtml(editorText),
      plainText: editorText,
    };
  }

  const effectiveBlocks =
    blocks?.filter((block) => block.latex.trim()) ??
    (latex?.trim() ? [{ align: 'left' as const, latex }] : []);

  if (effectiveBlocks.length) {
    return {
      html: buildAlignedWordHtml(effectiveBlocks),
      plainText: plainFallback || effectiveBlocks.map((block) => `$$${block.latex}$$`).join('\n\n'),
    };
  }

  return { html: '', plainText: plainFallback };
};

/** Used by Ctrl/Cmd+C on the editor — write Word MathML into the active copy event. */
export const writeWordStyleToClipboardEvent = (
  event: ClipboardEvent,
  {
    editorText,
    blocks,
    latex,
    plainFallback,
  }: {
    editorText?: string;
    blocks?: WordCopyBlock[];
    latex?: string;
    plainFallback: string;
  }
): boolean => {
  if (
    !event.clipboardData ||
    (!editorText?.trim() && !blocks?.length && !latex && !plainFallback)
  ) {
    return false;
  }

  event.preventDefault();
  const { html, plainText } = resolveCopyPayload({ editorText, blocks, latex, plainFallback });

  if (html) {
    event.clipboardData.setData('text/html', html);
    event.clipboardData.setData('text/plain', plainText);
  } else {
    event.clipboardData.setData('text/plain', plainFallback);
  }

  return true;
};

export const copyWordStyleFormula = async ({
  editorText,
  blocks,
  latex,
  plainFallback,
}: {
  editorText?: string;
  blocks?: WordCopyBlock[];
  latex?: string;
  plainFallback: string;
}): Promise<boolean> => {
  if (!editorText?.trim() && !blocks?.length && !latex && !plainFallback) {
    return false;
  }

  const { html, plainText } = resolveCopyPayload({ editorText, blocks, latex, plainFallback });

  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write && html) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      return true;
    }
  } catch {
    // Fall through to simpler clipboard APIs.
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(html || plainText || plainFallback);
      return true;
    }
  } catch {
    // Fall through to legacy copy.
  }

  const textarea = document.createElement('textarea');
  textarea.value = html || plainText || plainFallback;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
};
