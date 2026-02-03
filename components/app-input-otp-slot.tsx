import { cn, InputOTP, useInputOTP } from 'heroui-native';
import React from 'react';

interface AppInputOTPSlotProps {
  /**
   * Zero-based index of the slot (required)
   */
  index: number;
  /**
   * Additional CSS classes for the slot container
   */
  className?: string;
  /**
   * Additional CSS classes for the slot placeholder
   */
  slotPlaceholderClassName?: string;
  /**
   * Additional CSS classes for the slot value
   */
  slotValueClassName?: string;
  /**
   * Additional CSS classes for the slot caret
   */
  slotCaretClassName?: string;
}

export function AppInputOTPSlot({
  index,
  className,
  slotPlaceholderClassName,
  slotValueClassName,
  slotCaretClassName,
}: AppInputOTPSlotProps) {
  const { isInvalid } = useInputOTP();

  return (
    <InputOTP.Slot
      index={index}
      className={cn('border', !isInvalid && 'border-gray/30', className)}
    >
      <InputOTP.SlotPlaceholder className={cn('',slotPlaceholderClassName)} />
      <InputOTP.SlotValue className={cn('text-base font-normal',slotValueClassName)} />
      <InputOTP.SlotCaret className={cn('',slotCaretClassName)} />
    </InputOTP.Slot>
  );
}