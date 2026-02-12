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
 *       icon={<HugeiconsIcon icon={CheckIcon} />}
 *       action={<HugeiconsIcon icon={CloseIcon} size={16} />}
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

  return (
    <Toast variant={variant} className="flex-row gap-3" {...toastProps}>
      {icon && <View className={iconContainerClassName}>{icon}</View>}

      <View className={cn('flex-1',contentContainerClassName)}>
        {title && <Toast.Title className={titleClassName}>{title}</Toast.Title>}
        {description && (
          <Toast.Description className={descriptionClassName}>
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