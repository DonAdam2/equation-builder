import 'katex/dist/katex.min.css';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { buildPreviewBlocks } from '@/utils/equationPreview';

const PAGE_MARGIN_MM = 15;
const RENDER_WIDTH_PX = 800;

const createWordStyleMount = (editorText: string): HTMLDivElement => {
  const mount = document.createElement('div');
  mount.setAttribute('data-testid', 'pdf-word-style-source');
  // Keep the node in the viewport so html2canvas does not grab the editor.
  // Opacity 0 still participates in layout/paint for html2canvas.
  mount.style.cssText = [
    'position: fixed',
    'left: 0',
    'top: 0',
    `width: ${RENDER_WIDTH_PX}px`,
    'padding: 28px 32px',
    'background: #ffffff',
    'color: #141414',
    'box-sizing: border-box',
    'z-index: 2147483646',
    'opacity: 0',
    'pointer-events: none',
  ].join(';');

  const livePreview = document.querySelector<HTMLElement>('[data-testid="equation-preview-math"]');
  if (livePreview && livePreview.childElementCount > 0) {
    const clone = livePreview.cloneNode(true) as HTMLElement;
    clone.style.width = '100%';
    mount.appendChild(clone);
    return mount;
  }

  const blocks = buildPreviewBlocks(editorText);
  const blocksEl = document.createElement('div');
  blocksEl.className = 'equation-preview-blocks';

  if (!blocks.length) {
    const empty = document.createElement('p');
    empty.textContent = ' ';
    empty.style.margin = '0';
    blocksEl.appendChild(empty);
  } else {
    blocks.forEach((block) => {
      const blockEl = document.createElement('div');
      blockEl.className = `equation-preview-block is-${block.align}`;
      blockEl.setAttribute('data-align', block.align);
      blockEl.innerHTML = block.katexMarkup;
      blocksEl.appendChild(blockEl);
    });
  }

  mount.appendChild(blocksEl);
  return mount;
};

const addCanvasPagesToPdf = (doc: jsPDF, canvas: HTMLCanvasElement): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN_MM * 2;
  const pageContentHeight = pageHeight - PAGE_MARGIN_MM * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  let heightLeft = imgHeight;
  let position = PAGE_MARGIN_MM;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.addImage(imgData, 'PNG', PAGE_MARGIN_MM, position, contentWidth, imgHeight);
  heightLeft -= pageContentHeight;

  while (heightLeft > 0) {
    position = PAGE_MARGIN_MM - (imgHeight - heightLeft);
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.addImage(imgData, 'PNG', PAGE_MARGIN_MM, position, contentWidth, imgHeight);
    heightLeft -= pageContentHeight;
  }
};

/**
 * Downloads a PDF of the Word-style KaTeX preview (not raw editor markers).
 */
export const downloadWordStyleAsPdf = async (
  editorText: string,
  fileName = 'ai-formula-builder.pdf'
): Promise<void> => {
  const mount = createWordStyleMount(editorText);
  document.body.appendChild(mount);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    // Force layout before capture.
    void mount.offsetHeight;

    const canvas = await html2canvas(mount, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: RENDER_WIDTH_PX,
      onclone: (_document, element) => {
        element.style.opacity = '1';
      },
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    addCanvasPagesToPdf(doc, canvas);
    doc.save(fileName);
  } finally {
    mount.remove();
  }
};

/** @deprecated Prefer downloadWordStyleAsPdf for Word-style output. */
export const downloadTextAsPdf = (text: string, fileName = 'equation-builder.pdf'): void => {
  void downloadWordStyleAsPdf(text, fileName);
};
