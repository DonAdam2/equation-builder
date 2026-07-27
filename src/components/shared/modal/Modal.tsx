import { MouseEvent, useRef } from 'react';

import useEventListener from '@/hooks/useEventListener';
import useLockScroll from '@/hooks/useLockScroll';

import Button from '@/components/shared/button/Button';
import { ButtonInterface } from '@/components/shared/button/Button.types';
import { ModalProps } from '@/components/shared/modal/Modal.types';
import Portal from '@/components/shared/portal/Portal';

import CloseIcon from '@/assets/icons/CloseIcon';

const Modal = ({ header, footer, wrapper, maxWidth, className, children }: ModalProps) => {
  const {
    enableHeader = true,
    headerButtons,
    title,
    customTitle,
    isCloseButton = true,
  } = header ?? {};
  const {
    enableFooter = true,
    footerButtons,
    isFooterBtnsFullWidth = false,
    isFooterBtnsStacked = false,
  } = footer ?? {};
  const {
    targetElementId = 'root',
    isAnimate = true,
    animationType = 'slide-in-down',
    show = false,
    closeHandler,
    isCancelClickOnOverlay = false,
    isTransparentBackground = false,
    wrapperClassName,
    wrapperHeader,
    wrapperFooter,
  } = wrapper ?? {};

  const modalWrapperRef = useRef<HTMLDivElement>(null);

  useLockScroll({
    immediate: show,
    targetElement:
      typeof document !== 'undefined' ? document.getElementById(targetElementId) : null,
  });

  useEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Escape' && closeHandler && show) {
      closeHandler();
    }
  });

  const renderModalBtns = (buttons: ButtonInterface[], isFooter = false) =>
    buttons.map((button, index) => (
      <Button
        key={index}
        className="modal-btn"
        style={{ flex: isFooterBtnsFullWidth && isFooter ? 1 : undefined }}
        {...button}
      />
    ));

  const renderHeader = () => {
    if (!enableHeader) {
      return null;
    }

    return (
      <div className="modal-header">
        <div>
          {customTitle ?? <h4 className="modal-title">{title}</h4>}
          <div>
            {headerButtons ? renderModalBtns(headerButtons) : null}
            {isCloseButton ? (
              <button
                type="button"
                data-testid="modal-header-close-btn"
                className="header-close-btn"
                aria-label="Close"
                onClick={closeHandler}
              >
                <CloseIcon />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (!enableFooter) {
      return null;
    }

    return (
      <div
        className={`modal-footer${isFooterBtnsFullWidth ? ' is-footer-btns-full-width' : ''}${
          isFooterBtnsStacked ? ' is-footer-btns-stacked' : ''
        }`}
        style={{ gap: isFooterBtnsStacked ? 10 : undefined }}
      >
        {footerButtons ? renderModalBtns(footerButtons, true) : null}
      </div>
    );
  };

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === modalWrapperRef.current && !isCancelClickOnOverlay && closeHandler) {
      closeHandler();
    }
  };

  if (!show) {
    return null;
  }

  return (
    <Portal wrapperElement="div" wrapperElementId="modal">
      <div
        className={`modal-window${!show ? ' inactive-modal' : ''}`}
        style={{
          cursor: closeHandler && !isCancelClickOnOverlay ? 'pointer' : 'initial',
          backgroundColor: isTransparentBackground ? 'transparent' : undefined,
        }}
        onClick={handleOverlayClick}
      >
        <div
          className={`modal-wrapper${wrapperClassName ? ` ${wrapperClassName}` : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Dialog'}
          style={{
            flexDirection: wrapperHeader || wrapperFooter ? 'column' : 'row',
            justifyContent: wrapperHeader || wrapperFooter ? 'space-between' : 'center',
          }}
          ref={modalWrapperRef}
          data-testid="modal-wrapper"
        >
          {wrapperHeader}
          <div
            className={`modal${show && isAnimate ? ` ${animationType}` : ''}${
              !isAnimate ? ' no-animate-modal' : ''
            }${className ? ` ${className}` : ''}`}
            style={{ maxWidth: maxWidth ?? undefined }}
          >
            {renderHeader()}
            <div className="modal-body">{children}</div>
            {renderFooter()}
          </div>
          {wrapperFooter}
        </div>
      </div>
    </Portal>
  );
};

export default Modal;
