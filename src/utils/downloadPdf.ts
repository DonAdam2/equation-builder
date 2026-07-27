import { jsPDF } from 'jspdf';

export const downloadTextAsPdf = (text: string, fileName = 'equation-builder.pdf'): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // White page background for Word/print-friendly export
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');

  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  const margin = 15;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const lineHeight = 7;
  const content = text.trim() || ' ';
  const lines = doc.splitTextToSize(content, maxWidth);

  let y = margin;
  const pageHeight = doc.internal.pageSize.getHeight();

  lines.forEach((line: string) => {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
      doc.setTextColor(20, 20, 20);
      y = margin;
    }

    doc.text(line, margin, y);
    y += lineHeight;
  });

  doc.save(fileName);
};
