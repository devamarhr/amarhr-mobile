import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from "expo-router";
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import React from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft02Icon } from "@hugeicons-pro/core-stroke-standard";
import { cn } from "heroui-native";

const StyledSafeAreaView = withUniwind(SafeAreaView);

function InfoField({ label, value, className }: { label: string; value?: string | null; className?: string | null }) {
  return (
    <View className={cn('mb-4', className)}>
      <AppText className="text-sm text-darkgray">{label}</AppText>
      <AppText className="text-sm mt-1">{value || '-'}</AppText>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="bg-lightblue px-4 py-2 my-6">
      <AppText className="text-sm text-darkblue text-right">{title}</AppText>
    </View>
  );
}

export default function ContractInfoScreen() {
  const router = useRouter();

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <View className="flex-row items-center gap-2 px-4 mb-5">
          <Pressable onPress={() => router.back()}>
            <HugeiconsIcon icon={ArrowLeft02Icon} color="#222222" size={24} />
          </Pressable>
          <AppText className="text-xl font-medium">Хөд/гэрээний мэдээлэл</AppText>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4">
            <InfoField label="Хөдөлмөрийн гэрээ" value="Хугацаатай" />
            <InfoField label="Гэрээ эхэлсэн/дуусах огноо" value="2025/09/09 - 2025/09/09" />
            <InfoField
              label="Гэрээний төрөл"
              value="Санхүүжилт хийгдэх ажлын цар хүрээтэй холбоотой цаг хугацаагаар хязгаарлагдсан ажил үүрэг гүйцэтгүүлэх"
            />
            <InfoField label="Гэрээний дугаар" value="5242" />
            <InfoField
              label="НДШ тайлагнах төрөл"
              value="Хөдөлмөрийн гэрээний дагуу ажиллаж байгаа үндсэн ажилтан"
            />
            <InfoField label="НДШ төлсөн сар / Нийт ажилласан жилийн" value="120 сар" />
            <InfoField label="НДШ төлсөн сар / Одоогийн байгууллага дээр" value="120 сар" className="mb-0" />
          </View>

          <SectionHeader title="Цалин олговрын мэдээлэл" />

          <View className="px-4">
            <InfoField label="Үндсэн цалин тооцоолох аргачлал" value="Тогтмол + Гүйцэтгэл" />
            <InfoField label="Үндсэн цалин" value="1,000,000 ₮" />
            <InfoField label="Гүйцэтгэлийн цалин" value="500,000 ₮" />
            <InfoField label="Урьдчилгаа цалин тооцох суурь" value="Ирцэд ноогдох цалингийн хувиар" className="mb-0" />
          </View>

          <SectionHeader title="Нэмэгдэл олговрын мэдээлэл" />

          <View className="px-4 pb-8">
            <InfoField label="Илүү цагийн нэмэгдэл хөлс" value="1.5 %" />
            <InfoField label="Ажилласан жилийн нэмэгдэл" value="1.5 %" />
            <InfoField
              label="Хоолны хөнгөлөлт"
              value={"1.5 % / Эмийн сан / Салбар 1\n1.5 % / Эмийн сан / Салбар 1"}
            />
            <InfoField label="Шинээр нэмсэн нэмэгдэл цалингийн нэр" value="500,000 ₮" />
          </View>
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}