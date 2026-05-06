import { AppButton } from '@/components/app-button';
import { AppHeader } from '@/components/app-header';
import { AppText } from '@/components/app-text';
import { api } from '@/config/api';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { Separator } from 'heroui-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

type FormType = 'dateRange' | 'timeRange' | 'compensatory' | 'textOnly' | 'timeCorrection' | 'annualLeave';

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
  availableStartDate?: string;
  availableEndDate?: string;
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
    annual_leave_available_days?: number;
    annual_leave_available_start_date?: string;
    annual_leave_available_end_date?: string;
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
    if (key === 'annual_leave') return 'annualLeave';
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

  if (detail.key === 'annual_leave' && detail.annual_leave_available_days != null) {
    return [{ label: 'Боломжит хоног', value: `${detail.annual_leave_available_days} хоног` }];
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

        if (detail.key === 'annual_leave' && detail.annual_leave_available_days) {
          maxDays = detail.annual_leave_available_days;
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
          availableStartDate: detail.annual_leave_available_start_date,
          availableEndDate: detail.annual_leave_available_end_date,
        };
      }),
    });
  }

  return categories;
}

type ReviewerType = string | null;

interface ReviewDetail {
  comment: string | null;
  review_at?: string | null;
  decision_at?: string | null;
}

interface EmployeeRequest {
  id: number;
  employee_request_setting_id: number;
  status: 'pending' | 'senior_pending' | 'approved' | 'rejected' | 'read';
  review_by_type: ReviewerType;
  review_detail: ReviewDetail | null;
  decision_by_type: ReviewerType;
  decision_detail: ReviewDetail | null;
  created_at: string | null;
  setting: {
    id: number;
    name: string;
  };
}

interface PaginatedRequestResponse {
  current_page: number;
  data: EmployeeRequest[];
  last_page: number;
  total: number;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Хүлээгдэж байна', color: 'text-yellow' },
  senior_pending: { label: 'Хүлээгдэж байна', color: 'text-yellow' },
  approved: { label: 'Зөвшөөрсөн', color: 'text-green' },
  rejected: { label: 'Татгалзсан', color: 'text-red' },
  read: { label: 'Уншиж танилцсан', color: 'text-darkcyan' },
};

function getDecisionLabel(type: ReviewerType): string | null {
  if (type?.includes('Employee')) return 'Ахлах';
  if (type?.includes('User')) return 'Админ';
  return null;
}

function getReviewLabel(type: ReviewerType): string | null {
  if (type?.includes('Employee')) return 'Ахлахийн санал';
  if (type?.includes('User')) return 'Админы санал';
  return null;
}

export default function RequestScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState<RequestCategory[]>([]);
  const [employeeRequests, setEmployeeRequests] = useState<EmployeeRequest[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const currentPage = useRef(1);
  const lastPage = useRef(1);
  const isFetching = useRef(false);

  const fetchRequests = useCallback((page: number, isRefresh = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    currentPage.current = page;

    const isFirstPage = page === 1;
    if (isRefresh) setRefreshing(true);
    else if (!isFirstPage) setLoadingMore(true);

    api<PaginatedRequestResponse>({
      path: `/employee-request?current_page=${page}`,
      method: 'GET',
    }).then((res) => {
      console.log(`page ${page}`)
      if (res.status === 200) {
        setEmployeeRequests((prev) => isFirstPage ? res.data.data : [...prev, ...res.data.data]);
        lastPage.current = res.data.last_page;
      }
    }).catch(console.error)
      .finally(() => {
        isFetching.current = false;
        if (isRefresh) setRefreshing(false);
        else setLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    api<ApiResponse>({
      path: '/employee-request/settings',
      method: 'GET',
    }).then((res) => {
      if (res.status === 200) {
        setCategories(mapApiToCategories(res.data));
      }else{
        console.log(res.message)
      }
    }).catch(console.error);

    fetchRequests(1);
  }, [fetchRequests]);

  const handleEndReached = useCallback(() => {
    if (currentPage.current < lastPage.current) {
      fetchRequests(currentPage.current + 1);
    }
  }, [fetchRequests]);

  const handleRefresh = useCallback(() => {
    fetchRequests(1, true);
  }, [fetchRequests]);

  const handleItemPress = (item: RequestItem) => {
    const pathname = item.type === 'annualLeave' ? '/request/annual-leave' : '/request/create';
    router.navigate({
      pathname,
      params: {
        id: item.id,
        title: item.label,
        type: item.type,
        ...(item.headerInfo && { headerInfo: JSON.stringify(item.headerInfo) }),
        ...(item.maxDays && { maxDays: String(item.maxDays) }),
        ...(item.maxHours && { maxHours: String(item.maxHours) }),
        ...(item.availableStartDate && { availableStartDate: item.availableStartDate }),
        ...(item.availableEndDate && { availableEndDate: item.availableEndDate }),
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

        {activeTab === 0 ? (
          <ScrollView className="flex-1" contentContainerClassName="pb-5" showsVerticalScrollIndicator={false}>
            {categories.map((category) => (
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
            ))}
          </ScrollView>
        ) : (
          <FlatList
            className="flex-1 px-4"
            contentContainerClassName="pb-5"
            data={employeeRequests}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ItemSeparatorComponent={() => <Separator className="bg-darkgray/20" />}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <AppText className="text-sm text-darkgray">Та одоогоор өргөдөл хүсэлт илгээгээгүй байна</AppText>
              </View>
            }
            ListFooterComponent={loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : null}
            renderItem={({ item: employeeRequest }) => {
              const status = statusMap[employeeRequest.status] ?? { label: employeeRequest.status, color: 'text-darkgray' };
              return (
                <Pressable
                  className="py-3"
                  onPress={() => router.navigate({
                    pathname: '/request/[id]',
                    params: { id: String(employeeRequest.id) },
                  })}
                >
                  <AppText className="text-base font-medium">{employeeRequest.setting.name}</AppText>
                  <View className="flex-row items-center justify-between mt-1">
                    <AppText className={`text-sm font-medium ${status.color}`}>
                      {status.label}
                    </AppText>
                    {employeeRequest.created_at && (
                      <AppText className="text-sm text-darkgray">
                        {dayjs(employeeRequest.created_at).format('MM/DD  HH:mm')}
                      </AppText>
                    )}
                  </View>
                  {employeeRequest.decision_detail?.comment && (
                    <>
                      <AppText className="text-sm text-darkgray mt-1">
                        {getDecisionLabel(employeeRequest.decision_by_type) ?? 'Шийдвэр'}
                      </AppText>
                      <AppText className="text-sm mt-0.5 mb-2">{employeeRequest.decision_detail.comment}</AppText>
                    </>
                  )}
                  {employeeRequest.review_detail?.comment && (
                    <>
                      <AppText className="text-sm text-darkgray mt-1">
                        {getReviewLabel(employeeRequest.review_by_type) ?? 'Санал'}
                      </AppText>
                      <AppText className="text-sm mt-0.5">{employeeRequest.review_detail.comment}</AppText>
                    </>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </StyledSafeAreaView>
  );
}