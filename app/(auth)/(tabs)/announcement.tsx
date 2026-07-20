import { AppAttachmentList } from "@/components/app-attachment-list";
import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { api } from "@/config/api";
import { useNotificationStore } from "@/store/notification-store";
import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";
import { Separator } from 'heroui-native';
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

type AnnouncementType = 'info' | 'warning';

type AnnouncementSource =
  | 'announcement'
  | 'senior_app'
  | 'decree'
  | 'employee_note'
  | 'salary_warning'
  | 'time_sheet_plan'
  | 'deduction';

interface AnnouncementAttachment {
  name?: string;
  path: string;
  url: string;
}

interface AnnouncementTargets {
  branch_ids: number[];
  all_employee: boolean;
  department_ids: number[];
  job_position_ids: number[];
}

interface AnnouncementCreator {
  id: number;
  name: string;
}

interface Announcement {
  id: number;
  company_id: number;
  title: string;
  content: string;
  attachments: AnnouncementAttachment[];
  type: AnnouncementType;
  source: AnnouncementSource;
  targets: AnnouncementTargets;
  employees_count: number;
  department_names: string[];
  branch_names: string[];
  job_position_names: string[];
  creator: AnnouncementCreator;
  created_at?: string;
}

interface PaginatedResponse {
  current_page: number;
  data: Announcement[];
  last_page: number;
  total: number;
}

const PERSONAL_SOURCES: AnnouncementSource[] = ['employee_note', 'salary_warning', 'time_sheet_plan', 'deduction'];

function getTargetLabel(item: Announcement): string {
  if (PERSONAL_SOURCES.includes(item.source)) {
    return item.creator.name;
  }

  if (item.targets.all_employee) {
    return 'Нийт ажилчид';
  }

  if (item.department_names?.length) {
    return item.department_names.length === 1
      ? item.department_names[0]
      : `${item.department_names.length} алба хэлтэс`;
  }
  if (item.job_position_names?.length) {
    return item.job_position_names.length === 1
      ? item.job_position_names[0]
      : `${item.job_position_names.length} албан тушаал`;
  }

  if (item.branch_names?.length) {
    return item.branch_names.length === 1
      ? item.branch_names[0]
      : `${item.branch_names.length} салбар`;
  }

  return `${item.employees_count} ажилтан`;
}

export default function AnnouncementScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const currentPage = useRef(1);
  const lastPage = useRef(1);
  const isFetching = useRef(false);

  const fetchPage = useCallback((page: number, isRefresh = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    currentPage.current = page;

    const isFirstPage = page === 1;
    if (isRefresh) setRefreshing(true);
    else if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    api<PaginatedResponse>({
      path: `/announcements?current_page=${page}`,
      method: 'GET',
    }).then((res) => {
      if (res.status === 200) {
        setAnnouncements((prev) => isFirstPage ? res.data.data : [...prev, ...res.data.data]);
        lastPage.current = res.data.last_page;
      }
    }).catch(console.error)
      .finally(() => {
        isFetching.current = false;
        if (isRefresh) setRefreshing(false);
        else if (isFirstPage) setLoading(false);
        else setLoadingMore(false);
      });
  }, []);

  const handleRefresh = useCallback(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  useFocusEffect(
    useCallback(() => {
      fetchPage(1);
      useNotificationStore.getState().clear('announcement');
    }, [fetchPage])
  );

  const handleEndReached = useCallback(() => {
    if (currentPage.current < lastPage.current) {
      fetchPage(currentPage.current + 1);
    }
  }, [fetchPage]);

  const renderItem = useCallback(({ item }: { item: Announcement }) => {
    const createdAt = item.created_at ? dayjs(item.created_at) : null;
    const dateStr = createdAt ? createdAt.format('MM/DD  HH:mm') : '';
    const isTodayItem = createdAt ? createdAt.isToday() : false;
    const dateStyle = `text-base ${isTodayItem ? 'text-blue font-medium' : 'text-darkgray'}`;

    return (
      <View className="py-5">
        <AppText className={`text-base font-medium ${item.type === 'warning' ? 'text-red' : ''}`}>{item.title}</AppText>
        <AppText className="text-base mt-2.5">{item.content}</AppText>
        <View className="flex-row items-center justify-between mt-3 gap-3">
          <AppText className={dateStyle}>{dateStr}</AppText>
          <AppText className={dateStyle}>
            {getTargetLabel(item)}
          </AppText>
        </View>
        <AppAttachmentList attachments={item.attachments} className="mt-5" />
      </View>
    );
  }, []);

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <AppHeader title="Зарлал мэдээлэл" className="mb-0" />
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={announcements}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ItemSeparatorComponent={() => <Separator className="bg-darkgray/20 h-px" />}
            contentContainerStyle={announcements.length === 0 ? { flexGrow: 1 } : undefined}
            ListEmptyComponent={
              <View className="flex-1 pt-5">
                <AppText className="text-sm text-darkgray">Одоогоор зарлал мэдээлэл ирээгүй байна</AppText>
              </View>
            }
            ListFooterComponent={loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : null}
          />
        )}
      </View>
    </StyledSafeAreaView>
  );
}
