import { View, ScrollView } from 'react-native';
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import { AppHeader } from "@/components/app-header";
import React from "react";
import { cn } from "heroui-native";

const StyledSafeAreaView = withUniwind(SafeAreaView);

function InfoField({ label, value, className }: { label: string; value?: string | null; className?: string | null  }) {
  return (
    <View className={cn('mb-4', className)}>
      <AppText className="text-sm text-darkgray">{label}</AppText>
      <AppText className="text-sm mt-1">{value || '-'}</AppText>
    </View>
  );
}

export default function WorkInfoScreen() {
  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <AppHeader title="Ажлын байрны мэдээлэл" showBack className="px-4" />
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4">
            <InfoField label="Алба, хэлтэс" value="Хүний нөөцийн алба" />
            <InfoField label="Албан тушаал" value="Бизнес төлөвлөлтийн туслах" />
            <InfoField label="Ажилтны код / ID" value="1234" />
            <InfoField label="Ажил мэргэжлийн код" value="5242-12-Борлуулагч" />
            <InfoField label="Ажлын нөхцөл" value="Хэвийн" />
            <InfoField label="Эрүүл мэндийн үзлэг" value="Хамрагдана / 12 сарын давтамжтай" />
            <InfoField label="Үндсэн салбар" value="Эмийн сан / Салбар 1" className="mb-0" />
          </View>

          <View className="bg-lightblue px-4 py-2 my-6">
            <AppText className="text-sm text-darkblue text-right">Цагийн хуваарь</AppText>
          </View>

          <View className="px-4">
            <InfoField label="Ажилтны цагийг" value="Бүртгэнэ" />
            <InfoField label="Цагийн хуваарийн нэр" value="Цагийн хуваарийн нэр 1" />
            <InfoField label="Ажлын хуваарь / Цикл / Ростер" value="5/2" />
            <InfoField
              label="Хоцорсон минутын суутгал"
              value="Сарын 240 минутын хоцролтын дараагаас минут тутам 500 ₮"
              className="mb-0"
            />
          </View>
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}