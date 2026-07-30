import { AppAttachmentList } from "@/components/app-attachment-list";
import { AppIcon } from "@/components/app-icon";
import { AppSelect, SelectOption } from "@/components/app-select";
import { AppText } from "@/components/app-text";
import { AppTextField } from "@/components/app-text-field";
import {
  avatarFallback,
  fullName,
  monthKey,
  MonthlySummary,
  nameWithInitial,
  useSeniorContentPad,
  WEEKDAYS_FULL,
} from "@/components/senior/shared";
import { api } from "@/config/api";
import { ScrollHandler } from "@/hooks/use-hide-tab-bar";
import { Search01Icon } from "@hugeicons-pro/core-stroke-standard";
import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";
import { Avatar, Separator } from "heroui-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";
import ActionSheet, { ActionSheetRef, ScrollView as SheetScrollView } from "react-native-actions-sheet";

function formatAnnouncementDate(iso: string | null): string {
  if (!iso) return "";
  const d = dayjs(iso);
  return `${d.format("DD")} / ${WEEKDAYS_FULL[d.day()]}  ${d.format("HH:mm")}`;
}

interface AnnouncementAttachment {
  name?: string;
  path: string;
  url: string;
}

interface AnnouncementEmployee {
  id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  last_assignment: {
    job_position?: { id: number; name: string } | null;
  } | null;
}

interface SeniorAnnouncement {
  id: number;
  title: string;
  content: string;
  attachments: AnnouncementAttachment[];
  type: "info" | "warning";
  created_at: string | null;
  employees_count: number;
  employees: AnnouncementEmployee[];
}

interface AnnouncementsResponse {
  current_page: number;
  data: SeniorAnnouncement[];
  last_page: number;
  total: number;
}

