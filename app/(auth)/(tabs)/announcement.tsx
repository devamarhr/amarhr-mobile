import { View, ScrollView } from 'react-native';
import { Separator } from 'heroui-native';
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/app-header";
import { AppButton } from "@/components/app-button";
import { AppText } from "@/components/app-text";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { FileAttachmentIcon } from "@hugeicons-pro/core-stroke-standard";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isToday from "dayjs/plugin/isToday";
import React from "react";

dayjs.extend(customParseFormat);
dayjs.extend(isToday);

const StyledSafeAreaView = withUniwind(SafeAreaView);

type AnnouncementType = 'info' | 'warning';

interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  target: string;
  date: string;
  description: string;
  hasAttachment?: boolean;
}

const announcements: Announcement[] = [
  {
    id: '1',
    type: 'info',
    title: 'Шинэ оффисын дүрэм журам',
    target: 'Нийт ажилчид',
    date: '02/16  09:30',
    description: 'Энэ сарын 20-ноос эхлэн оффисын шинэ дүрэм журам мөрдөгдөж эхэлнэ. Дэлгэрэнгүй мэдээллийг хавсралтаас харна уу.',
    hasAttachment: true,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Серверийн засвар үйлчилгээ',
    target: 'IT хэлтэс',
    date: '02/16  14:00',
    description: 'Өнөөдөр орой 22:00-02:00 цагийн хооронд серверийн засвар үйлчилгээ хийгдэх тул системд нэвтрэх боломжгүй байх болно.',
  },
  {
    id: '3',
    type: 'info',
    title: 'Сарын ажилтны шагнал',
    target: 'Хүний нөөцийн хэлтэс',
    date: '02/14  10:15',
    description: '2 сарын шилдэг ажилтны нэр дэвшигчдийг санал болгохыг хүсье. Хугацаа: 2 сарын 18 хүртэл.',
    hasAttachment: true,
  },
  {
    id: '4',
    type: 'warning',
    title: 'Цалингийн өөрчлөлт',
    target: '3 салбар',
    date: '02/13  16:45',
    description: 'Ажилчдын цалингийн шинэчлэлт хийгдсэн тул цалингийн хуудсаа шалгана уу. Асуудал гарвал HR хэлтэст хандана уу.',
  },
  {
    id: '5',
    type: 'info',
    title: 'Баг бүрдүүлэх арга хэмжээ',
    target: 'Нийт ажилчид',
    date: '02/12  11:00',
    description: '2 сарын 22-нд баг бүрдүүлэх арга хэмжээ зохион байгуулагдана. Бүртгүүлэх хугацаа 2 сарын 19 хүртэл.',
  },
  {
    id: '6',
    type: 'info',
    title: 'Ажлын байрны аюулгүй байдал',
    target: '2 ажилтан',
    date: '02/10  08:30',
    description: 'Аюулгүй байдлын сургалт 2 сарын 25-нд явагдана. Заавал оролцоно уу.',
    hasAttachment: true,
  },
  {
    id: '7',
    type: 'warning',
    title: 'Тайлан хугацаа дуусах анхааруулга',
    target: 'Санхүүгийн хэлтэс',
    date: '02/08  17:20',
    description: 'Сарын эцсийн тайланг 2 сарын 20-ны дотор заавал илгээнэ үү. Хоцрогдол гарсан тохиолдолд удирдлагад мэдэгдэнэ.',
  },
];

export default function AnnouncementScreen() {
  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <AppHeader title="Зарлал мэдээлэл" className="mb-0" />
        <ScrollView showsVerticalScrollIndicator={false}>
          {announcements.map((item, index) => (
            <View key={item.id}>
              <View className="py-5">
                <AppText className={`text-base font-medium ${item.type === 'warning' ? 'text-red' : ''}`}>{item.title}</AppText>
                <View className="flex-row items-center justify-between mt-2">
                  <AppText className={`text-sm ${dayjs(item.date, 'MM/DD  HH:mm').isToday() ? 'text-blue font-medium' : 'text-darkgray'}`}>{item.target}</AppText>
                  <AppText className={`text-sm ${dayjs(item.date, 'MM/DD  HH:mm').isToday() ? 'text-blue font-medium' : 'text-darkgray'}`}>{item.date}</AppText>
                </View>
                <AppText className="text-sm mt-2">{item.description}</AppText>
                {item.hasAttachment && (
                  <AppButton
                    label="Хавсралттай"
                    leftIcon={<HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={22} />}
                    className="mt-5"
                    labelClassName="text-blue"
                  />
                )}
              </View>
              {index < announcements.length - 1 && (
                <Separator className="bg-darkgray/20" />
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}