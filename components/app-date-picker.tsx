import { AppText } from '@/components/app-text';
import dayjs from 'dayjs';
import { cn, FieldError, Label, PressableFeedback } from 'heroui-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import DatePicker from 'react-native-date-picker';

interface AppDatePickerProps {
  /**
   * Label text displayed above the picker
   */
  label?: string;
  /**
   * Whether the field is required (shows asterisk in label)
   * @default false
   */
  isRequired?: boolean;
  /**
   * Mode of the picker
   * @default 'date'
   */
  mode?: 'date' | 'time' | 'datetime';
  /**
   * Currently selected date/time
   */
  value?: Date;
  /**
   * Callback when value changes
   */
  onValueChange?: (date: Date) => void;
  /**
   * Placeholder text when no value is selected
   */
  placeholder?: string;
  /**
   * Format string for displaying the date/time
   * Uses dayjs format tokens
   * @default 'YYYY/MM/DD' for date, 'HH:mm' for time, 'YYYY/MM/DD HH:mm' for datetime
   */
  format?: string;
  /**
   * Whether the picker is disabled
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Whether the field is in an invalid state
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
   * Optional icon element to display before the text
   * If not provided, no icon will be shown
   */
  icon?: React.ReactNode;
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
   * Minimum date that can be selected
   */
  minimumDate?: Date;
  /**
   * Maximum date that can be selected
   */
  maximumDate?: Date;
  /**
   * Minute interval for time/datetime mode (e.g. 5 for 5-minute steps)
   */
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
}

export function AppDatePicker({
  label,
  isRequired = false,
  mode = 'date',
  value,
  onValueChange,
  placeholder,
  format,
  isDisabled = false,
  isInvalid = false,
  errorMessage,
  errorMessageClassName,
  icon,
  className,
  labelClassName,
  triggerClassName,
  minimumDate,
  maximumDate,
  minuteInterval,
}: AppDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Default formats based on mode
  const getDefaultFormat = () => {
    if (format) return format;
    switch (mode) {
      case 'time':
        return 'HH:mm';
      case 'datetime':
        return 'YYYY/MM/DD HH:mm';
      default:
        return 'YYYY/MM/DD';
    }
  };

  // Render icon if provided
  const renderIcon = () => {
    return icon || null;
  };

  // Default placeholder based on mode
  const getDefaultPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (mode) {
      case 'time':
        return 'Select a time';
      case 'datetime':
        return 'Select date and time';
      default:
        return 'Select a date';
    }
  };

  const formatValue = (date: Date) => {
    return dayjs(date).format(getDefaultFormat());
  };

  return (
    <View className={cn('gap-2', className)}>
      {label && (
        <Label isRequired={isRequired}>
          <Label.Text className={cn('text-sm font-normal text-darkgray', labelClassName)}>
            {label}
          </Label.Text>
        </Label>
      )}

      <PressableFeedback
        isDisabled={isDisabled}
        onPress={() => setIsOpen(true)}
        className={cn(
          'flex-row rounded-lg border border-gray/30 items-center h-11 px-3 gap-2 disabled:opacity-50',
          isInvalid && 'border-red',
          triggerClassName
        )}
      >
        {renderIcon()}
        <AppText className={cn('text-sm', !value && 'text-muted')}>
          {value ? formatValue(value) : getDefaultPlaceholder()}
        </AppText>
      </PressableFeedback>

      {errorMessage && isInvalid && (
        <FieldError isInvalid className={cn('', errorMessageClassName)}>
          {errorMessage}
        </FieldError>
      )}

      <DatePicker
        modal
        open={isOpen}
        mode={mode}
        date={value || new Date()}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        minuteInterval={minuteInterval}
        locale="mn"
        is24hourSource="locale"
        title={label ?? ''}
        confirmText="Сонгох"
        cancelText="Болих"
        onConfirm={(selectedDate) => {
          setIsOpen(false);
          onValueChange?.(selectedDate);
        }}
        onCancel={() => setIsOpen(false)}
      />
    </View>
  );
}