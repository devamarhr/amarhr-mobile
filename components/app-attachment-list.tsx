import { AppText } from '@/components/app-text';
import { FileAttachmentIcon } from '@hugeicons-pro/core-stroke-standard';
import { AppFieldIcon } from "@/components/app-icon";
import { cn } from 'heroui-native';
import React from 'react';
import { Linking, Pressable, View } from 'react-native';

export interface AttachmentListItem {
  name?: string;
  path?: string;
  url: string;
}

/**
 * Read-only list of attachments rendered as stacked rows (icon + name),
 * each opening its file on press. Used on request/announcement detail views.
 */
export function AppAttachmentList({
  attachments,
  className,
}: {
  attachments?: AttachmentListItem[] | null;
  className?: string;
}) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <View className={cn('gap-5', className)}>
      {attachments.map((file, i) => (
        <Pressable
          key={i}
          className="flex-row items-center gap-2 bg-background border border-gray/30 rounded-lg h-11 px-2.5"
          onPress={() => Linking.openURL(file.url)}
        >
          <AppFieldIcon icon={FileAttachmentIcon} color="#6A6A6A" />
          <AppText className="text-base text-black flex-1" numberOfLines={1}>
            {file.name ?? file.path?.split('/').pop()}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
