import { View, Pressable, ScrollView } from 'react-native';
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import { AppHeader } from "@/components/app-header";
import React from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { PencilEdit02Icon } from "@hugeicons-pro/core-stroke-standard";
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'expo-router';

const StyledSafeAreaView = withUniwind(SafeAreaView);

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="pb-5">
      <AppText className="text-sm text-darkgray">{label}</AppText>
      <AppText className="text-sm mt-1">{value || '-'}</AppText>
    </View>
  );
}

const nationalityLabels: Record<string, string> = {
  mongolia: 'Монгол', china: 'Хятад', russia: 'Орос',
  korea: 'Солонгос', japan: 'Япон', usa: 'АНУ', other: 'Бусад',
};

const relationshipLabels: Record<string, string> = {
  parent: 'Эцэг эх', spouse: 'Эхнэр/нөхөр', sibling: 'Ах/эгч/дүү',
  child: 'Хүүхэд', friend: 'Найз', other: 'Бусад',
};

const cityLabels: Record<string, string> = {
  ulaanbaatar: 'Улаанбаатар', darkhan: 'Дархан',
  erdenet: 'Эрдэнэт', choibalsan: 'Чойбалсан', other: 'Бусад',
};

const districtLabels: Record<string, string> = {
  bgd: 'Баянгол', bzd: 'Баянзүрх', shd: 'Сонгинохайрхан',
  chd: 'Чингэлтэй', hud: 'Хан-Уул', sud: 'Сүхбаатар', other: 'Бусад',
};

const bankLabels: Record<string, string> = {
  khan: 'Хаан банк', tdb: 'Худалдаа хөгжлийн банк', golomt: 'Голомт банк',
  state: 'Төрийн банк', xac: 'Хас банк', capitron: 'Капитрон банк', other: 'Бусад',
};

export default function PersonalInfoScreen() {
  const router = useRouter();
  const store = useAuthStore();

  const fullName = `${store.lastName ?? ''} ${store.firstName ?? ''}`.trim();
  const genderDisplay = store.gender === 'male' ? 'Эрэгтэй' : store.gender === 'female' ? 'Эмэгтэй' : null;
  const emergencyDisplay = [store.emergencyContact, store.emergencyRelationship ? relationshipLabels[store.emergencyRelationship] : null].filter(Boolean).join(' /') + (store.emergencyRelationship ? '/' : '');
  const addressDisplay = [store.city ? cityLabels[store.city] : null, store.district ? districtLabels[store.district] : null, store.address].filter(Boolean).join(', ');
  const childrenCount = store.children?.length ?? 0;
  const salaryDisplay = [store.salaryAccount, store.bank ? bankLabels[store.bank] : null].filter(Boolean).join(' /') + (store.bank ? '/' : '');

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-4">
        <AppHeader
          backTitle="Хувийн мэдээлэл"
          backHref="/profile"
          rightContent={
            <Pressable onPress={() => router.navigate('/personal-info/edit')}>
              <HugeiconsIcon icon={PencilEdit02Icon} color="#005FEE" size={24} />
            </Pressable>
          }
        />
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <InfoField label="Овог Нэр" value={fullName} />
          <InfoField label="Хүйс" value={genderDisplay} />
          <InfoField label="Регистрийн дугаар" value={store.registerNumber} />
          <InfoField label="Иргэншил" value={store.nationality ? nationalityLabels[store.nationality] : null} />
          <InfoField label="Ургийн овог" value={store.familyName} />
          <InfoField label="Утасны дугаар" value={store.phoneNumber} />
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