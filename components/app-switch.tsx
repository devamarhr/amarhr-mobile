import { cn, Switch } from 'heroui-native';
import React from 'react';

type AnimationRootDisableAll = 'disable-all';

type SwitchRootAnimation = {
  state?: 'disabled' | 'disable-all' | boolean;
  scale?: {
    value?: [number, number];
    timingConfig?: any;
  };
  backgroundColor?: {
    value?: [string, string];
    timingConfig?: any;
  };
};

type SwitchThumbAnimation = {
  state?: 'disabled' | boolean;
  left?: {
    value?: number;
    springConfig?: any;
  };
  backgroundColor?: {
    value?: [string, string];
    timingConfig?: any;
  };
};

interface AppSwitchProps {
  /**
   * Whether the switch is currently selected
   */
  isSelected?: boolean;
  /**
   * Callback fired when the switch selection state changes
   */
  onSelectedChange?: (isSelected: boolean) => void;
  /**
   * Whether the switch is disabled
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Icon or content to display inside the thumb
   */
  thumbIcon?: React.ReactNode;
  /**
   * Content to display on the left side of the switch (typically shown when off)
   */
  startContent?: React.ReactNode;
  /**
   * Content to display on the right side of the switch (typically shown when on)
   */
  endContent?: React.ReactNode;
  /**
   * Additional CSS classes for the Switch root container
   */
  className?: string;
  /**
   * Additional CSS classes for the thumb element
   */
  thumbClassName?: string;
  /**
   * Additional CSS classes for the start content container
   */
  startContentClassName?: string;
  /**
   * Additional CSS classes for the end content container
   */
  endContentClassName?: string;
  /**
   * Animation configuration for switch root
   * - `"disable-all"`: Disable all animations including children
   * - `false` or `"disabled"`: Disable only root animations
   * - `undefined`: Use default animations
   * - `object`: Custom animation configuration
   */
  animation?: SwitchRootAnimation | AnimationRootDisableAll | false | 'disabled';
  /**
   * Animation configuration for the thumb
   * - `false` or `"disabled"`: Disable all thumb animations
   * - `undefined`: Use default animations
   * - `object`: Custom animation configuration
   */
  thumbAnimation?: SwitchThumbAnimation | false | 'disabled';
}

export function AppSwitch({
  isSelected,
  onSelectedChange,
  isDisabled = false,
  thumbIcon,
  startContent,
  endContent,
  className,
  thumbClassName,
  startContentClassName,
  endContentClassName,
  animation,
  thumbAnimation,
  ...rest
}: AppSwitchProps & Record<string, any>) {
  return (
    <Switch
      isSelected={isSelected}
      onSelectedChange={onSelectedChange}
      isDisabled={isDisabled}
      className={cn('w-[60px] h-[32px] border border-darkblue/20',className)}
      animation={animation ?? {
        backgroundColor: {
          value: ['#6A6A6A12', '#E6EFFD'],
        },
      }}
      {...rest}
    >
      {(!startContent && !endContent) && (
        thumbIcon ? (
          <Switch.Thumb className={thumbClassName} animation={thumbAnimation ?? {
            left: {
              value: 0
            }
          }}>
            {thumbIcon}
          </Switch.Thumb>
        ) : (
          <Switch.Thumb
            className={cn('size-[30px] rounded-full shadow-none', thumbClassName)}
            animation={thumbAnimation ?? {
              left: {
                value: 0
              }
            }}
          />
        )
      )}
      {startContent && (
        <Switch.StartContent className={startContentClassName}>
          {startContent}
        </Switch.StartContent>
      )}
      {endContent && (
        <Switch.EndContent className={endContentClassName}>
          {endContent}
        </Switch.EndContent>
      )}
    </Switch>
  );
}