import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { downloadWordStyleAsPdf } from '@/utils/downloadPdf';

const mockSave = jest.fn();
const mockAddImage = jest.fn();
const mockAddPage = jest.fn();
const mockRect = jest.fn();
const mockSetFillColor = jest.fn();

jest.mock('jspdf', () => ({
  jsPDF: jest.fn(),
}));

jest.mock('html2canvas', () => jest.fn());

describe('downloadWordStyleAsPdf', () => {
  beforeEach(() => {
    mockSave.mockClear();
    mockAddImage.mockClear();
    mockAddPage.mockClear();
    mockRect.mockClear();
    mockSetFillColor.mockClear();

    (jsPDF as unknown as jest.Mock).mockImplementation(() => ({
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      setFillColor: mockSetFillColor,
      rect: mockRect,
      addImage: mockAddImage,
      addPage: mockAddPage,
      save: mockSave,
    }));

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    canvas.toDataURL = jest.fn(() => 'data:image/png;base64,test');
    (html2canvas as jest.Mock).mockResolvedValue(canvas);
  });

  it('renders Word-style preview content into the PDF instead of raw markers', async () => {
    await downloadWordStyleAsPdf('{{b}}Hello{{/b}} (1)/(2)', 'test.pdf');

    expect(html2canvas).toHaveBeenCalled();
    const source = (html2canvas as jest.Mock).mock.calls[0][0] as HTMLElement;
    expect(source).toHaveAttribute('data-testid', 'pdf-word-style-source');
    expect(source).toHaveStyle({ left: '0px' });
    expect(source.innerHTML).not.toContain('{{b}}');
    expect(source.innerHTML).toContain('katex');
    expect(mockAddImage).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith('test.pdf');
  });

  it('prefers cloning the live Word-style preview when present', async () => {
    const live = document.createElement('div');
    live.setAttribute('data-testid', 'equation-preview-math');
    live.innerHTML =
      '<div class="equation-preview-block is-left"><span class="katex">live</span></div>';
    document.body.appendChild(live);

    try {
      await downloadWordStyleAsPdf('[ a11  a12 ]\n[ a21  a22 ]', 'live.pdf');
      const source = (html2canvas as jest.Mock).mock.calls[0][0] as HTMLElement;
      expect(source.innerHTML).toContain('live');
      expect(source.innerHTML).not.toContain('[ a11');
      expect(mockSave).toHaveBeenCalledWith('live.pdf');
    } finally {
      live.remove();
    }
  });
});
