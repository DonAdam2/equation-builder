import { ReactNode } from 'react';

import { ButtonInterface } from '@/components/shared/button/Button.types';

export type ModalAnimationType =
  | 'slide-in-down'
  | 'slide-in-up'
  | 'slide-in-right'
  | 'slide-in-left';

export interface ModalHeaderConfig {
  enableHeader?: boolean;
  headerButtons?: ButtonInterface[];
  title?: string;
  customTitle?: ReactNode;
  isCloseButton?: boolean;
}

export interface ModalFooterConfig {
  enableFooter?: boolean;
  footerButtons?: ButtonInterface[];
  isFooterBtnsFullWidth?: boolean;
  isFooterBtnsStacked?: boolean;
}

export interface ModalWrapperConfig {
  /** Root app element id used for scroll locking (default: `root`). */
  targetElementId?: string;
  isAnimate?: boolean;
  animationType?: ModalAnimationType;
  show?: boolean;
  closeHandler?: () => void;
  isCancelClickOnOverlay?: boolean;
  isTransparentBackground?: boolean;
  wrapperClassName?: string;
  wrapperHeader?: ReactNode;
  wrapperFooter?: ReactNode;
}

export interface ModalProps {
  header?: ModalHeaderConfig;
  footer?: ModalFooterConfig;
  wrapper?: ModalWrapperConfig;
  maxWidth?: number | string;
  className?: string;
  children?: ReactNode;
}
