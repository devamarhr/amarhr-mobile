import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from "expo-router";
import { Avatar, Button, cn, Dialog, Separator, Switch } from "heroui-native";
import { useAuthStore } from '@/store/auth-store';
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import { AppHeader } from "@/components/app-header";
import React, { useState } from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react-native";
import {
  UserIcon,
  Clock01Icon,
  InformationCircleIcon,
  Agreement03Icon, Building06StrokeStandard,
  LicenseIcon, SmartPhone01Icon, Logout05Icon,
} from "@hugeicons-pro/core-stroke-standard";
import { AppSwitch } from "@/components/app-switch";

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface MenuItemProps {
  icon: IconSvgElement;
  label: string;
  labelClassName?: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
}

function MenuItem({ icon, label, labelClassName, subtitle, onPress, trailing }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center h-12.5"
    >
      <View className="w-7.5 h-7.5 bg-darkgray/7 rounded-[5px] justify-center items-center">
        <HugeiconsIcon icon={icon} color="#959595" size={20} />
      </View>
      <View className="flex-1 ml-3">
        <AppText className={cn(
          'text-sm font-medium',
          labelClassName
        )}>{label}</AppText>
        {subtitle && (
          <AppText className="text-xs text-darkgray mt-0.5 leading-3">{subtitle}</AppText>
        )}
      </View>
      {trailing}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { lastName, firstName, logout } = useAuthStore();
  const [timeRegistration, setTimeRegistration] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogout = () => {
    setLogoutDialogOpen(false);
    logout();
    router.replace('/login');
  };

  const fullName = `${lastName ?? ''} ${firstName ?? ''}`.trim() || 'Хэрэглэгч';

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <AppHeader title="Профайл" showBack />
        <View className="items-center mt-4 mb-6">
          <Avatar alt="Profile" className="w-32.5 h-32.5">
            <Avatar.Image source={{
              uri: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2',
            }} />
            <Avatar.Fallback classNames={{ text: "text-black text-2xl" }}>
              {(firstName?.[0] ?? '') + (lastName?.[0] ?? '')}
            </Avatar.Fallback>
          </Avatar>
          <AppText className="text-base font-medium mt-1">{fullName}</AppText>
          <AppText className="text-sm text-darkgray">Бизнес төлөвлөлтийн туслах</AppText>
        </View>
        <View className="flex-1">
          <View className="flex-1 mt-2">
            <MenuItem
              icon={UserIcon}
              label="Хувийн мэдээлэл"
              onPress={() => router.push('/personal-info')}
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={Building06StrokeStandard}
              label="Ажлын байрны мэдээлэл"
              onPress={() => router.push('/work-info')}
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={Agreement03Icon}
              label="Хөдөлмөрийн гэрээний мэдээлэл"
              onPress={() => router.push('/work-contract')}
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={LicenseIcon}
              label="Гэрээ & дүрэм журам"
              onPress={() => router.push('/contracts-rules')}
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={Clock01Icon}
              label="Цаг бүртгэлийн мэдэгдэл"
              trailing={
                <AppSwitch
                  isSelected={timeRegistration}
                  onSelectedChange={setTimeRegistration}
                />
              }
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={SmartPhone01Icon}
              label="Холбоо барих дугаар"
              subtitle="Бусад алба хэлтсийн ажилтнуудаас нуух"
              trailing={
                <AppSwitch
                  isSelected={showContact}
                  onSelectedChange={setShowContact}
                />
              }
            />
          </View>

          <View className="mt-2 mb-8">
            <MenuItem
              icon={InformationCircleIcon}
              label="Ашиглах заавар"
              labelClassName="font-normal"
            />
            <MenuItem
              icon={Logout05Icon}
              label="Апп-с гарах"
              labelClassName="font-normal"
              onPress={() => setLogoutDialogOpen(true)}
            />
          </View>
        </View>
      </View>

      <Dialog isOpen={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="bg-[#6C719F]/40" />
          <Dialog.Content>
            <View className="mb-5 gap-1.5">
              <Dialog.Title>Апп-с гарах</Dialog.Title>
              <Dialog.Description>
                Та системээс гарахдаа итгэлтэй байна уу?
              </Dialog.Description>
            </View>
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" size="sm" onPress={() => setLogoutDialogOpen(false)}>
                <Button.Label>Үгүй</Button.Label>
              </Button>
              <Button size="sm" className="bg-red" onPress={handleLogout}>
                <Button.Label className="text-white">Тийм</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </StyledSafeAreaView>
  );
}