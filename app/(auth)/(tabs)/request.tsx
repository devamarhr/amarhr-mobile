import { AppButton } from '@/components/app-button';
import { AppHeader } from '@/components/app-header';
import { AppText } from '@/components/app-text';
import { api } from '@/config/api';
import { useRouter } from 'expo-router';
import { Separator } from 'heroui-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

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
  maxDays?: number;
  maxHours?: number;
}

interface RequestCategory {
  name: string;
  items: RequestItem[];
}

interface ApiRequestSetting {
  id: number;
  type: string;
  request_type: string;
  name: string;
  detail: {
    key?: string;
    name: string;
    show: boolean;
    fields: { time_unit?: string; has_salary?: boolean; time_value?: number; salary_percent?: number; salary_calculate?: string | null } | [];
    annual_leave_available?: number;
    compensatory_hours?: number;
    compensatory_max_hour?: number;
    compensatory_max_day?: number;
  };
  adjustment_setting: {
    id: number;
    detail: { amount: number; amount_type: 'fixed' | 'percent' }[];
  } | null;
}

type ApiResponse = Record<string, ApiRequestSetting[]>;

const categoryLabels: Record<string, string> = {
  time_correction: 'Цаг засах',
  leave: 'Амралт, чөлөө',
  remote: 'Зайнаас ажиллах',
  other: 'Бусад',
  employee_status: 'Урт хугацааны, төлөв өөрчлөх',
  benefit: 'Тэтгэмж',
};

const categoryOrder = ['leave', 'remote', 'other', 'employee_status', 'benefit'];

function getFormType(setting: ApiRequestSetting): FormType {
  if (setting.request_type === 'time_correction') return 'timeCorrection';

  if (setting.type === 'system') {
    const key = setting.detail.key;
    if (key === 'overtime') return 'timeRange';
    if (key === 'feedback' || key === 'anonymous_feedback') return 'textOnly';
    if (key === 'compensatory') return 'compensatory';
    if (key === 'annual_leave') return 'dateRange';
    return 'textOnly';
  }

  if (setting.type === 'attendance' || setting.type === 'remote') {
    const fields = setting.detail.fields;
    if (!Array.isArray(fields) && fields.time_unit === 'hour') return 'timeRange';
    return 'dateRange';
  }

  if (setting.type === 'employee_status' || setting.type === 'benefit') return 'textOnly';

  return 'textOnly';
}

function getHeaderInfo(setting: ApiRequestSetting): HeaderInfoItem[] | undefined {
  const detail = setting.detail;

  if (detail.key === 'compensatory' && detail.compensatory_hours != null) {
    return [{ label: 'Хуримтлагдсан цаг', value: `${detail.compensatory_hours} цаг` }];
  }

  if (detail.key === 'annual_leave' && detail.annual_leave_available != null) {
    return [{ label: 'Боломжит хоног', value: `${detail.annual_leave_available} хоног` }];
  }

  if (setting.type === 'benefit' && setting.adjustment_setting?.detail?.length) {
    return setting.adjustment_setting.detail.map((item) => {
      if (item.amount_type === 'fixed') {
        return { label: 'Нэг удаагийн', value: `₮${item.amount.toLocaleString()}` };
      }
      return { label: 'Үндсэн цалингийн', value: `%${item.amount}` };
    });
  }

  const fields = detail.fields;
  if (Array.isArray(fields)) return undefined;

  if (setting.type === 'attendance') {
    const timeLabel = fields.time_unit === 'hour' ? 'Боломжит дээд цаг' : 'Боломжит дээд хоног';
    const timeValue = fields.time_unit === 'hour' ? `${fields.time_value} цаг` : `${fields.time_value} хоног`;
    return [
      { label: 'Амралт чөлөөний төрөл', value: fields.has_salary ? 'Цалинтай' : 'Цалингүй' },
      { label: timeLabel, value: timeValue },
    ];
  }

  if (setting.type === 'remote') {
    const timeLabel = fields.time_unit === 'hour' ? 'Боломжит дээд цаг' : 'Боломжит дээд хоног';
    const timeValue = fields.time_unit === 'hour' ? `${fields.time_value} цаг` : `${fields.time_value} хоног`;
    return [
      { label: 'Цалин бодолтын хувь', value: `% ${fields.salary_percent}` },
      { label: timeLabel, value: timeValue },
    ];
  }

  return undefined;
}

function mapApiToCategories(data: ApiResponse): RequestCategory[] {
  const categories: RequestCategory[] = [];

  for (const key of categoryOrder) {
    const settings = data[key];
    if (!settings?.length) continue;

    categories.push({
      name: categoryLabels[key] || key,
      items: settings.map((s) => {
        const fields = s.detail.fields;
        const detail = s.detail;
        let maxDays: number | undefined;
        let maxHours: number | undefined;

        if (!Array.isArray(fields) && fields.time_value) {
          if (fields.time_unit === 'hour') {
            maxHours = fields.time_value;
          } else {
            maxDays = fields.time_value;
          }
        }

        if (detail.key === 'annual_leave' && detail.annual_leave_available) {
          maxDays = detail.annual_leave_available;
        }
        if (detail.key === 'compensatory') {
          if (detail.compensatory_max_day) maxDays = detail.compensatory_max_day;
          if (detail.compensatory_max_hour) maxHours = detail.compensatory_max_hour;
        }

        return {
          id: String(s.id),
          label: s.name,
          type: getFormType(s),
          headerInfo: getHeaderInfo(s),
          maxDays,
          maxHours,
        };
      }),
    });
  }

  return categories;
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

export default function RequestScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState<RequestCategory[]>([]);

  useEffect(() => {
    api<ApiResponse>({
      path: '/employee-request/settings',
      method: 'GET',
    }).then((res) => {
      if (res.status === 200) {
        const a = mapApiToCategories(res.data)
        console.log(JSON.stringify(a))
        setCategories(mapApiToCategories(res.data));
      }
    }).catch(console.error);
  }, []);

  const handleItemPress = (item: RequestItem) => {
    router.navigate({
      pathname: '/request/create',
      params: {
        id: item.id,
        title: item.label,
        type: item.type,
        ...(item.headerInfo && { headerInfo: JSON.stringify(item.headerInfo) }),
        ...(item.maxDays && { maxDays: String(item.maxDays) }),
        ...(item.maxHours && { maxHours: String(item.maxHours) }),
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
            categories.map((category) => (
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