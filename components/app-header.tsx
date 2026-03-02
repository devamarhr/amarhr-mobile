import { View, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { cn } from 'heroui-native';
import { AppText } from '@/components/app-text';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft02Icon } from '@hugeicons-pro/core-stroke-standard';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: Href;
  backIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export function AppHeader({ title, showBack, backHref, backIcon, rightContent, className, titleClassName }: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.navigate(backHref);
    } else {
      router.back();
    }
  };

  return (
    <View className={cn('flex-row items-center gap-2 mt-4 mb-5', className)}>
      {(showBack || backHref) && (
        <Pressable onPress={handleBack}>
          {backIcon || <HugeiconsIcon icon={ArrowLeft02Icon} color="#222222" size={24} />}
        </Pressable>
      )}
      <AppText className={cn('text-xl font-medium flex-1', titleClassName)}>{title}</AppText>
      {rightContent}
    </View>
  );
}