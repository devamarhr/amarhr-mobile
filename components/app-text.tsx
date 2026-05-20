import { cn, Text } from 'heroui-native';
import React from 'react';
import type { TextProps } from 'react-native';

export const AppText = React.forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text ref={ref} className={cn('text-foreground', className)} {...props} />
  ),
);

AppText.displayName = 'AppText';
