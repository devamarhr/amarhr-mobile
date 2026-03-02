import { View, Pressable, ScrollView } from 'react-native';
import { Separator } from 'heroui-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';
import { AppText } from '@/components/app-text';
import { AppButton } from '@/components/app-button';
import { AppHeader } from '@/components/app-header';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';

const StyledSafeAreaView = withUniwind(SafeAreaView);

type FormType = 'dateRange' | 'timeRange' | 'compensatory' | 'textOnly' | 'timeCorrection';

interface HeaderInfoItem {
  label: string;
  value: string;
}

interface RequestItem {
  id: string;
  label: string;
  type: FormType;
  headerInfo?: HeaderInfoItem[];
  textAreaLabel?: string;
  textAreaPlaceholder?: string;
  dateLabel?: string;
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
      {
        id: '1',
        label: 'Хагас өдрийн чөлөө',
        type: 'timeRange',
        dateLabel: 'Чөлөө авах өдөр',
        headerInfo: [
          { label: 'Амралт чөлөөний төрөл', value: 'Цалингүй' },
          { label: 'Боломжит дээд цаг', value: '6 цаг' },
        ],
      },
      {
        id: '2',
        label: 'Цалингүй чөлөө /3 хүртэлх хоног/',
        type: 'dateRange',
        headerInfo: [
          { label: 'Амралт чөлөөний төрөл', value: 'Цалингүй' },
          { label: 'Боломжит дээд хоног', value: '3 хоног' },
        ],
      },
      {
        id: '3',
        label: 'Цалингүй чөлөө /3-с дээш хоног/',
        type: 'dateRange',
        headerInfo: [
          { label: 'Амралт чөлөөний төрөл', value: 'Цалингүй' },
          { label: 'Боломжит дээд хоног', value: '20 хоног' },
        ],
      },
      {
        id: '4',
        label: 'Өвчний чөлөө /5 хүртэлх хоног, цалинтай/',
        type: 'dateRange',
        headerInfo: [
          { label: 'Амралт чөлөөний төрөл', value: 'Цалинтай' },
          { label: 'Боломжит дээд хоног', value: '5 хоног' },
        ],
      },
      {
        id: '5',
        label: 'Нөхөж амрах',
        type: 'compensatory',
        headerInfo: [{ label: 'Хуримтлагдсан цаг', value: '12:00' }],
      },
      {
        id: '6',
        label: 'Ээлжийн амралт',
        type: 'dateRange',
        headerInfo: [
          { label: 'Амралт чөлөөний төрөл', value: 'Цалинтай' },
          { label: 'Боломжит хоног', value: '15 хоног' },
          { label: 'Олговор авах хоног', value: '15 хоног' },
        ],
      },
      {
        id: '7',
        label: 'Шинэ аавын амралт',
        type: 'dateRange',
        headerInfo: [
          { label: 'Амралт чөлөөний төрөл', value: 'Цалинтай' },
          { label: 'Боломжит дээд хоног', value: '10 хоног' },
        ],
      },
      {
        id: '8',
        label: 'Шинээр нэмсэн ирцэд нөлөөлөх',
        type: 'dateRange',
        headerInfo: [
          { label: 'Амралт чөлөөний төрөл', value: 'Цалинтай' },
          { label: 'Боломжит дээд хоног', value: '10 хоног' },
        ],
      },
    ],
  },
  {
    name: 'Зайнаас ажиллах',
    items: [
      {
        id: '9',
        label: 'Гадуур ажиллах',
        type: 'timeRange',
        dateLabel: 'Зайнаас ажиллах өдөр',
        headerInfo: [
          { label: 'Цалин бодолтын хувь', value: '% 100' },
          { label: 'Боломжит дээд цаг', value: '6 цаг' },
        ],
      },
      {
        id: '10',
        label: 'Зайнаас ажиллах',
        type: 'timeRange',
        dateLabel: 'Зайнаас ажиллах өдөр',
        headerInfo: [
          { label: 'Цалин бодолтын хувь', value: '% 100' },
          { label: 'Боломжит дээд цаг', value: '8 цаг' },
        ],
      },
      {
        id: '11',
        label: 'Сургалт',
        type: 'timeRange',
        dateLabel: 'Сургалтын өдөр',
        headerInfo: [
          { label: 'Цалин бодолтын хувь', value: '% 100' },
          { label: 'Боломжит дээд цаг', value: '8 цаг' },
        ],
      },
      {
        id: '12',
        label: 'Шинээр нэмсэн зайнаас ажиллах',
        type: 'timeRange',
        dateLabel: 'Зайнаас ажиллах өдөр',
        headerInfo: [
          { label: 'Цалин бодолтын хувь', value: '% 100' },
          { label: 'Боломжит дээд цаг', value: '8 цаг' },
        ],
      },
    ],
  },
  {
    name: 'Бусад',
    items: [
      {
        id: '13',
        label: 'Илүү цагаар ажиллах',
        type: 'timeRange',
        dateLabel: 'Ажиллах өдөр',
      },
      {
        id: '14',
        label: 'Санал, хүсэлт',
        type: 'textOnly',
        textAreaLabel: 'Санал, хүсэлт',
        textAreaPlaceholder: 'Санал, хүсэлтээ энд бичнэ үү',
      },
      {
        id: '15',
        label: 'Нэрээ нууцалсан санал, гомдол',
        type: 'textOnly',
        textAreaLabel: 'Санал, гомдол',
        textAreaPlaceholder: 'Санал, гомдлоо энд бичнэ үү',
      },
    ],
  },
  {
    name: 'Урт хугацааны, төлөв өөрчлөх',
    items: [
      { id: '16', label: 'Урт хугацааны өвчний чөлөө', type: 'textOnly' },
      { id: '17', label: 'Жирэмсний болон амаржсаны амралт', type: 'textOnly' },
      { id: '18', label: 'Хүүхэд асрах чөлөө /3 хүртэлх насны/', type: 'textOnly' },
      { id: '19', label: 'Шинээр нэмсэн төлөв, гэрээнд нөлөөлөх нөлөөлөх нөлөөлөх нөлөөлөх', type: 'textOnly' },
    ],
  },
  {
    name: 'Тэтгэмж',
    items: [
      {
        id: '20',
        label: 'Гэрлэлтээ батлуулсны тэтгэмж',
        type: 'textOnly',
        headerInfo: [{ label: 'Үндсэн цалингийн', value: '% 100' }],
      },
      { id: '21', label: 'Шинээр нэмсэн тэтгэмж', type: 'textOnly' },
    ],
  },
];

export default function RequestScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  const handleItemPress = (item: RequestItem) => {
    router.navigate({
      pathname: '/request/create',
      params: {
        title: item.label,
        type: item.type,
        ...(item.headerInfo && { headerInfo: JSON.stringify(item.headerInfo) }),
        ...(item.textAreaLabel && { textAreaLabel: item.textAreaLabel }),
        ...(item.textAreaPlaceholder && { textAreaPlaceholder: item.textAreaPlaceholder }),
        ...(item.dateLabel && { dateLabel: item.dateLabel }),
      },
    });
  };

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

        <ScrollView className="flex-1" contentContainerClassName="pb-5" showsVerticalScrollIndicator={false}>
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
                      <Pressable className="py-3.5" onPress={() => handleItemPress(item)}>
                        <AppText className="text-sm" numberOfLines={1}>{item.label}</AppText>
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