import { AppText } from '@/components/app-text';
import { ArrowDown01Icon, MultiplicationSignIcon, Tick02Icon } from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { cn, FieldError, Label, PressableFeedback, Select, Separator } from 'heroui-native';
import React, { useState } from 'react';
import { View } from 'react-native';

export type SelectOption = {
  value: string;
  label: string;
  [key: string]: any; // Allow additional custom fields
};

export type SelectItemRenderProps = {
  option: SelectOption;
  isSelected: boolean;
  isDisabled: boolean;
};

interface AppSelectProps {
  /**
   * Label text displayed above the select
   */
  label?: string;
  /**
   * Whether the select field is required (shows asterisk in label)
   * @default false
   */
  isRequired?: boolean;
  /**
   * Placeholder text when no value is selected
   * @default 'Select an option'
   */
  placeholder?: string;
  /**
   * Title displayed in the bottom sheet header
   * If not provided, uses the label value
   */
  title?: string;
  /**
   * Array of options to display
   */
  options: SelectOption[];
  /**
   * Currently selected value
   */
  value?: SelectOption;
  /**
   * Callback when value changes
   */
  onValueChange?: (option: SelectOption | undefined) => void;
  /**
   * Whether the select is disabled
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Whether the select field is in an invalid state
   * @default false
   */
  isInvalid?: boolean;
  /**
   * Error message to display when isInvalid is true
   */
  errorMessage?: string;
  /**
   * Additional CSS classes for the error message
   */
  errorMessageClassName?: string;
  /**
   * Height percentage for the bottom sheet
   * @default '50%'
   */
  snapPoints?: string[];
  /**
   * Additional CSS classes for the root container
   */
  className?: string;
  /**
   * Additional CSS classes for the label
   */
  labelClassName?: string;
  /**
   * Additional CSS classes for the trigger
   */
  triggerClassName?: string;
  /**
   * Color for the trigger arrow icon
   * @default '#222222'
   */
  arrowIconColor?: string;
  /**
   * Color for the selected indicator icon
   * @default '#18AA0B'
   */
  indicatorIconColor?: string;
  /**
   * Size of the selected indicator icon
   * @default 24
   */
  indicatorIconSize?: number;
  /**
   * Whether to show separators between items
   * @default true
   */
  showSeparators?: boolean;
  /**
   * Additional CSS classes for the separator
   */
  separatorClassName?: string;
  /**
   * Additional CSS classes for each Select.Item
   */
  itemClassName?: string;
  /**
   * Custom render function for each item
   * If provided, this will override the default item rendering
   * @param props - Contains option data and selection state
   * @returns Custom React element to render for the item
   */
  renderItem?: (props: SelectItemRenderProps) => React.ReactNode;
  /**
   * Custom render function for the selected value in the trigger
   * If provided, this will override the default value display
   * @param option - The currently selected option
   * @returns Custom React element to render in the trigger
   */
  renderValue?: (option: SelectOption) => React.ReactNode;
  /**
   * Custom trigger element that replaces the default trigger entirely
   * Useful for inline selects like header month pickers
   */
  trigger?: React.ReactNode;
}

