import { cn, TextField } from 'heroui-native';
import React from 'react';
import { View, Pressable } from 'react-native';

/**
 * AppTextField component props
 *
 * @interface AppTextFieldProps
 * @extends {Omit<React.ComponentProps<typeof TextField>, 'children'>}
 * @property {React.ReactNode} [leftIcon] - Icon to display on the left side of the input
 * @property {React.ReactNode} [rightIcon] - Icon to display on the right side of the input
 * @property {() => void} [onLeftIconPress] - Callback function when left icon is pressed
 * @property {() => void} [onRightIconPress] - Callback function when right icon is pressed
 * @property {string} [leftIconClassName] - Additional className for left icon container
 * @property {string} [rightIconClassName] - Additional className for right icon container
 * @property {string} [label] - Label text for the text field
 * @property {string} [labelClassName] - Additional className for label
 * @property {React.ComponentProps<typeof TextField.Input>} [inputProps] - Props to pass to TextField.Input
 * @property {React.ReactNode} [description] - Description text to display below the input
 * @property {string} [descriptionClassName] - Additional className for description container
 * @property {React.ReactNode} [errorMessage] - Error message to display when isInvalid is true
 * @property {string} [errorMessageClassName] - Additional className for errorMessage container
 * @property {boolean} [isDisabled] - Whether the entire text field is disabled
 * @property {boolean} [isInvalid] - Whether the text field is in an invalid state
 * @property {boolean} [isRequired] - Whether the text field is required (shows asterisk in label)
 */
export interface AppTextFieldProps extends Omit<React.ComponentProps<typeof TextField>, 'children'> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftIconPress?: () => void;
  onRightIconPress?: () => void;
  leftIconClassName?: string;
  rightIconClassName?: string;
  label?: string;
  labelClassName?: string;
  inputProps?: React.ComponentProps<typeof TextField.Input>;
  description?: React.ReactNode;
  descriptionClassName?: string;
  errorMessage?: React.ReactNode;
  errorMessageClassName?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
}

/**
 * AppTextField - A custom TextField component that supports left and right icons
 *
 * @component
 * @example
 * ```tsx
 * <AppTextField
 *   label="Search"
 *   inputProps={{ placeholder: "Search..." }}
 *   leftIcon={<SearchIcon />}
 *   rightIcon={<CloseIcon />}
 *   onRightIconPress={() => console.log('Clear input')}
 *   description="Enter your search query"
 *   isRequired
 *   isInvalid={false}
 *   errorMessage="This field is required"
 * />
 * ```
 *
 * @param {AppTextFieldProps} props - Component props
 * @returns {JSX.Element} TextField component with icon support
 */
export const AppTextField = React.forwardRef<
  React.ComponentRef<typeof TextField>,
  AppTextFieldProps
>((props, ref) => {
  const {
    leftIcon,
    rightIcon,
    onLeftIconPress,
    onRightIconPress,
    leftIconClassName,
    rightIconClassName,
    label,
    labelClassName,
    inputProps,
    description,
    descriptionClassName,
    errorMessage,
    errorMessageClassName,
    isDisabled,
    isInvalid,
    isRequired,
    ...restProps
  } = props;

  const hasIcons = leftIcon || rightIcon;

  // Build input className with icon padding
  const inputClassName = cn(
    'py-3 px-3 rounded-lg text-foreground font-normal border border-gray/30 focus:border-gray/30',
    isInvalid && 'border-red',
    hasIcons && 'flex-1',
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    inputProps?.className
  );

  // Render input with or without icon wrapper
  const renderInput = () => {
    const input = <TextField.Input {...inputProps} className={inputClassName} />;

    // If no icons, return input as-is
    if (!hasIcons) {
      return input;
    }

    // With icons, wrap in View and add icon overlays
    return (
      <View className="w-full flex-row items-center">
        {input}
        {leftIcon && (
          onLeftIconPress ? (
            <Pressable
              className={cn('absolute left-3.5', leftIconClassName)}
              onPress={onLeftIconPress}
            >
              {leftIcon}
            </Pressable>
          ) : (
            <View
              className={cn('absolute left-3.5', leftIconClassName)}
              pointerEvents="none"
            >
              {leftIcon}
            </View>
          )
        )}
        {rightIcon && (
          onRightIconPress ? (
            <Pressable
              className={cn('absolute right-3.5', rightIconClassName)}
              onPress={onRightIconPress}
            >
              {rightIcon}
            </Pressable>
          ) : (
            <View
              className={cn('absolute right-3.5', rightIconClassName)}
              pointerEvents="none"
            >
              {rightIcon}
            </View>
          )
        )}
      </View>
    );
  };

  return (
    <TextField
      ref={ref}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      {...restProps}
    >
      {label && <TextField.Label className={labelClassName}>{label}</TextField.Label>}
      {renderInput()}
      {description && <TextField.Description className={descriptionClassName}>{description}</TextField.Description>}
      {errorMessage && <TextField.ErrorMessage className={errorMessageClassName}>{errorMessage}</TextField.ErrorMessage>}
    </TextField>
  );
});

AppTextField.displayName = 'AppTextField';
