import { View, Pressable, ScrollView } from 'react-native';
import { withUniwind } from "uniwind";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import { AppHeader } from "@/components/app-header";
import React from "react";
import { AppIcon } from "@/components/app-icon";
import { PencilEdit02Icon } from "@hugeicons-pro/core-stroke-standard";
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'expo-router';
import { useSelectOptions } from '@/hooks/use-select-options';

const StyledSafeAreaView = withUniwind(SafeAreaView);

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="pb-5">
      <AppText className="text-sm text-darkgray/50">{label}</AppText>
      <AppText className="text-base mt-1">{value || '-'}</AppText>
    </View>
  );
}

function findLabel(options: { value: string; label: string }[], value: string | null): string | null {
  if (!value) return null;
  return options.find(opt => opt.value === value)?.label ?? value;
}

export default function PersonalInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useAuthStore();
  const { nationalityOptions, relationshipOptions, addressOptions, bankOptions } = useSelectOptions();

  const fullName = `${store.lastName ?? ''} ${store.firstName ?? ''}`.trim();
  const genderDisplay = store.gender === 'male' ? 'Эрэгтэй' : store.gender === 'female' ? 'Эмэгтэй' : null;
  const emergencyRelationLabel = findLabel(relationshipOptions, store.emergencyRelation);
  const emergencyDisplay = store.emergencyContact ? `${store.emergencyContact} /${emergencyRelationLabel}/` : null;
  const aimagLabel = findLabel(addressOptions, store.address?.path?.aimag ?? null);
  const soumOptions = addressOptions.find(c => c.value === store.address?.path?.aimag)?.children ?? [];
  const soumLabel = findLabel(soumOptions, store.address?.path?.soum ?? null);
  const khorooOptions = soumOptions.find(c => c.value === store.address?.path?.soum)?.children ?? [];
  const khorooLabel = findLabel(khorooOptions, store.address?.path?.khoroo ?? null);
  const addressDisplay = [aimagLabel, soumLabel, khorooLabel, store.address?.street].filter(Boolean).join(', ');
  const childrenCount = store.children?.length ?? 0;
  const bankLabel = findLabel(bankOptions, store.bank);
  const salaryDisplay = store.bankAccount ? `${store.bankAccount} /${bankLabel}/` : null;

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <AppHeader
          backTitle="Хувийн мэдээлэл"
          showBack
          rightContent={
            <Pressable onPress={() => router.navigate('/personal-info/edit')}>
              <AppIcon icon={PencilEdit02Icon} color="#005FEE" size={24} />
            </Pressable>
          }
        />
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        >
          <InfoField label="Овог Нэр" value={fullName} />
          <InfoField label="Хүйс" value={genderDisplay} />
          <InfoField label="Регистрийн дугаар" value={store.registerNumber} />
          <InfoField label="Төрсөн огноо" value={store.birthDate} />
          <InfoField label="Иргэншил" value={findLabel(nationalityOptions, store.nationality)} />
          <InfoField label="Ургийн овог" value={store.familyName} />
          <InfoField label="Утасны дугаар" value={store.phone} />
          <InfoField label="И-мэйл хаяг" value={store.email} />
          <InfoField label="Яаралтай үед холбоо барих дугаар" value={emergencyDisplay || null} />
          <InfoField label="Оршин суугаа хаяг" value={addressDisplay || null} />
          <InfoField label="Хүүхэд" value={childrenCount > 0 ? `${childrenCount} хүүхэд` : null} />
          <InfoField label="Цалингийн данс" value={salaryDisplay || null} />
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}