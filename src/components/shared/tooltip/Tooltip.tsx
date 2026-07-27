import { FC, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useTouchScreenDetect from '@/hooks/useTouchScreenDetect';

import ClickAwayWrapper from '@/components/shared/clickAwayWrapper/ClickAwayWrapper';
import ConditionalWrapper from '@/components/shared/conditionalWrapper/ConditionalWrapper';
import Portal from '@/components/shared/portal/Portal';

import { getElementOffset, getScrollParent } from '@/constants/Helpers';

import { ToolTipInterface, TooltipPositionEnum, TooltipTriggerEnum } from './Tooltip.types';

const Tooltip: FC<PropsWithChildren<ToolTipInterface>> = ({
  tooltipContent,
  position = TooltipPositionEnum.BOTTOM,
  color,
  backgroundColor,
  disabled,
  customPosition,
  trigger = TooltipTriggerEnum.HOVER,
  className = '',
  messageClassName = '',
  isParentPositionAbsolute,
  isDisplayTooltipIndicator = true,
  children,
}) => {
  const { isTouchDevice } = useTouchScreenDetect(),
    [show, setShow] = useState(false),
    [styles, setStyles] = useState({
      top: 0,
      left: 0,
    }),
    tooltipWrapperRef = useRef<HTMLDivElement>(null),
    tooltipMessage = useRef<HTMLSpanElement>(null),
    [currentPosition, setCurrentPosition] = useState(position),
    stylesRef = useRef({ top: 0, left: 0 }),
    space = 15,
    [childrenWidth, setChildrenWidth] = useState<undefined | number>(undefined),
    [childrenHeight, setChildrenHeight] = useState<undefined | number>(undefined),
    [isTooltipVisible, setIsTooltipVisible] = useState(false),
    [wrapperParentUpdated, setWrapperParentUpdated] = useState({
      top: 0,
      left: 0,
    }),
    isHoverTrigger = useMemo(() => trigger === TooltipTriggerEnum.HOVER, [trigger]),
    isClickTrigger = useMemo(() => trigger === TooltipTriggerEnum.CLICK, [trigger]);

  //set children width, height and visibility after DOM measurement
  /* eslint-disable react-hooks/set-state-in-effect -- DOM measurement requires effect */
  useEffect(() => {
    if (show && childrenWidth === undefined && childrenHeight === undefined) {
      setChildrenHeight(tooltipMessage.current?.offsetHeight);
      setChildrenWidth(tooltipMessage.current?.offsetWidth);
    }
    if (show && !isTooltipVisible && childrenWidth !== undefined && childrenHeight !== undefined) {
      setIsTooltipVisible(true);
    }
  }, [show, childrenWidth, childrenHeight, isTooltipVisible]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const showTooltip = () => {
    if (!show) {
      setShow(true);
      setStyles(getStylesList());
    }
  };

  const hideTooltip = () => {
    setShow(false);
  };

  const getStylesList = useCallback(() => {
    if (tooltipWrapperRef.current) {
      const wrapperRect = tooltipWrapperRef.current.getBoundingClientRect(),
        wrapperRef = tooltipWrapperRef.current,
        scrollableParent = getScrollParent(wrapperRef),
        style = {
          left: 0,
          top: 0,
        },
        centeredHorizontalPosition = Math.max(space, wrapperRect.left + wrapperRect.width / 2),
        centeredVerticalPosition =
          getElementOffset(tooltipWrapperRef.current).top + wrapperRect.height / 2;

      let pos = position;
      //if position is top and no room for tooltip => change position to bottom
      if (position === TooltipPositionEnum.TOP && wrapperRect.top < (childrenHeight || 0) + space) {
        pos = TooltipPositionEnum.BOTTOM;
      }
      //if position is right and no room for tooltip => change position to left
      else if (
        position === TooltipPositionEnum.RIGHT &&
        wrapperRect.right + ((childrenWidth || 0) + space * 1.5) > window.innerWidth
      ) {
        pos = TooltipPositionEnum.LEFT;
      }
      //if position is bottom and no room for tooltip => change position to top
      else if (
        position === TooltipPositionEnum.BOTTOM &&
        wrapperRect.bottom + (childrenHeight || 0) + space > window.innerHeight
      ) {
        pos = TooltipPositionEnum.TOP;
      }
      //if position is left and no room for tooltip => change position to right
      else if (
        position === TooltipPositionEnum.LEFT &&
        wrapperRect.left - ((childrenWidth || 0) + space * 1.5) < 0
      ) {
        pos = TooltipPositionEnum.RIGHT;
      }

      setCurrentPosition(pos);

      if (pos === TooltipPositionEnum.TOP) {
        style.top = Math.max(
          space,
          getElementOffset(tooltipWrapperRef.current).top -
            (childrenHeight || 0) -
            (isDisplayTooltipIndicator ? space : space / 2)
        );
        style.left = centeredHorizontalPosition;
      } else if (pos === TooltipPositionEnum.RIGHT) {
        style.top = centeredVerticalPosition;
        style.left = Math.max(
          space,
          wrapperRect.right + (isDisplayTooltipIndicator ? space : space / 2)
        );
      } else if (pos === TooltipPositionEnum.BOTTOM) {
        style.top =
          getElementOffset(tooltipWrapperRef.current).top +
          wrapperRect.height +
          (isDisplayTooltipIndicator ? space : space / 2);
        style.left = centeredHorizontalPosition;
      } else if (pos === TooltipPositionEnum.LEFT) {
        style.top = centeredVerticalPosition;
        style.left = Math.max(space, wrapperRect.left - ((childrenWidth || 0) + space));
      }
      if (!isParentPositionAbsolute && scrollableParent && wrapperParentUpdated) {
        style.top -= scrollableParent.scrollTop;
      }
      return style;
    }
    return {
      top: 0,
      left: 0,
    };
  }, [
    position,
    isParentPositionAbsolute,
    childrenWidth,
    childrenHeight,
    wrapperParentUpdated,
    isDisplayTooltipIndicator,
  ]);

  useEffect(() => {
    //required for the first render and on scroll
    const newStyles = getStylesList();
    if (newStyles.top !== stylesRef.current.top || newStyles.left !== stylesRef.current.left) {
      stylesRef.current = newStyles;
      // eslint-disable-next-line
      setStyles(newStyles);
    }
  }, [getStylesList]);

  // Keep stylesRef in sync with styles state
  useEffect(() => {
    stylesRef.current = styles;
  }, [styles]);

  const updateScrollableParentScroll = useCallback(
    ({ target }: { target?: { scrollTop?: number; scrollLeft?: number } }) => {
      const scrollTop = target?.scrollTop ?? document.documentElement.scrollTop ?? 0;
      const scrollLeft = target?.scrollLeft ?? document.documentElement.scrollLeft ?? 0;
      setWrapperParentUpdated((prev) =>
        prev.top === scrollTop && prev.left === scrollLeft
          ? prev
          : { top: scrollTop, left: scrollLeft }
      );
    },
    []
  );

  const handleResize = useCallback(() => {
    if (tooltipWrapperRef.current) {
      const scrollableParent = getScrollParent(tooltipWrapperRef.current);
      const scrollTop =
        scrollableParent?.scrollTop ??
        document.documentElement.scrollTop ??
        document.body.scrollTop ??
        0;
      const scrollLeft =
        scrollableParent?.scrollLeft ??
        document.documentElement.scrollLeft ??
        document.body.scrollLeft ??
        0;
      setWrapperParentUpdated({ top: scrollTop, left: scrollLeft });
    }
  }, []);

  const resizeScheduledRef = useRef(false);

  useEffect(() => {
    if (tooltipWrapperRef.current) {
      const wrapperRef = tooltipWrapperRef.current,
        scrollableParent = getScrollParent(wrapperRef);

      const resizeHandler = () => {
        if (resizeScheduledRef.current) return;
        resizeScheduledRef.current = true;
        requestAnimationFrame(() => {
          handleResize();
          resizeScheduledRef.current = false;
        });
      };

      window.addEventListener('resize', resizeHandler);
      scrollableParent.addEventListener('scroll', updateScrollableParentScroll);

      return () => {
        window.removeEventListener('resize', resizeHandler);
        scrollableParent.removeEventListener('scroll', updateScrollableParentScroll);
      };
    }
  }, [updateScrollableParentScroll, handleResize]);

  useEffect(() => {
    const handleScroll = () => {
      if (show && isClickTrigger) {
        setShow(false);
      }
    };

    if (tooltipWrapperRef.current) {
      const wrapperRef = tooltipWrapperRef.current,
        scrollableParent = getScrollParent(wrapperRef),
        newScrollableParent = scrollableParent === document.body ? window : scrollableParent;

      newScrollableParent.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);

      return () => {
        newScrollableParent.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [show, isClickTrigger]);

  return (
    <ConditionalWrapper
      condition={isClickTrigger}
      initialWrapper={(children: any) => <>{children}</>}
      wrapper={(children: any) => (
        <ClickAwayWrapper onClickAwayCallback={hideTooltip}>{children}</ClickAwayWrapper>
      )}
    >
      <span
        className={`tooltip ${className} ${disabled ? 'is-disabled' : ''}`}
        onMouseEnter={
          isHoverTrigger
            ? disabled
              ? undefined
              : isTouchDevice
                ? undefined
                : showTooltip
            : undefined
        }
        onMouseLeave={
          isHoverTrigger
            ? disabled
              ? undefined
              : isTouchDevice
                ? undefined
                : hideTooltip
            : undefined
        }
        onTouchStart={
          isHoverTrigger
            ? disabled
              ? undefined
              : isTouchDevice
                ? showTooltip
                : undefined
            : undefined
        }
        onTouchEnd={
          isHoverTrigger
            ? disabled
              ? undefined
              : isTouchDevice
                ? hideTooltip
                : undefined
            : undefined
        }
        onClick={isClickTrigger ? (disabled ? undefined : showTooltip) : undefined}
        ref={tooltipWrapperRef}
      >
        <Portal wrapperElement="span" wrapperElementId="tooltip">
          {show && tooltipContent && (
            <span
              ref={tooltipMessage}
              className={`tooltip-message on-${currentPosition} ${messageClassName} ${isDisplayTooltipIndicator ? 'is-indicator' : ''}`}
              dangerouslySetInnerHTML={{ __html: tooltipContent }}
              style={{
                color: color ? color : '#ffffff',
                ...(backgroundColor
                  ? { '--background-color': backgroundColor }
                  : { '--background-color': 'rgba(97, 97, 97, 0.92)' }),
                ...(customPosition ? customPosition : styles),
                ...(currentPosition === TooltipPositionEnum.LEFT ||
                currentPosition === TooltipPositionEnum.TOP
                  ? { visibility: isTooltipVisible ? 'visible' : 'hidden' }
                  : {}),
              }}
            />
          )}
        </Portal>
        {children}
      </span>
    </ConditionalWrapper>
  );
};

export default Tooltip;
