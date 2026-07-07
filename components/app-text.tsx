import { cn, Typography } from 'heroui-native';
import React from 'react';
import type { TextProps } from 'react-native';

export const AppText = React.forwardRef<React.ElementRef<typeof Typography>, TextProps>(
  ({ className, ...props }, ref) => (
    <Typography ref={ref} className={cn('text-base text-foreground', className)} {...props} />
  ),
);

AppText.displayName = 'AppText';
