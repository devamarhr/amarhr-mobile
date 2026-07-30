import { AppButton } from '@/components/app-button';
import { AppHeader } from '@/components/app-header';
import { AppText } from '@/components/app-text';
import { getRequestHeaderInfo, type HeaderInfoItem } from '@/components/request-header-info';
import { api } from '@/config/api';
import { useNotificationStore } from '@/store/notification-store';
import { useRequestRefreshStore } from '@/store/request-refresh-store';
import dayjs from 'dayjs';
import { useFocusEffect, useRouter } from 'expo-router';
import { Separator } from 'heroui-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

type FormType = 'dateRange' | 'timeRange' | 'compensatory' | 'textOnly' | 'timeCorrection' | 'annualLeave' | 'overtime';

interface AnnualLeaveSplit {
  id: number;
  start_date: string;
  end_date: string;
  days: number;
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
  maxLeaveSplits?: number;
  annualLeaveSplits?: AnnualLeaveSplit[];
  settingType?: string;
  settingKey?: string;
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
    annual_leave_total_days?: number;
    annual_leave_available_start_date?: string;
    annual_leave_available_end_date?: string;
    max_leave_splits?: number;
    annual_leave_splits?: AnnualLeaveSplit[];
    compensatory_minutes?: number;
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
    if (key === 'overtime') return 'overtime';
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

        if (detail.key === 'annual_leave') {
          const total = detail.annual_leave_total_days ?? detail.annual_leave_available_days;
          if (total) maxDays = total;
        }
        if (detail.key === 'compensatory') {
          if (detail.compensatory_max_day) maxDays = detail.compensatory_max_day;
          if (detail.compensatory_max_hour) maxHours = detail.compensatory_max_hour;
        }

        return {
          id: String(s.id),
          label: s.name,
          type: getFormType(s),
          headerInfo: getRequestHeaderInfo(s),
          maxDays,
          maxHours,
          availableStartDate: detail.annual_leave_available_start_date,
          availableEndDate: detail.annual_leave_available_end_date,
          maxLeaveSplits: detail.key === 'annual_leave' ? detail.max_leave_splits : undefined,
          annualLeaveSplits: detail.key === 'annual_leave' ? detail.annual_leave_splits : undefined,
          settingType: s.type,
          settingKey: detail.key ?? undefined,
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

interface Decree {
  id: number;
  status: string;
  description: string | null;
}

interface EmployeeRequest {
  id: number;
  employee_request_setting_id: number;
  status: 'pending' | 'senior_pending' | 'review_pending' | 'approved' | 'rejected' | 'read' | 'decree';
  review_by_type: ReviewerType;
  review_detail: ReviewDetail | null;
  decision_by_type: ReviewerType;
  decision_detail: ReviewDetail | null;
  created_at: string | null;
  setting: {
    id: number;
    name: string;
  };
  decree?: Decree | null;
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
  review_pending: { label: 'Хүлээгдэж байна', color: 'text-yellow' },
  approved: { label: 'Зөвшөөрсөн', color: 'text-green' },
  rejected: { label: 'Татгалзсан', color: 'text-red' },
  read: { label: 'Уншиж танилцсан', color: 'text-darkercyan' },
};

function getDecisionLabel(type: ReviewerType): string | null {
  if (type?.includes('Employee')) return 'Ахлах';
  if (type?.includes('User')) return 'Админ';
  return null;
}

function getReviewLabel(type: ReviewerType): string | null {
  if (type?.includes('Employee')) return 'Ахлахын санал';
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
  const [refreshingSettings, setRefreshingSettings] = useState(false);
  const currentPage = useRef(1);
  const lastPage = useRef(1);
  const isFetching = useRef(false);
  const hasEmployeeRequestNotification = useNotificationStore((s) => s.employee_request.length > 0);

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

  const fetchSettings = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshingSettings(true);
    api<ApiResponse>({
      path: '/employee-request/settings',
      method: 'GET',
    }).then((res) => {
      if (res.status === 200) {
        setCategories(mapApiToCategories(res.data));
      } else {
        console.log(res.message);
      }
    }).catch(console.error)
      .finally(() => {
        if (isRefresh) setRefreshingSettings(false);
      });
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (activeTab === 1) {
      fetchRequests(1);
      useNotificationStore.getState().clear('employee_request');
    }
  }, [activeTab, fetchRequests]);

