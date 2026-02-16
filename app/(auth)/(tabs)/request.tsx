import { View, Pressable, ScrollView } from 'react-native';
import { Separator } from 'heroui-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';
import { AppText } from '@/components/app-text';
import { AppButton } from '@/components/app-button';
import { AppHeader } from '@/components/app-header';
import React, { useState } from 'react';

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface RequestItem {
  id: string;
  label: string;
}

interface RequestCategory {
  name: string;
  items: RequestItem[];
}

interface Decision {
  id: string;
  title: string;
  status: string;
  statusColor: string;
  date: string;
  approver: string;
  description: string;
}

const DECISIONS: Decision[] = [
  {
    id: '1',
    title: 'Цаг засах',
    status: 'Зөвшөөрсөн',
    statusColor: 'text-green',
    date: '09/09  12:56',
    approver: 'Ахлах',
    description:
      'Lorem ipsum dolor sit amet, consectetur temcon adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
];

const CATEGORIES: RequestCategory[] = [
  {
    name: 'Амралт, чөлөө',
    items: [
      { id: '1', label: 'Хагас өдрийн чөлөө' },
      { id: '2', label: 'Цалингүй чөлөө /3 хүртэлх хоног/' },
      { id: '3', label: 'Цалингүй чөлөө /3-с дээш хоног/' },
      { id: '4', label: 'Өвчний чөлөө /5 хүртэлх хоног, цалинтай/' },
      { id: '5', label: 'Нөхөж амрах' },
      { id: '6', label: 'Ээлжийн амралт' },
      { id: '7', label: 'Шинэ аавын амралт' },
      { id: '8', label: 'Шинээр нэмсэн ирцэд нөлөөлөх' },
    ],
  },
  {
    name: 'Зайнаас ажиллах',
    items: [
      { id: '9', label: 'Гадуур ажиллах' },
      { id: '10', label: 'Зайнаас ажиллах' },
      { id: '11', label: 'Сургалт' },
      { id: '12', label: 'Шинээр нэмсэн зайнаас ажиллах' },
    ],
  },
  {
    name: 'Бусад',
    items: [
      { id: '13', label: 'Илүү цагаар ажиллах' },
      { id: '14', label: 'Санал, хүсэлт' },
      { id: '15', label: 'Нэрээ нууцалсан санал, гомдол' },
    ],
  },
  {
    name: 'Урт хугацааны, төлөв өөрчлөх',
    items: [
      { id: '16', label: 'Урт хугацааны өвчтэй, чөлөөтэй' },
      { id: '17', label: 'Жирэмсний болон амаржсаны амралт' },
      { id: '18', label: 'Хүүхэд асрах чөлөө /3 хүртэлх насны/' },
      { id: '19', label: 'Шинээр нэмсэн төлөв, гэрээнд нөлөөлөх' },
    ],
  },
  {
    name: 'Тэтгэмж',
    items: [
      { id: '20', label: 'Гэрлэлтээ батлуулсны тэтгэмж' },
      { id: '21', label: 'Шинээр нэмсэн тэтгэмж' },
    ],
  },
];

export default function RequestScreen() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <AppHeader title="Өргөдөл хүсэлт" className="px-4" />
        <View className="flex-row px-4 mb-4 gap-3">
          <AppButton
            label="Илгээх"
            onPress={() => setActiveTab(0)}
            className={`flex-1 rounded-full ${activeTab === 0 ? 'border-darkgray' : 'border-darkgray/30'}`}
            labelClassName={activeTab === 0 ? 'font-medium text-black' : 'text-darkgray/50'}
          />
          <AppButton
            onPress={() => setActiveTab(1)}
            className={`flex-1 rounded-full ${activeTab === 1 ? 'border-darkgray' : 'border-darkgray/30'}`}
            labelComponent={
              <View className="flex-row items-center gap-1.5">
                <AppText className={`text-sm ${activeTab === 1 ? 'font-medium text-black' : 'text-darkgray/50'}`}>
                  Шийдвэр
                </AppText>
                <View className="w-2 h-2 -mt-2 rounded-full bg-orange" />
              </View>
            }
          />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {activeTab === 0 ? (
            CATEGORIES.map((category) => (
              <View key={category.name}>
                <View className="bg-lightblue px-4 py-2">
                  <AppText className="text-sm text-darkblue text-right">
                    {category.name}
                  </AppText>
                </View>
                <View className="px-4">
                  {category.items.map((item, index) => (
                    <View key={item.id}>
                      <Pressable className="py-3.5">
                        <AppText className="text-sm">{item.label}</AppText>
                      </Pressable>
                      {index < category.items.length - 1 && (
                        <Separator className="bg-darkgray/12" />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View className="px-4">
              {DECISIONS.map((decision, index) => (
                <View key={decision.id}>
                  <View className="py-3">
                    <AppText className="text-base font-medium">{decision.title}</AppText>
                    <View className="flex-row items-center justify-between mt-1">
                      <AppText className={`text-sm font-medium ${decision.statusColor}`}>
                        {decision.status}
                      </AppText>
                      <AppText className="text-sm text-darkgray">{decision.date}</AppText>
                    </View>
                    <AppText className="text-sm text-darkgray mt-1">{decision.approver}</AppText>
                    <AppText className="text-sm mt-2">{decision.description}</AppText>
                  </View>
                  {index < DECISIONS.length - 1 && (
                    <Separator className="bg-darkgray/12" />
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}