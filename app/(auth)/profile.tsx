import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from "expo-router";
import { Avatar, cn, Separator, Switch } from "heroui-native";
import { useAuthStore } from '@/store/auth-store';
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import React, { useState } from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react-native";
import {
  ArrowLeft01Icon,
  UserIcon,
  Building01Icon,
  Book01Icon,
  Clock01Icon,
  TelephoneIcon,
  InformationCircleIcon,
  Logout01Icon, Agreement01Icon, Agreement03Icon, ArrowLeft02Icon, Building03Icon, Building06StrokeStandard,
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

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const fullName = `${lastName ?? ''} ${firstName ?? ''}`.trim() || 'Хэрэглэгч';

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()}>
            <HugeiconsIcon icon={ArrowLeft02Icon} color="#222222" size={24} />
          </Pressable>
          <AppText className="text-xl font-medium">Профайл</AppText>
        </View>
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
              onPress={handleLogout}
            />
          </View>
        </View>
      </View>
    </StyledSafeAreaView>
  );
}