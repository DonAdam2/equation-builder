import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariantType =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark'
  | 'white'
  | 'link';
type ButtonSizeType = 'small' | 'medium' | 'large';
type ButtonShapeType = 'round' | 'rectangle';

export interface ButtonInterface extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  iconPosition?: 'right' | 'left';
  label?: ReactNode;
  variant?: ButtonVariantType;
  size?: ButtonSizeType;
  shape?: ButtonShapeType;
  fluid?: boolean;
  isGradientText?: boolean;
  isGradientBackground?: boolean;
  isOutlined?: boolean;
  dataTest?: string;
}
