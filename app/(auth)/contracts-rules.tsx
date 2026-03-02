import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from "expo-router";
import { Separator } from "heroui-native";
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import { AppHeader } from "@/components/app-header";
import React from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { FileAttachmentIcon } from "@hugeicons-pro/core-stroke-standard";

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface DocumentItemProps {
  label: string;
  disabled?: boolean;
  onPress?: () => void;
}

function DocumentItem({ label, disabled, onPress }: DocumentItemProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center h-12.5"
    >
      <View className="w-7.5 h-7.5 bg-darkgray/7 rounded-lg justify-center items-center">
        <HugeiconsIcon icon={FileAttachmentIcon} color="#959595" size={20} />
      </View>
      <AppText className={`text-sm font-medium ml-3 flex-1 ${disabled ? 'text-darkgray/50' : ''}`}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function ContractsRulesScreen() {
  const router = useRouter();

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-4">
        <AppHeader title="Гэрээ & дүрэм журам" showBack />
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <DocumentItem label="Байгууллагын дотоод дүрэм журам" onPress={() => router.navigate({
            pathname: '/pdf-view', params: { title: 'Дотоод дүрэм журам', url: 'https://assets.withfra.me/pdf/sample.pdf' }
          })} />
          <Separator className="bg-darkgray/12" />
          <DocumentItem label="Ажлын байрны тодорхойлолт" onPress={() => router.navigate({
            pathname: '/pdf-view', params: { title: 'Ажлын байрны тодорхойлолт', url: 'https://assets.withfra.me/pdf/sample.pdf' }
          })} />
          <Separator className="bg-darkgray/12" />
          <DocumentItem label="Нууцын гэрээ" disabled />
          <Separator className="bg-darkgray/12" />
          <DocumentItem label="Эд хөрөнгийн бүрэн хариуцлагын гэрээ" disabled />
          <Separator className="bg-darkgray/12" />
          <DocumentItem label="Бусад гэрээ" />
          <Separator className="bg-darkgray/12" />
          <DocumentItem label="Бусад гэрээ" />
          <Separator className="bg-darkgray/12" />
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}