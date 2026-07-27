import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import EquationToolbar from './EquationToolbar';

describe('EquationToolbar', () => {
  it('triggers copy and download actions', async () => {
    const user = userEvent.setup();
    const onCopy = jest.fn().mockResolvedValue(true);
    const onDownloadPdf = jest.fn();

    renderWithProviders(<EquationToolbar onCopy={onCopy} onDownloadPdf={onDownloadPdf} />);

    await user.click(screen.getByRole('button', { name: /copy formula for word/i }));
    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onDownloadPdf).toHaveBeenCalledTimes(1);
  });
});