export function AppSelect({
  label,
  isRequired = false,
  placeholder = 'Select an option',
  title,
  options,
  value,
  onValueChange,
  isDisabled = false,
  isInvalid = false,
  errorMessage,
  errorMessageClassName,
  snapPoints = ['50%'],
  className,
  labelClassName,
  triggerClassName,
  arrowIconColor = '#222222',
  indicatorIconColor = '#18AA0B',
  indicatorIconSize = 24,
  showSeparators = true,
  separatorClassName,
  itemClassName,
  renderItem,
  renderValue,
  trigger,
}: AppSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayTitle = title || label || 'Select';

  // Handle type conversion for heroui-native Select
  const handleValueChange = (option: any) => {
    // Look up the full option from the options array to preserve custom fields
    const fullOption = options.find(opt => opt.value === option?.value);
    onValueChange?.(fullOption);
  };

  // Get the full option data for rendering
  const fullValue = value ? options.find(opt => opt.value === value.value) || value : undefined;

  return (
    <View className={cn('gap-2', className)}>
      {label && (
        <Label isRequired={isRequired}>
          <Label.Text className={cn('text-sm font-normal text-darkgray', labelClassName)}>
            {label}
          </Label.Text>
        </Label>
      )}

      <Select
        presentation="bottom-sheet"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        value={value as any}
        onValueChange={handleValueChange}
        isDisabled={isDisabled}
      >
        <Select.Trigger asChild className="">
          {trigger ? (
            <PressableFeedback className={triggerClassName}>
              {trigger}
            </PressableFeedback>
          ) : (
            <PressableFeedback
              className={cn(
                'flex-row rounded-lg border border-gray/30 items-center h-11 px-3',
                isDisabled && 'opacity-50',
                isInvalid && 'border-red',
                triggerClassName
              )}
            >
              <View className="flex-1">
                {fullValue && renderValue ? (
                  renderValue(fullValue)
                ) : (
                  <AppText className={!fullValue ? 'text-muted' : undefined}>
                    {fullValue?.label ?? placeholder}
                  </AppText>
                )}
              </View>
              <HugeiconsIcon icon={ArrowDown01Icon} size={24} color={arrowIconColor} />
            </PressableFeedback>
          )}
        </Select.Trigger>

        <Select.Portal>
          <Select.Overlay className="bg-[#6C719F]/40" />
          <Select.Content
            presentation="bottom-sheet"
            snapPoints={snapPoints}
            enableOverDrag={false}
            handleComponent={null}
            contentContainerClassName="h-full p-0 rounded-t-[10px] border border-transparent bg-overlay overflow-hidden"
            contentContainerProps={{
              style: {
                borderCurve: 'continuous',
              },
            }}
          >
            <View className="px-4 py-5">
              <AppText className="text-base font-medium text-center">
                {displayTitle}
              </AppText>
              <PressableFeedback
                className="absolute right-4 top-5"
                onPress={() => setIsOpen(false)}
              >
                <HugeiconsIcon icon={MultiplicationSignIcon} color="#6A6A6A" size={24} />
              </PressableFeedback>
            </View>

            <BottomSheetScrollView
              contentContainerClassName="pt-2 px-4 pb-4"
              showsVerticalScrollIndicator={false}
            >
              {options.map((option, index) => (
                <React.Fragment key={option.value}>
                  <Select.Item
                    className={cn('py-3', itemClassName)}
                    value={option.value}
                    label={option.label}
                  >
                    {renderItem ? (
                      // Custom render
                      ({ isSelected, isDisabled }) => (
                        <>
                          {renderItem({ option, isSelected, isDisabled })}
                          <Select.ItemIndicator>
                            <HugeiconsIcon
                              icon={Tick02Icon}
                              size={indicatorIconSize}
                              color={indicatorIconColor}
                            />
                          </Select.ItemIndicator>
                        </>
                      )
                    ) : (
                      // Default render
                      <>
                        <View className="flex-1">
                          <Select.ItemLabel />
                        </View>
                        <Select.ItemIndicator>
                          <HugeiconsIcon
                            icon={Tick02Icon}
                            size={indicatorIconSize}
                            color={indicatorIconColor}
                          />
                        </Select.ItemIndicator>
                      </>
                    )}
                  </Select.Item>
                  {showSeparators && index < options.length - 1 && (
                    <Separator className={cn('bg-darkgray/15', separatorClassName)} />
                  )}
                </React.Fragment>
              ))}
            </BottomSheetScrollView>
          </Select.Content>
        </Select.Portal>
      </Select>
      {errorMessage && isInvalid && (
        <FieldError isInvalid className={cn('', errorMessageClassName)}>
          {errorMessage}
        </FieldError>
      )}
    </View>
  );
}