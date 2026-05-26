import { AppText } from '@/components/app-text';
import {
  pickDocuments,
  pickPhotos,
  registerAttachmentPickerHost,
  type PickedAsset,
} from '@/utils/pick-attachment';
import { File02Icon, Image02Icon } from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Dialog } from 'heroui-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

type Resolver = (assets: PickedAsset[]) => void;

export function AttachmentPickerHost() {
  const resolverRef = useRef<Resolver | null>(null);
  const pickingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    registerAttachmentPickerHost((resolve) => {
      resolverRef.current = resolve;
      pickingRef.current = false;
      setIsOpen(true);
    });
    return () => registerAttachmentPickerHost(null);
  }, []);

  const resolveWith = (assets: PickedAsset[]) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.(assets);
  };

  const handlePhotos = async () => {
    pickingRef.current = true;
    setIsOpen(false);
    const assets = await pickPhotos();
    resolveWith(assets);
  };

  const handleDocuments = async () => {
    pickingRef.current = true;
    setIsOpen(false);
    const assets = await pickDocuments();
    resolveWith(assets);
  };

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next);
    if (!next && !pickingRef.current) {
      resolveWith([]);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-[#6C719F]/40" />
        <Dialog.Content>
          <View className="mb-4 gap-1.5">
            <Dialog.Title>Хавсралт сонгох</Dialog.Title>
          </View>
          <View className="gap-2">
            <Pressable
              className="flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3"
              onPress={handlePhotos}
            >
              <HugeiconsIcon icon={Image02Icon} color="#005FEE" size={20} />
              <AppText className="text-sm flex-1">Зураг сонгох</AppText>
            </Pressable>
            <Pressable
              className="flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3"
              onPress={handleDocuments}
            >
              <HugeiconsIcon icon={File02Icon} color="#005FEE" size={20} />
              <AppText className="text-sm flex-1">Файл сонгох</AppText>
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
