import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWithProviders from '@/jest/mocks/RenderWithProviders';

import Modal from './Modal';

describe('Modal', () => {
  it('renders content through a portal when open', async () => {
    renderWithProviders(
      <Modal
        header={{ title: 'Example modal' }}
        footer={{
          footerButtons: [{ label: 'Done', variant: 'primary', type: 'button' }],
        }}
        wrapper={{ show: true, closeHandler: jest.fn(), isAnimate: false }}
      >
        <p>Modal body copy</p>
      </Modal>
    );

    expect(await screen.findByRole('dialog', { name: /example modal/i })).toBeInTheDocument();
    expect(screen.getByText('Modal body copy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
  });

  it('closes on Escape and header close button', async () => {
    const user = userEvent.setup();
    const closeHandler = jest.fn();

    renderWithProviders(
      <Modal
        header={{ title: 'Closable' }}
        footer={{ enableFooter: false }}
        wrapper={{ show: true, closeHandler, isAnimate: false }}
      >
        Content
      </Modal>
    );

    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(closeHandler).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('modal-header-close-btn'));
    expect(closeHandler).toHaveBeenCalledTimes(2);
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <Modal header={{ title: 'Hidden' }} wrapper={{ show: false }}>
        Hidden body
      </Modal>
    );

    expect(screen.queryByText('Hidden body')).not.toBeInTheDocument();
  });
});
