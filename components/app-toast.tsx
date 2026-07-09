import { cn, Toast } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

/**
 * Toast component props provided by HeroUI
 */
interface ToastComponentProps {
  id: string;
  index: number;
  total: any; // SharedValue<number>
  heights: any; // SharedValue<Record<string, number>>
  maxVisibleToasts?: number;
  show: (options: any) => string;
  hide: (ids?: string | string[] | 'all') => void;
}

interface AppToastProps extends ToastComponentProps {
  /**
   * Visual variant of the toast
   * @default 'default'
   */
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  /**
   * Title text for the toast
   */
  title?: string;
  /**
   * Description text for the toast
   */
  description?: string;
  /**
   * Icon element to display on the left side
   */
  icon?: React.ReactNode;
  /**
   * Action button content - can be a string (text label) or ReactNode (icon/custom element)
   */
  action?: string | React.ReactNode;
  /**
   * Callback function called when the action button is pressed
   * Receives the toast component props (includes show, hide, etc.)
   */
  onActionPress?: (props: ToastComponentProps) => void;
  /**
   * Whether to show the close button in the top-right corner
   * @default false
   */
  showClose?: boolean;
  /**
   * Additional CSS class for the close button
   */
  closeClassName?: string;
  /**
   * Additional CSS class for the icon container View
   */
  iconContainerClassName?: string;
  /**
   * Additional CSS class for the content container View (wraps title and description)
   */
  contentContainerClassName?: string;
  /**
   * Additional CSS class for the title
   */
  titleClassName?: string;
  /**
   * Additional CSS class for the description
   */
  descriptionClassName?: string;
  /**
   * Additional CSS class for the action button
   */
  actionClassName?: string;
}

/**
 * Custom toast component that wraps HeroUI Toast with a simplified API
 *
 * @example
 * ```tsx
 * const { toast } = useToast();
 *
 * // With action icon
 * toast.show({
 *   component: (props) => (
 *     <AppToast
 *       {...props}
 *       variant="success"
 *       title="Success!"
 *       description="Your action was completed"
 *       icon={<AppIcon icon={CheckIcon} />}
 *       action={<AppIcon icon={CloseIcon} size={16} />}
 *       onActionPress={(props) => props.hide()}
 *     />
 *   ),
 * });
 *
 * // With action text label
 * toast.show({
 *   component: (props) => (
 *     <AppToast
 *       {...props}
 *       variant="warning"
 *       title="Warning!"
 *       action="Close"
 *       onActionPress={(props) => props.hide()}
 *     />
 *   ),
 * });
 *
 * // With close button
 * toast.show({
 *   component: (props) => (
 *     <AppToast
 *       {...props}
 *       title="Custom Toast"
 *       showClose
 *     />
 *   ),
 * });
 * ```
 */
export function AppToast({
  variant = 'default',
  title,
  description,
  icon,
  action,
  onActionPress,
  showClose = false,
  closeClassName,
  iconContainerClassName,
  contentContainerClassName,
  titleClassName,
  descriptionClassName,
  actionClassName,
  ...toastProps
}: AppToastProps) {
  const handleActionPress = () => {
    if (onActionPress) {
      onActionPress(toastProps);
    }
  };

  // success/danger render as a solid green/red pill with white text and a white
  // icon, matching the Figma design. Other variants keep the HeroUI defaults.
  const isFilled = variant === 'success' || variant === 'danger';
  const filledBgClass = variant === 'success' ? 'bg-green' : variant === 'danger' ? 'bg-red' : '';
  const renderedIcon =
    isFilled && React.isValidElement(icon)
      ? React.cloneElement(icon as React.ReactElement<{ color?: string; size?: number }>, {
          color: '#FFFFFF',
          size: (icon.props as { size?: number }).size ?? 20,
        })
      : icon;

  return (
    <Toast
      variant={variant}
      className={cn('flex-row gap-3 shadow-lg shadow-black/15', isFilled && filledBgClass)}
      {...toastProps}
      // Force the 10px corner radius via inline style so it always wins over the
      // HeroUI root's rounded-3xl regardless of class-merge ordering.
      style={isFilled ? { borderRadius: 10 } : undefined}
    >
      {renderedIcon && <View className={cn('justify-center', iconContainerClassName)}>{renderedIcon}</View>}

      <View className={cn('flex-1', contentContainerClassName)}>
        {title && (
          <Toast.Title className={cn(isFilled && 'text-white', titleClassName)}>{title}</Toast.Title>
        )}
        {description && (
          <Toast.Description className={cn(isFilled && 'text-base text-white', descriptionClassName)}>
            {description}
          </Toast.Description>
        )}
      </View>

      {action && onActionPress && (
        <Toast.Action className={actionClassName} onPress={handleActionPress}>
          {action}
        </Toast.Action>
      )}

      {showClose && <Toast.Close className={closeClassName} />}
    </Toast>
  );
}