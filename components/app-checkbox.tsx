import { Tick02Icon } from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { cn } from 'heroui-native';
import React from 'react';
import { Pressable, View } from 'react-native';

interface AppCheckboxProps {
  isSelected: boolean;
  onSelectedChange: (value: boolean) => void;
  size?: number;
  color?: string;
  className?: string;
}

export function AppCheckbox({
  isSelected,
  onSelectedChange,
  size = 22,
  color = '#18AA0B',
  className,
}: AppCheckboxProps) {
  return (
    <Pressable onPress={() => onSelectedChange(!isSelected)} className={className} hitSlop={6}>
      {isSelected ? (
        <HugeiconsIcon icon={Tick02Icon} color={color} size={size} strokeWidth={2.5} />
      ) : (
        <View
          className={cn('rounded-md border border-darkgray/30')}
          style={{ width: size, height: size }}
        />
      )}
    </Pressable>
  );
}
