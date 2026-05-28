import { View, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { cn } from 'heroui-native';
import { AppText } from '@/components/app-text';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft02Icon } from '@hugeicons-pro/core-stroke-standard';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: Href;
  backIcon?: React.ReactNode;
  backTitle?: string;
  backTitleClassName?: string;
  rightContent?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function AppHeader({ title, subtitle, showBack, backHref, backIcon, backTitle, backTitleClassName, rightContent, className, titleClassName, subtitleClassName }: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.navigate(backHref);
    } else {
      router.back();
    }
  };

  return (
    <View className={cn('flex-row items-center justify-between gap-2 mt-4 mb-5', className)}>
      {(showBack || backHref) && (
        <Pressable onPress={handleBack} className="flex-row items-center gap-2">
          {backIcon || <HugeiconsIcon icon={ArrowLeft02Icon} color="#222222" size={24} />}
          {(backTitle || (subtitle && !title)) && (
            <View>
              {subtitle && !title && <AppText className={cn('text-sm text-darkgray', subtitleClassName)}>{subtitle}</AppText>}
              {backTitle && <AppText className={cn('text-xl font-medium', backTitleClassName)}>{backTitle}</AppText>}
            </View>
          )}
        </Pressable>
      )}
      {(title || (subtitle && !(showBack || backHref))) && (
        <View className="flex-1">
          {subtitle && <AppText className={cn('text-sm text-darkgray', subtitleClassName)}>{subtitle}</AppText>}
          {title && <AppText className={cn('text-xl font-medium', titleClassName)}>{title}</AppText>}
        </View>
      )}
      {rightContent}
    </View>
  );
}