export function SeniorAnnouncements({ onScroll }: { onScroll?: ScrollHandler }) {
  const contentPad = useSeniorContentPad();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<SelectOption | null>(null);
  const [announcements, setAnnouncements] = useState<SeniorAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const currentPage = useRef(1);
  const lastPage = useRef(1);
  const isFetching = useRef(false);

  const { height: windowHeight } = useWindowDimensions();
  // Recipients of the announcement whose "Илгээсэн N" was tapped (null = closed).
  const [sentEmployees, setSentEmployees] = useState<AnnouncementEmployee[] | null>(null);
  // react-native-actions-sheet — контентоор auto-size. Imperative ref-ээр удирдана.
  const sentSheetRef = useRef<ActionSheetRef>(null);
  useEffect(() => {
    if (sentEmployees) sentSheetRef.current?.show();
    else sentSheetRef.current?.hide();
  }, [sentEmployees]);

  const monthOptions = useMemo<SelectOption[]>(
    () =>
      summaries.map((s) => ({
        value: monthKey(s.year, s.month),
        label: `${s.year} / ${String(s.month).padStart(2, "0")}`,
      })),
    [summaries]
  );

  const selectedSummary = useMemo(
    () =>
      selectedMonth
        ? summaries.find((s) => monthKey(s.year, s.month) === selectedMonth.value) ?? null
        : null,
    [summaries, selectedMonth]
  );

  const month = selectedSummary?.month ?? dayjs().month() + 1;

  useFocusEffect(
    useCallback(() => {
      api<MonthlySummary[]>({
        path: "/senior/announcements/monthly-summary",
        method: "GET",
      })
        .then((res) => {
          if (res.status === 200 && Array.isArray(res.data)) {
            setSummaries(res.data);
            if (res.data.length === 0) {
              setLoading(false);
              setSelectedMonth(null);
            }
          }
        })
        .catch(console.error);
    }, [])
  );

  useEffect(() => {
    if (!selectedMonth && summaries.length > 0) {
      const first = summaries[0];
      setSelectedMonth({
        value: monthKey(first.year, first.month),
        label: `${first.year} / ${String(first.month).padStart(2, "0")}`,
      });
    }
  }, [summaries, selectedMonth]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 500);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    (page: number, y: number, m: number, searchTerm: string, isRefresh = false) => {
      if (isFetching.current) return;
      isFetching.current = true;
      currentPage.current = page;

      const isFirstPage = page === 1;
      if (isRefresh) setRefreshing(true);
      else if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      const params = [`current_page=${page}`, `year=${y}`, `month=${m}`];
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);

      api<AnnouncementsResponse>({
        path: `/senior/announcements?${params.join("&")}`,
        method: "GET",
      })
        .then((res) => {
          if (res.status === 200 && res.data) {
            setAnnouncements((prev) =>
              isFirstPage ? res.data.data : [...prev, ...res.data.data]
            );
            lastPage.current = res.data.last_page;
          }
        })
        .catch(console.error)
        .finally(() => {
          isFetching.current = false;
          if (isRefresh) setRefreshing(false);
          else if (isFirstPage) setLoading(false);
          else setLoadingMore(false);
        });
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      if (!selectedSummary) return;
      fetchPage(1, selectedSummary.year, selectedSummary.month, debouncedSearch);
    }, [fetchPage, selectedSummary, debouncedSearch])
  );

  const handleRefresh = useCallback(() => {
    if (!selectedSummary) return;
    fetchPage(1, selectedSummary.year, selectedSummary.month, debouncedSearch, true);
  }, [fetchPage, selectedSummary, debouncedSearch]);

  const handleEndReached = useCallback(() => {
    if (!selectedSummary) return;
    if (currentPage.current < lastPage.current) {
      fetchPage(currentPage.current + 1, selectedSummary.year, selectedSummary.month, debouncedSearch);
    }
  }, [fetchPage, selectedSummary, debouncedSearch]);

  const renderItem = useCallback(({ item }: { item: SeniorAnnouncement }) => {
    const dateStr = formatAnnouncementDate(item.created_at);
    return (
      <View className="py-5">
        <AppText
          className={`text-base font-medium ${item.type === "warning" ? "text-red" : "text-black"}`}
        >
          {item.title}
        </AppText>
        <AppText className="text-base text-black mt-2.5">{item.content}</AppText>
        <View className="flex-row items-center justify-between mt-3 gap-3">
          {dateStr ? (
            <AppText className="text-sm text-darkgray">{dateStr}</AppText>
          ) : (
            <View />
          )}
          <Pressable
            onPress={() => {
              if (item.employees?.length) setSentEmployees(item.employees);
            }}
          >
            <AppText className="text-sm text-blue">Илгээсэн {item.employees_count}</AppText>
          </Pressable>
        </View>
        <AppAttachmentList attachments={item.attachments} className="mt-4" />
      </View>
    );
  }, []);

  return (
    <>
      <View className="flex-row items-center gap-3 mb-3">
        <View className="flex-[2]">
          <AppTextField
            placeholder="Гарчгаар хайх"
            leftIcon={<AppIcon icon={Search01Icon} color="#222222" size={20} />}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View className="flex-1">
          <AppSelect
            title="Илгээсэн зарлал, мэдээлэл"
            options={monthOptions}
            value={selectedMonth ?? undefined}
            onValueChange={(opt) => opt && setSelectedMonth(opt)}
            placeholder={`${String(month).padStart(2, "0")} сар`}
            renderValue={(opt) => (
              <AppText className="text-base">{opt.value.split("-")[1]} сар</AppText>
            )}
          />
        </View>
      </View>

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
          onScroll={onScroll}
          scrollEventThrottle={16}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ paddingBottom: contentPad }}
          ItemSeparatorComponent={() => <Separator className="bg-darkgray/20" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <AppText className="text-sm text-darkgray">Зарлал оруулаагүй байна</AppText>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}

      {/* Илгээсэн ажилтан — announcement recipients */}
      <ActionSheet
        ref={sentSheetRef}
        gestureEnabled
        indicatorStyle={{ width: 0, height: 0, marginVertical: 0 }}
        containerStyle={{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
        onClose={() => setSentEmployees(null)}
      >
        <View className="px-4 py-5">
          <AppText className="text-lg font-medium text-center">Илгээсэн ажилтан</AppText>
        </View>

        <SheetScrollView
          style={{ maxHeight: windowHeight * 0.7 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {(sentEmployees ?? []).map((emp) => (
                <View key={emp.id} className="flex-row items-center gap-2 h-16">
                  <Avatar alt={fullName(emp)} className="w-[52px] h-[52px]">
                    <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                    <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                      {avatarFallback(emp)}
                    </Avatar.Fallback>
                  </Avatar>
                  <View className="flex-1">
                    <AppText className="text-base font-medium text-black" numberOfLines={1}>
                      {nameWithInitial(emp)}
                    </AppText>
                    {emp.last_assignment?.job_position?.name ? (
                      <AppText className="text-sm text-darkgray mt-0.5" numberOfLines={1}>
                        {emp.last_assignment.job_position.name}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              ))}
        </SheetScrollView>
      </ActionSheet>
    </>
  );
}
