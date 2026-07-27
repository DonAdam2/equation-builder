export type GradientTextVariantType =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'dark';

export interface GradientTextColorProps {
  unset?: boolean;
  className?: string;
  variant: GradientTextVariantType;
}
