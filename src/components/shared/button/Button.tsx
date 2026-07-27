import cx from 'classnames';

import { ButtonInterface, ButtonVariantType } from '@/components/shared/button/Button.types';
import ConditionalWrapper from '@/components/shared/conditionalWrapper/ConditionalWrapper';
import GradientTextColor from '@/components/shared/gradientTextColor/GradientTextColor';
import { GradientTextVariantType } from '@/components/shared/gradientTextColor/GradientTextColor.types';

const Button = ({
  label,
  icon,
  iconPosition = 'left',
  className,
  variant = 'primary',
  size = 'medium',
  shape,
  fluid,
  isGradientText = false,
  isGradientBackground = false,
  isOutlined = false,
  type = 'button',
  dataTest,
  ...rest
}: ButtonInterface) => {
  const buttonClasses = cx(
    {
      button: true,
      centered: !label,
      fluid,
      'gradient-background': isGradientBackground,
    },
    shape,
    isGradientText ? 'white' : `${variant}${isOutlined ? '-outlined' : ''}`,
    size,
    className
  );

  const isVariantFromGradientTextVariantType = (
    variant: ButtonVariantType
  ): variant is GradientTextVariantType =>
    ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark'].includes(variant);

  return (
    <button className={buttonClasses} type={type} data-test={dataTest} {...rest}>
      <ConditionalWrapper
        initialWrapper={(children: any) => <>{children}</>}
        condition={!!icon}
        wrapper={(children: any) => (
          <span
            className="button-content"
            style={{
              flexDirection: iconPosition === 'left' ? 'row' : 'row-reverse',
              gap: !label ? 0 : 5,
            }}
          >
            {children}
          </span>
        )}
      >
        {icon && <span className="button-icon">{icon}</span>}
        <ConditionalWrapper
          initialWrapper={(children: any) => <span className="button-label">{children}</span>}
          condition={isVariantFromGradientTextVariantType(variant) && isGradientText}
          wrapper={(children: any) => (
            <GradientTextColor
              unset={rest.disabled}
              variant={isVariantFromGradientTextVariantType(variant) ? variant : 'primary'}
            >
              {children}
            </GradientTextColor>
          )}
        >
          {label}
        </ConditionalWrapper>
      </ConditionalWrapper>
    </button>
  );
};

export default Button;
