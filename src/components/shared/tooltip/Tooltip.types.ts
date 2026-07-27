type CssPositionType = number | string;

interface TooltipCustomPositionInterface {
  top: CssPositionType;
  right: CssPositionType;
  bottom: CssPositionType;
  left: CssPositionType;
}

export enum TooltipPositionEnum {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
}

export enum TooltipTriggerEnum {
  HOVER = 'hover',
  CLICK = 'click',
}

export interface ToolTipInterface {
  tooltipContent: string;
  position?: TooltipPositionEnum;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  customPosition?: TooltipCustomPositionInterface;
  trigger?: TooltipTriggerEnum;
  className?: string;
  messageClassName?: string;
  isParentPositionAbsolute?: boolean;
  isDisplayTooltipIndicator?: boolean;
}
