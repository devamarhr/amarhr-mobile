import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from "expo-router";
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import React from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowLeft02Icon, PencilEdit02Icon,
} from "@hugeicons-pro/core-stroke-standard";
import { useAuthStore } from '@/store/auth-store';

const StyledSafeAreaView = withUniwind(SafeAreaView);

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="pb-5">
      <AppText className="text-sm text-darkgray">{label}</AppText>
      <AppText className="text-sm mt-1">{value || '-'}</AppText>
    </View>
  );
}

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { lastName, firstName, nationality, phoneNumber } = useAuthStore();

  const fullName = `${lastName ?? ''} ${firstName ?? ''}`.trim() || '-';
  const regNumber = `${(lastName?.[0] ?? '').toUpperCase()}${(firstName?.[0] ?? '').toUpperCase()}99999999`;

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => router.back()}>
              <HugeiconsIcon icon={ArrowLeft02Icon} color="#222222" size={24} />
            </Pressable>
            <AppText className="text-xl font-medium">Хувийн мэдээлэл</AppText>
          </View>
          <Pressable>
            <HugeiconsIcon icon={PencilEdit02Icon} color="#005FEE" size={24} />
          </Pressable>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <InfoField label="Овог Нэр" value={fullName} />
          <InfoField label="Регистрийн дугаар" value={regNumber} />
          <InfoField label="Иргэншил" value={nationality ?? 'Монгол'} />
          <InfoField label="Утасны дугаар" value={phoneNumber ?? '99999999'} />
          <InfoField label="И-мэйл хаяг" value="anaranar234@gmail.com" />
          <InfoField label="Яаралтай үед холбоо барих дугаар" value="99999999 /Ээж/" />
          <InfoField
            label="Оршин суугаа хаяг"
            value="Улаанбаатар, Хан-Уул, 18-р хороо, ямар нэгэн гудамж, Дөрвөн улиралын цэцэрлэг, С-2 байр, 401тоот"
          />
          <InfoField label="Хүүхэд" value="9 хүүхэд" />
          <InfoField label="Цалингийн данс" value="99999999 /Хаан банк/" />
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}