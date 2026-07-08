import { Button, cn, PressableFeedback, Spinner } from 'heroui-native';
import React from 'react';
import type { PressableProps } from 'react-native';

interface AppButtonProps extends Omit<PressableProps, 'disabled'> {
  /**
   * Button label text
   */
  label?: string;
  /**
   * Custom label component to override default label rendering
   * Takes precedence over the label prop if provided
   */
  labelComponent?: React.ReactNode;
  /**
   * Whether the button is disabled
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Whether the button displays an icon only
   * @default false
   */
  isIconOnly?: boolean;
  /**
   * Whether the button is in loading state (shows spinner)
   * @default false
   */
  isLoading?: boolean;
  /**
   * Left icon element to display before the label
   */
  leftIcon?: React.ReactNode;
  /**
   * Right icon element to display after the label
   */
  rightIcon?: React.ReactNode;
  /**
   * Additional CSS classes for the Button root container
   */
  className?: string;
  /**
   * Additional CSS classes for the button label
   */
  labelClassName?: string;
  /**
   * Spinner size when in loading state
   * @default 'sm'
   */
  spinnerSize?: 'sm' | 'md' | 'lg';
  /**
   * Spinner color when in loading state
   * @default '#222222'
   */
  spinnerColor?: string;
}

export function AppButton({
  label,
  labelComponent,
  isDisabled = false,
  isIconOnly = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  labelClassName,
  spinnerSize = 'sm',
  spinnerColor = '#222222',
  ...pressableProps
}: AppButtonProps) {
  const renderLabel = () => {
    // Use custom label component if provided
    if (labelComponent) {
      return labelComponent;
    }

    // Fall back to default label rendering
    if (label) {
      return (
        <Button.Label className={cn(
          'text-black text-base font-medium disabled:text-white',
          labelClassName
        )}>
          {label}
        </Button.Label>
      );
    }

    return null;
  };

  const renderContent = () => {
    // For icon-only buttons
    if (isIconOnly && (leftIcon || rightIcon)) {
      return (
        <>
          {leftIcon || rightIcon}
        </>
      );
    }

    // For loading state
    if (isLoading) {
      return (
        <>
          <Spinner color={spinnerColor} size={spinnerSize} />
          {renderLabel()}
        </>
      );
    }

    // For buttons with icons and label
    return (
      <>
        {leftIcon}
        {renderLabel()}
        {rightIcon}
      </>
    );
  };

  return (
    <Button
      isDisabled={isDisabled || isLoading}
      isIconOnly={isIconOnly}
      className={cn(
        'h-[44px] border border-darkgray/30 bg-white disabled:opacity-50',
        className
      )}
      feedbackVariant="scale"

      {...pressableProps}
    >
      {/*<PressableFeedback.Highlight*/}
      {/*  animation={{*/}
      {/*    backgroundColor: { value: '#ffffff' },*/}
      {/*    opacity: { value: [0, 0.1] },*/}
      {/*  }}*/}
      {/*/>*/}
      {renderContent()}
    </Button>
  );
}