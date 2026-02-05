import { cn, Description, FieldError, Input, Label, TextArea, TextField } from 'heroui-native';
import React from 'react';
import { TextInputProps, View } from 'react-native';

type AnimationRootDisableAll = 'disable-all';

interface AppTextFieldProps extends TextInputProps {
  label?: string;
  description?: string;
  errorMessage?: string;
  /**
   * Whether the text field is disabled
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Whether the text field is in an invalid state
   * @default false
   */
  isInvalid?: boolean;
  /**
   * Whether the text field is required (shows asterisk in label)
   * @default false
   */
  isRequired?: boolean;
  /**
   * Whether to render as a TextArea (multiline) instead of Input
   * @default false
   */
  isTextArea?: boolean;
  /**
   * Additional CSS classes for the TextField root container
   */
  textFieldClassName?: string;
  /**
   * Additional CSS classes for the label
   */
  labelClassName?: string;
  /**
   * Additional CSS classes for the description
   */
  descriptionClassName?: string;
  /**
   * Additional CSS classes for the error message
   */
  errorMessageClassName?: string;
  /**
   * Left icon element to display inside the input
   */
  leftIcon?: React.ReactNode;
  /**
   * Right icon element to display inside the input
   */
  rightIcon?: React.ReactNode;
  /**
   * Additional CSS classes for the icon container View
   */
  iconContainerClassName?: string;
  /**
   * Animation configuration for text field root
   * - `"disable-all"`: Disable all animations including children (cascades down to all child components)
   * - `undefined`: Use default animations
   */
  animation?: AnimationRootDisableAll;
}

export function AppTextField({
  label,
  description,
  errorMessage,
  isDisabled,
  isInvalid,
  isRequired,
  isTextArea = false,
  textFieldClassName,
  labelClassName,
  descriptionClassName,
  errorMessageClassName,
  leftIcon,
  rightIcon,
  iconContainerClassName,
  animation,
  className,
  ...inputProps
}: AppTextFieldProps) {
  const hasIcons = leftIcon || rightIcon;
  const InputComponent = isTextArea ? TextArea : Input;

  const renderTextInput = () => {
    return (
      <InputComponent
        {...inputProps}
        className={cn(
          'flex-1 rounded-lg border border-gray/30 focus:border-gray/30 text-sm py-[11px] px-3 ios:shadow-none android:shadow-none',
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          isInvalid && 'border-red focus:border-red',
          className
        )}
      />
    )};

  const renderInput = () => {
    if (hasIcons) {
      return (
        <View className={cn('w-full flex-row items-center', iconContainerClassName)}>
          {renderTextInput()}
          {leftIcon && (
            <View className="absolute left-3.5" pointerEvents="none">
              {leftIcon}
            </View>
          )}
          {rightIcon && (
            <View className="absolute right-3.5">
              {rightIcon}
            </View>
          )}
        </View>
      );
    }

    return (
      <>
        {renderTextInput()}
      </>
    );
  };

  return (
    <TextField
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      className={cn('gap-2', textFieldClassName)}
      animation={animation}
    >
      {label && (
        <Label className={cn('text-sm font-normal text-darkgray', labelClassName)}>
          {label}
        </Label>
      )}

      {renderInput()}

      {description && !isInvalid && (
        <Description className={cn('', descriptionClassName)}>
          {description}
        </Description>
      )}
      {errorMessage && isInvalid && (
        <FieldError className={cn('', errorMessageClassName)}>
          {errorMessage}
        </FieldError>
      )}
    </TextField>
  );
}