  // Load fresh data every time the screen regains focus. The mount effects above
  // cover the very first entry, so the first focus is skipped; later re-entries
  // silently refetch the settings and (when on the list tab) the request list in
  // the background. A pending refresh flag from the detail screen (e.g. after a
  // request was cancelled) forces the list tab and a visible refresh instead.
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const skipFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (useRequestRefreshStore.getState().shouldRefresh) {
        useRequestRefreshStore.getState().clearRefresh();
        setActiveTab(1);
        // Silent (page-1, non-refresh) so the list updates without a
        // programmatic RefreshControl spinner, which can stick on iOS when
        // returning from the detail screen and the list isn't at the top.
        fetchRequests(1);
        return;
      }
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      fetchSettings();
      if (activeTabRef.current === 1) fetchRequests(1);
    }, [fetchRequests, fetchSettings])
  );

  const handleEndReached = useCallback(() => {
    if (currentPage.current < lastPage.current) {
      fetchRequests(currentPage.current + 1);
    }
  }, [fetchRequests]);

  const handleRefresh = useCallback(() => {
    fetchRequests(1, true);
  }, [fetchRequests]);

  const handleItemPress = (item: RequestItem) => {
    const pathname =
      item.type === 'annualLeave'
        ? '/request/annual-leave'
        : item.type === 'compensatory'
          ? '/request/compensatory'
          : '/request/create';
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
        ...(item.maxLeaveSplits != null && { maxLeaveSplits: String(item.maxLeaveSplits) }),
        ...(item.annualLeaveSplits?.length && {
          annualLeaveSplits: JSON.stringify(item.annualLeaveSplits),
        }),
        ...(item.settingType && { settingType: item.settingType }),
        ...(item.settingKey && { settingKey: item.settingKey }),
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
              <View className="relative">
                <AppText className={`text-base ${activeTab === 1 ? 'font-medium text-black' : 'text-darkgray/50'}`}>
                  Шийдвэр
                </AppText>
                {hasEmployeeRequestNotification && (
                  <View className="absolute top-0 -right-3 w-2 h-2 rounded-full bg-orange" />
                )}
              </View>
            }
          />
        </View>

        {activeTab === 0 ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="pb-15"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshingSettings}
                onRefresh={() => fetchSettings(true)}
              />
            }
          >
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
                        <AppText className="text-base font-medium" numberOfLines={1}>{item.label}</AppText>
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
            contentContainerClassName="pb-15"
            data={employeeRequests}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ItemSeparatorComponent={() => <Separator className="bg-darkgray/20" />}
            ListEmptyComponent={
              <View className="items-center justify-center pt-5">
                <AppText className="text-sm text-darkgray">Та одоогоор өргөдөл хүсэлт илгээгээгүй байна</AppText>
              </View>
            }
            ListFooterComponent={loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : null}
            renderItem={({ item: employeeRequest }) => {
              // When a request has reached the decree stage, surface the decree's own
              // status (pending/approved/rejected) instead of the raw "decree" value,
              // reusing the same labels/colors as the request statuses.
              const effectiveStatus =
                employeeRequest.status === 'decree'
                  ? employeeRequest.decree?.status ?? employeeRequest.status
                  : employeeRequest.status;
              const status = statusMap[effectiveStatus] ?? { label: effectiveStatus, color: 'text-darkgray' };
              // At the decree stage the admin's decision text lives on the decree
              // (decree.description), not on decision_detail; label it as the admin.
              const isDecree = employeeRequest.status === 'decree';
              const decisionComment = isDecree
                ? employeeRequest.decree?.description ?? null
                : employeeRequest.decision_detail?.comment ?? null;
              const decisionLabel = isDecree
                ? 'Админ'
                : getDecisionLabel(employeeRequest.decision_by_type) ?? 'Шийдвэр';
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
                    <AppText className={`text-base font-normal ${status.color}`}>
                      {status.label}
                    </AppText>
                    {employeeRequest.created_at && (
                      <AppText className="text-base text-darkgray/50">
                        {dayjs(employeeRequest.created_at).format('MM/DD  HH:mm')}
                      </AppText>
                    )}
                  </View>
                  {employeeRequest.review_detail?.comment && (
                    <>
                      <AppText className="text-base text-darkgray mt-1">
                        {getReviewLabel(employeeRequest.review_by_type) ?? 'Санал'}
                      </AppText>
                      <AppText className="text-base mt-0.5 mb-2" numberOfLines={3}>{employeeRequest.review_detail.comment}</AppText>
                    </>
                  )}
                  {decisionComment && (
                    <>
                      <AppText className="text-base text-darkgray mt-1">
                        {decisionLabel}
                      </AppText>
                      <AppText className="text-base mt-0.5" numberOfLines={3}>{decisionComment}</AppText>
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