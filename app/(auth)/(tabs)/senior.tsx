import { AppAttachmentList } from "@/components/app-attachment-list";
import { AppButton } from "@/components/app-button";
import { AppDialog } from "@/components/app-dialog";
import { AppHeader } from "@/components/app-header";
import { AppSelect, SelectOption } from "@/components/app-select";
import { AppText } from "@/components/app-text";
import { AppTextField } from "@/components/app-text-field";
import { AppToast } from "@/components/app-toast";
import { SeniorMenuBar, SeniorMenuKey } from "@/components/senior-menu-bar";
import { api } from "@/config/api";
import {
  ScrollHandler,
  TAB_BAR_BASE_HEIGHT,
  tabBarHidden,
  useHideTabBarOnScroll,
} from "@/hooks/use-hide-tab-bar";
import { useNotificationStore } from "@/store/notification-store";
import { BottomSheetScrollView, type BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
import {
  Alert01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  MinusSignIcon,
  PlusSignIcon,
  Search01Icon,
  SquareLock02Icon,
  SquareUnlock02Icon,
  Task01Icon,
  Tick02Icon,
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useIsFocused } from "@react-navigation/native";
import dayjs from "dayjs";
import { useFocusEffect, useRouter } from "expo-router";
import { Avatar, BottomSheet, cn, Portal, Separator, useToast } from "heroui-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

type ReviewerType = string | null;

interface ReviewDetail {
  comment: string | null;
  reviewed_at?: string | null;
  decided_at?: string | null;
}

interface AssignedEmployee {
  id: number;
  last_name?: string | null;
  first_name?: string | null;
  profile_image_url?: string | null;
}

interface AssignedRequest {
  id: number;
  status: "pending" | "senior_pending" | "review_pending" | "approved" | "rejected";
  review_by_type: ReviewerType;
  review_detail: ReviewDetail | null;
  decision_by_type: ReviewerType;
  decision_detail: ReviewDetail | null;
  created_at: string | null;
  setting: { id: number; name: string };
  employee: AssignedEmployee;
}

interface PaginatedResponse {
  current_page: number;
  data: AssignedRequest[];
  last_page: number;
  total: number;
}

interface MonthlySummary {
  year: number;
  month: number;
  label: string;
  count: number;
}

const FILTER_OPTIONS: SelectOption[] = [
  { value: "all", label: "Бүгд" },
  { value: "pending", label: "Хүлээгдэж байгаа" },
  { value: "reviewed", label: "Санал өгсөн" },
  { value: "approved", label: "Зөвшөөрсөн" },
  { value: "rejected", label: "Татгалзасан" },
];

const STATUS_QUERY: Record<string, string[]> = {
  all: [],
  pending: ["pending"],
  reviewed: ["reviewed"],
  approved: ["approved"],
  rejected: ["rejected"],
};

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function fullName(emp: { first_name?: string | null; last_name?: string | null }): string {
  const parts = [emp.last_name, emp.first_name].filter(Boolean) as string[];
  return parts.join(" ");
}

function avatarFallback(emp: { first_name?: string | null; last_name?: string | null }): string {
  return ((emp.last_name?.[0] ?? "") + (emp.first_name?.[0] ?? "")) || "?";
}

function shortName(emp: { first_name?: string | null; last_name?: string | null }): string {
  const initial = emp.last_name?.[0];
  return initial ? `${initial}.${emp.first_name ?? ""}` : emp.first_name ?? "";
}

function nameWithInitial(emp: { first_name?: string | null; last_name?: string | null }): string {
  const initial = emp.last_name?.[0];
  return initial ? `${emp.first_name ?? ""}.${initial}` : emp.first_name ?? "";
}

const MENU_TITLES: Record<SeniorMenuKey, string> = {
  request: "Өргөдөл хүсэлт",
  announcement: "Зарлал, мэдээлэл",
  performance: "Гүйцэтгэл",
  schedule: "Хуваарь",
  leave: "Ээлжийн амралт",
};

// --- Senior Announcements ---

// Day-of-week index (0 = Sunday) → full Mongolian weekday name. The app has no
// dayjs Mongolian locale, so weekday names are mapped manually (cf. shift-swap).
const WEEKDAYS_FULL = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

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

interface SeniorAnnouncement {
  id: number;
  title: string;
  content: string;
  attachments: AnnouncementAttachment[];
  type: "info" | "warning";
  created_at: string | null;
  employees_count: number;
}

interface AnnouncementsResponse {
  current_page: number;
  data: SeniorAnnouncement[];
  last_page: number;
  total: number;
}

function SeniorAnnouncements({ onScroll }: { onScroll?: ScrollHandler }) {
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

  const monthOptions = useMemo<SelectOption[]>(
    () =>
      summaries.map((s) => ({
        value: monthKey(s.year, s.month),
        label: `${s.year}/${String(s.month).padStart(2, "0")}`,
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
        label: `${first.year}/${String(first.month).padStart(2, "0")}`,
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
          className={`text-base font-medium ${item.type === "warning" ? "text-red" : ""}`}
        >
          {item.title}
        </AppText>
        <AppText className="text-sm mt-2">{item.content}</AppText>
        <View className="flex-row items-center justify-between mt-3 gap-3">
          {dateStr ? (
            <AppText className="text-sm text-darkgray">{dateStr}</AppText>
          ) : (
            <View />
          )}
          <AppText className="text-sm text-blue">Илгээсэн {item.employees_count}</AppText>
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
            leftIcon={<HugeiconsIcon icon={Search01Icon} color="#222222" size={20} />}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View className="flex-1">
          <AppSelect
            title="Сар сонгох"
            options={monthOptions}
            value={selectedMonth ?? undefined}
            onValueChange={(opt) => opt && setSelectedMonth(opt)}
            placeholder={`${String(month).padStart(2, "0")} сар`}
            renderValue={(opt) => (
              <AppText className="text-sm">{opt.value.split("-")[1]} сар</AppText>
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
          contentContainerStyle={{ paddingBottom: 88 }}
          ItemSeparatorComponent={() => <Separator className="bg-darkgray/12" />}
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
    </>
  );
}

// --- Senior Performance ---

interface SalaryPerfMonth {
  year: number;
  month: number;
  label: string;
}

interface SalaryPerfNote {
  id?: number;
  content: string;
  type?: string;
  creator_name?: string | null;
  created_at?: string | null;
}

interface SalaryPerfItem {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  job_position_name?: string | null;
  profile_image_url?: string | null;
  performance_percent: number;
  status: string;
  notes?: SalaryPerfNote[];
}

interface SalaryPerfResponse {
  salary_date: string | null;
  months: SalaryPerfMonth[];
  list: SalaryPerfItem[];
}

const PERF_STEP = 5;

interface DeadlineInfo {
  label: string;
  urgent: boolean;
}

function SeniorPerformance({
  onScroll,
  onDeadlineChange,
}: {
  onScroll?: ScrollHandler;
  onDeadlineChange?: (info: DeadlineInfo | null) => void;
}) {
  const [months, setMonths] = useState<SalaryPerfMonth[]>([]);
  const [items, setItems] = useState<SalaryPerfItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<SelectOption | null>(null);
  const [salaryDate, setSalaryDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [noteFor, setNoteFor] = useState<SalaryPerfItem | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const isFetching = useRef(false);
  const loadedMonth = useRef<string | null>(null);

  const monthOptions = useMemo<SelectOption[]>(
    () =>
      months.map((m) => ({
        value: monthKey(m.year, m.month),
        label: `${m.year}/${String(m.month).padStart(2, "0")}`,
      })),
    [months]
  );

  const selectedSummary = useMemo(
    () =>
      selectedMonth
        ? months.find((m) => monthKey(m.year, m.month) === selectedMonth.value) ?? null
        : null,
    [months, selectedMonth]
  );

  const month = selectedSummary?.month ?? dayjs().month() + 1;

  const isCurrentMonth = useMemo(
    () =>
      !!selectedMonth &&
      months.length > 0 &&
      selectedMonth.value === monthKey(months[0].year, months[0].month),
    [selectedMonth, months]
  );

  const deadlineUrgent = useMemo(
    () => !!salaryDate && dayjs(salaryDate).diff(dayjs().startOf("day"), "day") <= 7,
    [salaryDate]
  );

  // Surface the salary-evaluation deadline to the parent so it renders in the
  // screen header (top-right), per design — shown only for the current month.
  useEffect(() => {
    if (isCurrentMonth && salaryDate) {
      onDeadlineChange?.({
        label: `Үнэлж дуусах огноо ${dayjs(salaryDate).format("MM/DD")}`,
        urgent: deadlineUrgent,
      });
    } else {
      onDeadlineChange?.(null);
    }
  }, [isCurrentMonth, salaryDate, deadlineUrgent, onDeadlineChange]);

  // Clear the header deadline when this section unmounts (tab switched away).
  useEffect(() => () => onDeadlineChange?.(null), [onDeadlineChange]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => fullName(it).toLowerCase().includes(q));
  }, [items, search]);

  const fetchData = useCallback((month?: SalaryPerfMonth | null, isRefresh = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const path =
      "/senior/salary-performance" +
      (month ? `?year=${month.year}&month=${month.month}` : "");

    api<SalaryPerfResponse>({ path, method: "GET" })
      .then((res) => {
        if (res.status === 200 && res.data) {
          const d = res.data;
          setItems(d.list ?? []);
          setSalaryDate(d.salary_date ?? null);
          if (d.months?.length) {
            setMonths(d.months);
            loadedMonth.current = month
              ? monthKey(month.year, month.month)
              : monthKey(d.months[0].year, d.months[0].month);
            setSelectedMonth((prev) =>
              prev ?? {
                value: monthKey(d.months[0].year, d.months[0].month),
                label: `${d.months[0].year}/${String(d.months[0].month).padStart(2, "0")}`,
              }
            );
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        isFetching.current = false;
        setRefreshing(false);
        setLoading(false);
      });
  }, []);

  // Reload the currently selected month when the tab regains focus.
  const selectedSummaryRef = useRef<SalaryPerfMonth | null>(selectedSummary);
  selectedSummaryRef.current = selectedSummary;

  useFocusEffect(
    useCallback(() => {
      fetchData(selectedSummaryRef.current);
    }, [fetchData])
  );

  // Refetch when the user picks a different month from the selector.
  useEffect(() => {
    if (!selectedMonth || !selectedSummary) return;
    if (selectedMonth.value === loadedMonth.current) return;
    fetchData(selectedSummary);
  }, [selectedMonth, selectedSummary, fetchData]);

  const adjust = useCallback((id: number, delta: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.status === "draft"
          ? {
              ...it,
              performance_percent: Math.min(
                100,
                Math.max(0, it.performance_percent + delta)
              ),
            }
          : it
      )
    );
  }, []);

  const approve = useCallback((item: SalaryPerfItem) => {
    api({
      path: `/senior/salary-performance/${item.id}/approve`,
      method: "POST",
      data: { performance_percent: item.performance_percent },
    })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: "approved" } : it
            )
          );
        }
      })
      .catch(console.error);
  }, []);

  const cancel = useCallback((item: SalaryPerfItem) => {
    api({
      path: `/senior/salary-performance/${item.id}/cancel`,
      method: "POST",
    })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: "draft" } : it
            )
          );
        }
      })
      .catch(console.error);
  }, []);

  const openNote = useCallback((item: SalaryPerfItem) => {
    setNoteFor(item);
    setNoteDraft("");
  }, []);

  const saveNote = useCallback(() => {
    if (!noteFor) return;
    const content = noteDraft.trim();
    if (!content || savingNote) return;
    setSavingNote(true);
    api({
      path: `/senior/salary-performance/${noteFor.id}/note`,
      method: "POST",
      data: { content },
    })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          setNoteFor(null);
          fetchData(selectedSummaryRef.current, true);
        }
      })
      .catch(console.error)
      .finally(() => setSavingNote(false));
  }, [noteFor, noteDraft, savingNote, fetchData]);

  const renderItem = useCallback(
    ({ item }: { item: SalaryPerfItem }) => {
      const locked = item.status !== "draft";
      const hasNote = (item.notes?.length ?? 0) > 0;
      if (!isCurrentMonth) {
        return (
          <View className="flex-row items-center gap-3 py-4">
            <Avatar alt={fullName(item)} className="w-10 h-10">
              <Avatar.Image source={{ uri: item.profile_image_url ?? "" }} />
              <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                {avatarFallback(item)}
              </Avatar.Fallback>
            </Avatar>
            <View className="flex-1">
              <AppText className="text-sm font-normal" numberOfLines={1}>
                {nameWithInitial(item)}
              </AppText>
              <AppText className="text-sm text-darkgray mt-0.5" numberOfLines={1}>
                {item.job_position_name}
              </AppText>
            </View>
            <AppText className="text-base font-medium text-green">
              {item.performance_percent}%
            </AppText>
          </View>
        );
      }
      return (
        <View className="py-4">
          <View className="flex-row items-center gap-3 mb-3">
            <Avatar alt={fullName(item)} className="w-10 h-10">
              <Avatar.Image source={{ uri: item.profile_image_url ?? "" }} />
              <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                {avatarFallback(item)}
              </Avatar.Fallback>
            </Avatar>
            <View className="flex-1">
              <AppText className="text-sm font-normal" numberOfLines={1}>
                {nameWithInitial(item)}
              </AppText>
              <AppText className="text-sm text-darkgray mt-0.5" numberOfLines={1}>
                {item.job_position_name}
              </AppText>
            </View>
          </View>

          <View className="flex-row items-center gap-[15px]">
            {locked ? (
              <View className="flex-1 h-12 items-center justify-center rounded-xl bg-green/10">
                <AppText className="text-base font-normal text-green">
                  {item.performance_percent} %
                </AppText>
              </View>
            ) : (
              <View className="flex-1 flex-row items-center h-12 rounded-xl bg-darkgray/5">
                <Pressable
                  className="w-12 h-full items-center justify-center"
                  hitSlop={4}
                  onPress={() => adjust(item.id, -PERF_STEP)}
                >
                  <HugeiconsIcon icon={MinusSignIcon} color="#222222" size={20} />
                </Pressable>
                <AppText className="flex-1 text-center text-base font-normal">
                  {item.performance_percent} %
                </AppText>
                <Pressable
                  className="w-12 h-full items-center justify-center"
                  hitSlop={4}
                  onPress={() => adjust(item.id, PERF_STEP)}
                >
                  <HugeiconsIcon icon={PlusSignIcon} color="#222222" size={20} />
                </Pressable>
              </View>
            )}

            <Pressable
              className="w-12 h-12 rounded-full border border-darkgray/30 items-center justify-center"
              hitSlop={4}
              onPress={() => openNote(item)}
            >
              <HugeiconsIcon
                icon={Task01Icon}
                color={hasNote ? "#F0B400" : "#6A6A6A"}
                size={20}
              />
            </Pressable>

            {locked ? (
              <Pressable
                className="w-12 h-12 rounded-full border border-darkgray/30 items-center justify-center"
                hitSlop={4}
                onPress={() => cancel(item)}
              >
                <HugeiconsIcon icon={SquareLock02Icon} color="#18AA0B" size={20} />
              </Pressable>
            ) : (
              <Pressable
                className="w-12 h-12 rounded-full border border-darkgray/30 items-center justify-center"
                hitSlop={4}
                onPress={() => approve(item)}
              >
                <HugeiconsIcon icon={SquareUnlock02Icon} color="#222222" size={20} />
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [adjust, approve, cancel, openNote, isCurrentMonth]
  );

  return (
    <>
      <View className="flex-row items-center gap-3 mb-3">
        <View className="flex-[2]">
          <AppTextField
            placeholder="Ажилтнаар хайх"
            leftIcon={<HugeiconsIcon icon={Search01Icon} color="#222222" size={20} />}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View className="flex-1">
          <AppSelect
            title="Сар сонгох"
            options={monthOptions}
            value={selectedMonth ?? undefined}
            onValueChange={(opt) => opt && setSelectedMonth(opt)}
            placeholder={`${String(month).padStart(2, "0")} сар`}
            renderValue={(opt) => (
              <AppText className="text-sm">{opt.value.split("-")[1]} сар</AppText>
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
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 88 }}
          ItemSeparatorComponent={() => <Separator className="bg-darkgray/12" />}
          refreshing={refreshing}
          onRefresh={() => fetchData(selectedSummary, true)}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <AppText className="text-sm text-darkgray">Өгөгдөл байхгүй байна</AppText>
            </View>
          }
        />
      )}

      <AppDialog isOpen={noteFor !== null} onOpenChange={(open) => !open && setNoteFor(null)}>
        <View className="mb-4 gap-1.5">
          <AppDialog.Title>Тэмдэглэл</AppDialog.Title>
        </View>
        {noteFor?.notes?.length ? (
          <ScrollView
            className="max-h-48 mb-4"
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-2">
              {noteFor.notes.map((note, i) => (
                <View key={note.id ?? i} className="bg-darkgray/5 rounded-lg px-3 py-2">
                  <AppText className="text-sm">{note.content}</AppText>
                  <View className="flex-row items-center justify-between mt-1 gap-3">
                    {note.creator_name ? (
                      <AppText className="text-xs text-darkgray" numberOfLines={1}>
                        {note.creator_name}
                      </AppText>
                    ) : (
                      <View />
                    )}
                    {note.created_at ? (
                      <AppText className="text-xs text-darkgray">
                        {dayjs(note.created_at).format("YYYY/MM/DD HH:mm")}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : null}
        <AppTextField
          isTextArea
          placeholder="Тэмдэглэл бичих"
          value={noteDraft}
          onChangeText={setNoteDraft}
        />
        <AppDialog.Button
          label="Хадгалах"
          className="mt-4"
          isDisabled={noteDraft.trim() === "" || savingNote}
          onPress={saveNote}
        />
      </AppDialog>
    </>
  );
}

// --- Senior Schedule ---

const WEEKDAYS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

interface ShiftRequestSetting {
  id: number;
  name: string;
  has_salary: boolean;
}

interface ScheduleEmployee {
  id: number;
  timesheet_id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  job_position: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  lateness_minutes: number;
  planned_work_duration_minutes: number | null;
  worked_duration_minutes: number | null;
  employee_request_setting: ShiftRequestSetting | null;
}

interface ScheduleShift {
  shift_index: number;
  name: string;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  employees: ScheduleEmployee[];
}

interface NonWorkingEmployee {
  id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  job_position: string | null;
}

interface RosterTemplate {
  id: number;
  name: string;
}

interface ScheduleResponse {
  date: string;
  selected_roster: number | null;
  is_public_holiday: boolean;
  roster_templates: RosterTemplate[];
  shifts: ScheduleShift[];
  non_working: NonWorkingEmployee[];
}

interface SummaryDay {
  day: number;
  planned: number;
  actual: number;
}

interface ShiftEmployee {
  id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  job_position: string | null;
  roster_template: { id: number; name: string } | null;
}

function fmtHm(s: string | null): string {
  return s ? dayjs(s).format("HH:mm") : "—";
}

// --- Attendance summary (Хоцролт / Таслалт / Зайнаас / Ам-чөлөө) ---

interface AttendanceTotals {
  lateness_minutes: number;
  absent_count: number;
  remote_minutes: number;
  leave_minutes: number;
}

interface AttendanceEmployee {
  employee_id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  lateness_minutes: number;
  absent_count: number;
  remote_minutes: number;
  leave_minutes: number;
}

interface AttendanceSummary {
  year: number;
  month: number;
  totals: AttendanceTotals;
  employees: AttendanceEmployee[];
}

type AttendanceMetricKey = "lateness" | "absent" | "remote" | "leave";

interface AttendanceMetricDef {
  key: AttendanceMetricKey;
  label: string;
  // Shared field name on both `totals` and each employee row.
  field: keyof AttendanceTotals;
  // Таслалт is a count ("X удаа"); the rest are minutes rendered as HH:MM.
  isCount?: boolean;
  // Detail-sheet header (m = month number, rendered as "MM").
  sheetTitle: (m: number) => string;
  // Static descriptor under each name in the detail list (Зайнаас only).
  rowSubtitle?: string;
}

const pad2 = (m: number) => String(m).padStart(2, "0");

// Header cards (2×2) and the tap-through detail list, in display order.
const ATTENDANCE_METRICS: AttendanceMetricDef[] = [
  {
    key: "lateness",
    label: "Хоцролт",
    field: "lateness_minutes",
    sheetTitle: (m) => `${pad2(m)} сарын хоцролт`,
  },
  {
    key: "absent",
    label: "Таслалт",
    field: "absent_count",
    isCount: true,
    sheetTitle: (m) => `${pad2(m)} сарын таслалт`,
  },
  {
    key: "remote",
    label: "Зайнаас",
    field: "remote_minutes",
    sheetTitle: (m) => `${pad2(m)} сард зайнаас ажилласан`,
    rowSubtitle: "Онлайнаар ажиллах",
  },
  {
    key: "leave",
    label: "Ам/чөлөө",
    field: "leave_minutes",
    sheetTitle: (m) => `${pad2(m)} сард амралт, чөлөө авсан`,
  },
];

function formatMinutesHHMM(minutes: number): string {
  const total = Math.max(0, minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatMetricValue(value: number, isCount?: boolean): string {
  return isCount ? `${value} удаа` : formatMinutesHHMM(value);
}

function StatCard({
  metric,
  total,
  onPress,
}: {
  metric: AttendanceMetricDef;
  total: number;
  onPress: () => void;
}) {
  // total === 0 → no employee has a non-zero value, so the detail list would be
  // empty; leave the card non-tappable in that case.
  return (
    <Pressable
      onPress={onPress}
      disabled={total <= 0}
      className="flex-1 h-[38px] rounded-[5px] bg-[#F2F2F2] flex-row items-center justify-between px-3"
    >
      <AppText className="text-sm text-darkgray">{metric.label}</AppText>
      <AppText className="text-sm font-medium text-black">
        {formatMetricValue(total, metric.isCount)}
      </AppText>
    </Pressable>
  );
}

// One row of the metric detail list: 52px avatar, name (+ optional descriptor),
// and the metric value right-aligned.
function MetricRow({
  emp,
  valueText,
  subtitle,
}: {
  emp: AttendanceEmployee;
  valueText: string;
  subtitle?: string | null;
}) {
  return (
    <View className="flex-row items-center gap-2 h-16">
      <Avatar alt={shortName(emp)} className="w-[52px] h-[52px]">
        <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
        <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
          {avatarFallback(emp)}
        </Avatar.Fallback>
      </Avatar>
      <View className="flex-1">
        <AppText className="text-base" numberOfLines={1}>
          {shortName(emp)}
        </AppText>
        {subtitle ? (
          <AppText className="text-sm text-darkgray mt-0.5" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <AppText className="text-base font-medium text-black">{valueText}</AppText>
    </View>
  );
}

function ShiftRow({
  emp,
  number,
  shiftStart,
  shiftEnd,
  expanded,
  canAct,
  onToggle,
  onSwap,
  onRelease,
}: {
  emp: ScheduleEmployee;
  number: number | null; // null → on leave (renders "-" and is not actionable)
  shiftStart: string; // shift's nominal "HH:mm"
  shiftEnd: string;
  expanded: boolean;
  canAct: boolean;
  onToggle: () => void;
  onSwap: () => void;
  onRelease: () => void;
}) {
  const name = shortName(emp);
  const late = emp.lateness_minutes > 0;
  const setting = emp.employee_request_setting?.name ?? null;
  const isLeave = number === null;
  // Leave/request rows read as active (foreground/black) when the request is
  // paid, and dimmed (#6A6A6A at 70%) when unpaid — per design.
  const requestColor = emp.employee_request_setting?.has_salary
    ? "text-foreground"
    : "text-darkgray/70";

  const hasActual = !!emp.actual_start || !!emp.actual_end;
  // Does the employee's own planned time differ from the shift's nominal time?
  const pStart = emp.planned_start ? dayjs(emp.planned_start).format("HH:mm") : null;
  const pEnd = emp.planned_end ? dayjs(emp.planned_end).format("HH:mm") : null;
  const plannedDiffers = (!!pStart && pStart !== shiftStart) || (!!pEnd && pEnd !== shiftEnd);

  // Subtitle carries only what the shift header doesn't already imply: actual
  // clock times (red when late) once worked, else the leave/request name, else a
  // personal planned time that differs from the shift's nominal hours.
  let subtitle: React.ReactNode = null;
  if (hasActual) {
    subtitle = (
      <AppText className="text-sm" numberOfLines={1}>
        <AppText className={late ? "text-red text-sm" : "text-darkgray text-sm"}>
          {fmtHm(emp.actual_start ?? emp.planned_start)}
        </AppText>
        <AppText className="text-darkgray text-sm"> - {fmtHm(emp.actual_end ?? emp.planned_end)}</AppText>
        {setting ? <AppText className="text-darkgray text-sm"> / {setting}</AppText> : null}
      </AppText>
    );
  } else if (setting) {
    subtitle = (
      <AppText className={cn("text-sm", requestColor)} numberOfLines={1}>
        {setting}
      </AppText>
    );
  } else if (plannedDiffers) {
    subtitle = (
      <AppText className="text-sm text-darkgray" numberOfLines={1}>
        {pStart ?? "—"} - {pEnd ?? "—"}
      </AppText>
    );
  }

  // Only working rows on today/future days can be swapped or released.
  const tappable = canAct && !isLeave;

  return (
    <View>
      <Pressable
        onPress={tappable ? onToggle : undefined}
        disabled={!tappable}
        className="flex-row items-center gap-3 py-3"
      >
        <View className="w-5 items-center">
          <AppText className={cn("text-sm", isLeave ? "text-red" : "text-darkgray")}>
            {isLeave ? "-" : number}
          </AppText>
        </View>
        <Avatar alt={name} className="w-10 h-10">
          <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
          <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
            {avatarFallback(emp)}
          </Avatar.Fallback>
        </Avatar>
        <View className="flex-1">
          <AppText className={cn("text-sm", isLeave && requestColor)} numberOfLines={1}>
            {name}
          </AppText>
          {subtitle}
        </View>
        {tappable && (
          <HugeiconsIcon
            icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
            size={20}
            color={expanded ? "#222222" : "#6A6A6A80"}
          />
        )}
      </Pressable>

      {tappable && expanded && (
        <View className="flex-row gap-3 pb-3">
          <Pressable
            onPress={onSwap}
            className="flex-1 h-11 rounded-full bg-[#F2F2F2] items-center justify-center"
          >
            <AppText className="text-sm font-medium text-blue">Хуваарь солих</AppText>
          </Pressable>
          <Pressable
            onPress={onRelease}
            className="flex-1 h-11 rounded-full bg-[#F2F2F2] items-center justify-center"
          >
            <AppText className="text-sm font-medium text-red">Чөлөөлөх</AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function SeniorSchedule({
  year,
  month,
  onScroll,
}: {
  year: number;
  month: number;
  onScroll?: ScrollHandler;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const today = dayjs();
  const monthStart = useMemo(
    () => dayjs(`${year}-${String(month).padStart(2, "0")}-01`),
    [year, month]
  );
  const isCurrentMonth =
    monthStart.year() === today.year() && monthStart.month() === today.month();

  const [summary, setSummary] = useState<SummaryDay[]>([]);
  const [detail, setDetail] = useState<ScheduleResponse | null>(null);
  const [rosterTemplates, setRosterTemplates] = useState<RosterTemplate[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<number | null>(null);
  const [selected, setSelected] = useState<number>(isCurrentMonth ? today.date() : 1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Attendance summary (header cards) + the metric whose detail sheet is open.
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [metricKey, setMetricKey] = useState<AttendanceMetricKey | null>(null);

  // Чөлөөлөх confirm
  const [releaseTarget, setReleaseTarget] = useState<ScheduleEmployee | null>(null);
  const [releasing, setReleasing] = useState(false);

  // Ажилтан нэмэх picker
  const [addShift, setAddShift] = useState<ScheduleShift | null>(null);
  const [addList, setAddList] = useState<ShiftEmployee[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const addScrollRef = useRef<BottomSheetScrollViewMethods>(null);

  const selectedDate = `${year}-${String(month).padStart(2, "0")}-${String(selected).padStart(2, "0")}`;
  // Past-day shifts can't be added/released/swapped, so their rows aren't actionable.
  const selectedIsPast = dayjs(selectedDate).isBefore(today.startOf("day"), "day");

  useEffect(() => {
    setSelected(isCurrentMonth ? today.date() : 1);
    setSelectedRoster(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const showToast = useCallback(
    (message: string, ok: boolean) => {
      toast.show({
        component: (props) => (
          <AppToast
            {...props}
            variant={ok ? "success" : "danger"}
            description={message}
            icon={
              <HugeiconsIcon
                icon={ok ? CheckmarkCircle02Icon : Alert01Icon}
                color={ok ? "#18AA0B" : "#BC1818"}
              />
            }
          />
        ),
      });
    },
    [toast]
  );

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api<SummaryDay[]>({
        path: `/senior/timesheet/summary?year=${year}&month=${month}`,
        method: "GET",
      });
      setSummary(res.status === 200 && Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setSummary([]);
    }
  }, [year, month]);

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await api<AttendanceSummary>({
        path: `/senior/timesheet/attendance-summary?year=${year}&month=${month}`,
        method: "GET",
      });
      // 404 ("Ажилтны бүртгэл олдсонгүй") returns an error shape, not employees[].
      setAttendance(
        res.status === 200 && res.data && Array.isArray(res.data.employees) ? res.data : null
      );
    } catch (err) {
      console.error(err);
      setAttendance(null);
    }
  }, [year, month]);

  const fetchDetail = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setExpandedId(null);
      try {
        const rosterQuery = selectedRoster != null ? `&roster_template_id=${selectedRoster}` : "";
        const res = await api<ScheduleResponse>({
          path: `/senior/timesheet/schedule?date=${selectedDate}${rosterQuery}`,
          method: "GET",
        });
        if (res.status === 200 && res.data) {
          setDetail(res.data);
          setRosterTemplates(res.data.roster_templates ?? []);
          // Adopt the server's default roster only until the user picks one.
          if (selectedRoster == null) setSelectedRoster(res.data.selected_roster ?? null);
        } else {
          setDetail(null);
        }
      } catch (err) {
        console.error(err);
        setDetail(null);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [selectedDate, selectedRoster]
  );

  // Refetch the month summary + selected day's schedule when the day/roster/month
  // change or the screen regains focus (e.g. returning after a shift swap).
  useFocusEffect(
    useCallback(() => {
      void fetchDetail();
      void fetchSummary();
      void fetchAttendance();
    }, [fetchDetail, fetchSummary, fetchAttendance])
  );

  const summaryMap = useMemo(() => {
    const m = new Map<number, SummaryDay>();
    summary.forEach((s) => m.set(s.day, s));
    return m;
  }, [summary]);

  const activeMetric = useMemo(
    () => ATTENDANCE_METRICS.find((m) => m.key === metricKey) ?? null,
    [metricKey]
  );

  // The detail list: employees with a non-zero value for the tapped metric,
  // sorted by that value descending (the API doc serves both views in one call).
  const metricRows = useMemo(() => {
    if (!attendance || !activeMetric) return [];
    return attendance.employees
      .map((emp) => ({ emp, value: Number(emp[activeMetric.field] ?? 0) }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [attendance, activeMetric]);

  const weeks = useMemo(() => {
    const start = monthStart.startOf("month");
    const daysInMonth = monthStart.daysInMonth();
    const lead = (start.day() + 6) % 7; // Monday-first offset
    const cells: (number | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [monthStart]);

  const isToday = useCallback(
    (d: number) => isCurrentMonth && d === today.date(),
    [isCurrentMonth, today]
  );

  const rosterOptions = useMemo<SelectOption[]>(
    () => rosterTemplates.map((r) => ({ value: String(r.id), label: r.name })),
    [rosterTemplates]
  );
  const selectedRosterOption = rosterOptions.find((o) => o.value === String(selectedRoster));

  const goSwap = useCallback(
    (shift: ScheduleShift, emp: ScheduleEmployee) => {
      router.navigate({
        pathname: "/senior/shift-swap",
        params: {
          employeeId: String(emp.id),
          firstName: emp.first_name ?? "",
          lastName: emp.last_name ?? "",
          jobPosition: emp.job_position ?? "",
          profileImageUrl: emp.profile_image_url ?? "",
          timesheetId: String(emp.timesheet_id),
          rosterTemplateId: String(selectedRoster ?? ""),
          date: selectedDate,
          shiftStart: shift.start,
          shiftEnd: shift.end,
          shiftIndex: String(shift.shift_index),
        },
      });
    },
    [router, selectedRoster, selectedDate]
  );

  const handleRelease = useCallback(async () => {
    if (!releaseTarget) return;
    setReleasing(true);
    try {
      const res = await api<{ result?: string; message: string }>({
        path: `/senior/timesheet/shift/${releaseTarget.timesheet_id}`,
        method: "DELETE",
      });
      if (res.status === 200) {
        showToast(res.message || "Амралтын өдөр болголоо.", true);
        setReleaseTarget(null);
        await Promise.all([fetchDetail(), fetchSummary()]);
      } else {
        showToast(res.message || "Алдаа гарлаа", false);
      }
    } catch (e) {
      console.error("Release failed:", e);
    } finally {
      setReleasing(false);
    }
  }, [releaseTarget, showToast, fetchDetail, fetchSummary]);

  const openAddSheet = useCallback(
    (shift: ScheduleShift) => {
      setAddShift(shift);
      setAddList([]);
      setAddLoading(true);
      addScrollRef.current?.scrollTo({ y: 0, animated: false });
      const rosterQuery = selectedRoster != null ? `&roster_template_id=${selectedRoster}` : "";
      // shift_index → "ажиллахгүй" шүүлтийг тухайн ээлжээр нарийсгана: өөр ээлжид
      // ажиллаж байгаа ч энэ ээлжид сул ажилчид жагсаалтад орно.
      // Laravel-ийн boolean rule "false"/"true" string-ийг авдаггүй тул 0/1 ашиглана.
      const path = `/senior/timesheet/shift-employees?date=${selectedDate}${rosterQuery}&shift_index=${shift.shift_index}&is_working=0`;
      api<ShiftEmployee[]>({ path, method: "GET" })
        .then((res) => {
          if (res.status === 200 && Array.isArray(res.data)) {
            setAddList(res.data);
          } else if (res.status !== 200) {
            showToast(res.message || "Ажилтан ачаалахад алдаа гарлаа", false);
          }
        })
        .catch(console.error)
        .finally(() => setAddLoading(false));
    },
    [selectedRoster, selectedDate, showToast]
  );

  const handleAddEmployee = useCallback(
    async (employeeId: number) => {
      if (!addShift || selectedRoster == null) return;
      setAddingId(employeeId);
      try {
        const res = await api<{ result?: string; message: string }>({
          path: "/senior/timesheet/shift",
          method: "POST",
          data: {
            date: selectedDate,
            roster_template_id: selectedRoster,
            shift_index: addShift.shift_index,
            employee_id: employeeId,
          },
        });
        if (res.status === 200 || res.status === 201) {
          showToast(res.message || "Ээлж нэмлээ.", true);
          setAddShift(null);
          await Promise.all([fetchDetail(), fetchSummary()]);
        } else {
          showToast(res.message || "Алдаа гарлаа", false);
        }
      } catch (e) {
        console.error("Add employee failed:", e);
      } finally {
        setAddingId(null);
      }
    },
    [addShift, selectedRoster, selectedDate, showToast, fetchDetail, fetchSummary]
  );

  const shifts = detail?.shifts ?? [];
  const nonWorking = detail?.non_working ?? [];
  const isEmpty = !loading && shifts.length === 0 && nonWorking.length === 0;

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Cancel the parent's px-4 so the scroll view spans full width; re-inset
        // normal content via contentContainer padding while bands use -mx-4 to
        // reach the screen edges.
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 88 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchDetail(true)} />
        }
      >
        {/* Attendance summary — 2×2 stat cards; tap one to open the per-employee list. */}
        {attendance && (
          <View className="gap-3 mb-4">
            <View className="flex-row gap-3">
              {ATTENDANCE_METRICS.slice(0, 2).map((metric) => (
                <StatCard
                  key={metric.key}
                  metric={metric}
                  total={attendance.totals[metric.field] ?? 0}
                  onPress={() => setMetricKey(metric.key)}
                />
              ))}
            </View>
            <View className="flex-row gap-3">
              {ATTENDANCE_METRICS.slice(2, 4).map((metric) => (
                <StatCard
                  key={metric.key}
                  metric={metric}
                  total={attendance.totals[metric.field] ?? 0}
                  onPress={() => setMetricKey(metric.key)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Calendar */}
        <View className="flex-row mb-2">
          {WEEKDAYS.map((w, i) => (
            <AppText
              key={w}
              className={`flex-1 text-center text-sm ${i >= 5 ? "text-blue" : "text-darkgray"}`}
            >
              {w}
            </AppText>
          ))}
        </View>

        {weeks.map((row, ri) => (
          <View key={ri} className="flex-row">
            {row.map((d, ci) => {
              const isWeekend = ci >= 5;
              const info = d ? summaryMap.get(d) : undefined;
              // Show the actual (executed) shift count: gray when it meets/exceeds
              // the plan, red when understaffed (actual < planned).
              const showCount = !!info && (info.planned > 0 || info.actual > 0);
              const understaffed = !!info && info.actual < info.planned;
              const todayCell = d ? isToday(d) : false;
              const isSel = d === selected;
              return (
                <Pressable
                  key={ci}
                  disabled={!d}
                  onPress={() => d && setSelected(d)}
                  className={`flex-1 h-[52px] items-center justify-center rounded-lg ${
                    todayCell ? "bg-lightblue" : isSel ? "bg-darkgray/8" : ""
                  }`}
                >
                  {d && (
                    <>
                      <AppText
                        className={`text-sm ${
                          todayCell
                            ? "text-darkblue font-medium"
                            : isWeekend
                              ? "text-darkgray/40"
                              : "text-black"
                        }`}
                      >
                        {String(d).padStart(2, "0")}
                      </AppText>
                      {showCount && info && (
                        <AppText
                          className={cn(
                            "text-sm font-medium mt-0.5",
                            understaffed ? "text-red" : "text-darkgray/50"
                          )}
                        >
                          {info.actual}
                        </AppText>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* Roster template selector */}
        {rosterOptions.length > 0 && (
          <View className="mt-4">
            <AppSelect
              title="Хуваарь сонгох"
              options={rosterOptions}
              value={selectedRosterOption}
              onValueChange={(opt) => opt && setSelectedRoster(Number(opt.value))}
            />
          </View>
        )}

        {/* Shift sections */}
        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator />
          </View>
        ) : isEmpty ? (
          <View className="items-center justify-center py-16">
            <AppText className="text-sm text-darkgray">Хуваарь байхгүй байна</AppText>
          </View>
        ) : (
          <View className="mt-2">
            {shifts.map((shift) => {
              let counter = 0;
              return (
                <View key={shift.shift_index}>
                  <View className="bg-lightblue -mx-4 px-4 py-2.5 mt-3 flex-row items-center justify-between">
                    <AppText className="text-sm text-darkblue">
                      {shift.start} - {shift.end}
                    </AppText>
                    {!selectedIsPast && (
                      <Pressable
                        onPress={() => openAddSheet(shift)}
                        className="flex-row items-center gap-1"
                        hitSlop={6}
                      >
                        <HugeiconsIcon icon={PlusSignIcon} color="#606884" size={16} />
                        <AppText className="text-sm text-darkblue">Ажилтан нэмэх</AppText>
                      </Pressable>
                    )}
                  </View>
                  {shift.employees.length === 0 && (
                    <View className="py-6 items-center">
                      <AppText className="text-sm text-darkgray">Ажилтан байхгүй байна</AppText>
                    </View>
                  )}
                  {shift.employees.map((emp, i) => {
                    const isLeave = !!emp.employee_request_setting;
                    const number = isLeave ? null : (counter += 1);
                    return (
                      <View key={emp.timesheet_id}>
                        <ShiftRow
                          emp={emp}
                          number={number}
                          shiftStart={shift.start}
                          shiftEnd={shift.end}
                          expanded={expandedId === emp.timesheet_id}
                          canAct={!selectedIsPast}
                          onToggle={() =>
                            setExpandedId((p) =>
                              p === emp.timesheet_id ? null : emp.timesheet_id
                            )
                          }
                          onSwap={() => goSwap(shift, emp)}
                          onRelease={() => setReleaseTarget(emp)}
                        />
                        {i < shift.employees.length - 1 && (
                          <Separator className="bg-darkgray/12" />
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* Энэ өдөр хуваарьгүй */}
            {nonWorking.length > 0 && (
              <View className="mt-6">
                <View className="bg-darkgray/5 -mx-4 px-4 py-2.5 mb-1">
                  <AppText className="text-sm text-darkgray">Энэ өдөр хуваарьгүй</AppText>
                </View>
                {nonWorking.map((emp, i) => (
                  <View key={emp.id}>
                    <View className="flex-row items-center gap-3 py-3">
                      <View className="w-5 items-center">
                        <AppText className="text-sm text-darkgray">{i + 1}</AppText>
                      </View>
                      <Avatar alt={shortName(emp)} className="w-10 h-10">
                        <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                        <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                          {avatarFallback(emp)}
                        </Avatar.Fallback>
                      </Avatar>
                      <View className="flex-1">
                        <AppText className="text-sm" numberOfLines={1}>
                          {shortName(emp)}
                        </AppText>
                      </View>
                    </View>
                    {i < nonWorking.length - 1 && <Separator className="bg-darkgray/12" />}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Чөлөөлөх confirm dialog */}
      <AppDialog
        isOpen={!!releaseTarget}
        onOpenChange={(o) => {
          if (!o) setReleaseTarget(null);
        }}
      >
        <View className="mb-5 gap-1.5">
          <AppDialog.Title>Хуваариас чөлөөлөх</AppDialog.Title>
          <AppDialog.Description>
            Та {releaseTarget ? shortName(releaseTarget) : ""}-г хуваариас чөлөөлөхдөө итгэлтэй байна уу ?
          </AppDialog.Description>
        </View>
        <View className="flex-row gap-3">
          <AppDialog.Button
            label="Үгүй"
            className="flex-1"
            onPress={() => setReleaseTarget(null)}
          />
          <AppDialog.Button
            label="Тийм"
            className="flex-1"
            isLoading={releasing}
            onPress={handleRelease}
          />
        </View>
      </AppDialog>

      {/* Ажилтан нэмэх bottom sheet */}
      <BottomSheet
        isOpen={!!addShift}
        onOpenChange={(o) => {
          if (!o) setAddShift(null);
        }}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay className="bg-[#6C719F]/40" />
          <BottomSheet.Content
            snapPoints={["92%"]}
            topInset={insets.top}
            enableOverDrag={false}
            enableDynamicSizing={false}
            handleComponent={null}
            contentContainerClassName="h-full p-0 rounded-t-[10px] border border-transparent bg-overlay overflow-hidden"
          >
            {/* No close button per design — dismiss via overlay tap / swipe down. */}
            <View className="py-4 items-center">
              <AppText className="text-lg font-medium">Нэмэх ажилтнаа сонгох</AppText>
              {addShift && (
                <AppText className="text-sm text-darkgray mt-1">
                  {dayjs(selectedDate).format("MM/DD")}   {addShift.start} - {addShift.end}
                </AppText>
              )}
            </View>

            <BottomSheetScrollView
              ref={addScrollRef}
              contentContainerClassName="px-4 pb-8"
              showsVerticalScrollIndicator={false}
            >
              {addLoading ? (
                <View className="py-6 items-center">
                  <ActivityIndicator />
                </View>
              ) : addList.length === 0 ? (
                <View className="py-6 items-center">
                  <AppText className="text-sm text-darkgray">Ажилтан байхгүй байна</AppText>
                </View>
              ) : (
                addList.map((emp) => {
                  const adding = addingId === emp.id;
                  return (
                    <Pressable
                      key={emp.id}
                      className="flex-row items-center gap-3 h-16"
                      disabled={addingId !== null}
                      onPress={() => handleAddEmployee(emp.id)}
                    >
                      <Avatar alt={shortName(emp)} className="w-[52px] h-[52px]">
                        <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                        <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                          {avatarFallback(emp)}
                        </Avatar.Fallback>
                      </Avatar>
                      <AppText
                        className={cn("flex-1 text-base", adding && "font-medium")}
                        numberOfLines={1}
                      >
                        {shortName(emp)}
                      </AppText>
                      {adding && <HugeiconsIcon icon={Tick02Icon} size={24} color="#18AA0B" />}
                    </Pressable>
                  );
                })
              )}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      {/* Attendance metric detail — employees ranked by the tapped metric.
          A peek sheet (cards stay visible behind); dismiss by tapping the
          overlay or swiping down, per design (no close button). */}
      <BottomSheet
        isOpen={metricKey !== null}
        onOpenChange={(o) => {
          if (!o) setMetricKey(null);
        }}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay className="bg-[#6C719F]/40" />
          <BottomSheet.Content
            snapPoints={["55%", "90%"]}
            topInset={insets.top}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full p-0 rounded-t-[10px] border border-transparent bg-overlay overflow-hidden"
          >
            <View className="h-[60px] items-center justify-center">
              <AppText className="text-lg font-medium">
                {activeMetric ? activeMetric.sheetTitle(month) : ""}
              </AppText>
            </View>

            <BottomSheetScrollView
              contentContainerClassName="px-4 pb-8"
              showsVerticalScrollIndicator={false}
            >
              {metricRows.length === 0 ? (
                <View className="py-6 items-center">
                  <AppText className="text-sm text-darkgray">Мэдээлэл байхгүй байна</AppText>
                </View>
              ) : (
                metricRows.map((row) => (
                  <MetricRow
                    key={row.emp.employee_id}
                    emp={row.emp}
                    valueText={formatMetricValue(row.value, activeMetric?.isCount)}
                    subtitle={activeMetric?.rowSubtitle}
                  />
                ))
              )}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </>
  );
}

// --- Senior Leave / Ээлжийн амралт ---

interface UnplannedEmployee {
  employee_id: number;
  total_days: number;
  start_date: string;
  end_date: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
}

interface LeaveSplit {
  employee_id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  start_date: string;
  end_date: string;
  days: number;
}

interface LeaveMonth {
  month: number;
  splits: LeaveSplit[];
}

interface MonthlyCount {
  month: number;
  count: number;
}

interface AnnualLeavePlansResponse {
  max_leave_splits: number;
  years: number[];
  monthly_counts: MonthlyCount[];
  unplanned: UnplannedEmployee[];
  months: LeaveMonth[];
}

function monthLabel(month: number): string {
  return `${String(month).padStart(2, "0")} сар`;
}

function LeaveSplitRow({ split }: { split: LeaveSplit }) {
  const range = `${dayjs(split.start_date).format("MM/DD")} - ${dayjs(split.end_date).format("MM/DD")}`;
  return (
    <View className="flex-row items-center gap-3 py-3">
      <Avatar alt={fullName(split)} className="w-10 h-10">
        <Avatar.Image source={{ uri: split.profile_image_url ?? "" }} />
        <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
          {avatarFallback(split)}
        </Avatar.Fallback>
      </Avatar>
      <View className="flex-1">
        <AppText className="text-sm font-medium" numberOfLines={1}>
          {shortName(split)}
        </AppText>
        <AppText className="text-sm text-darkgray mt-0.5" numberOfLines={1}>
          {range}
        </AppText>
      </View>
      <AppText className="text-sm text-darkgray">{split.days} хоног</AppText>
    </View>
  );
}

function SeniorLeave({
  year,
  onYearsLoaded,
  onScroll,
}: {
  year: number;
  onYearsLoaded: (years: number[]) => void;
  onScroll?: ScrollHandler;
}) {
  const router = useRouter();
  const [data, setData] = useState<AnnualLeavePlansResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const monthRows = useMemo(() => {
    const rows: number[][] = [];
    for (let i = 1; i <= 12; i += 6) {
      rows.push(Array.from({ length: 6 }, (_, j) => i + j));
    }
    return rows;
  }, []);

  const fetchPlans = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await api<AnnualLeavePlansResponse>({
          path: `/senior/annual-leave-plans?year=${year}`,
          method: "GET",
        });
        if (res.status === 200) {
          setData(res.data);
          onYearsLoaded(res.data.years ?? []);
        }
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [year, onYearsLoaded]
  );

  // Refetch on focus (covers initial load, year change, and returning from the plan screen).
  useFocusEffect(
    useCallback(() => {
      void fetchPlans();
    }, [fetchPlans])
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const countByMonth: Record<number, number> = {};
  (data?.monthly_counts ?? []).forEach((mc) => {
    countByMonth[mc.month] = mc.count;
  });
  const unplanned = data?.unplanned ?? [];
  const months = data?.months ?? [];
  const isEmpty =
    unplanned.length === 0 &&
    months.length === 0 &&
    Object.values(countByMonth).every((c) => !c);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingBottom: 88 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchPlans(true)} />
      }
    >
      {/* Month grid */}
      {monthRows.map((row, ri) => (
        <View key={ri} className="flex-row">
          {row.map((m, ci) => {
            const count = countByMonth[m];
            return (
              <View
                key={m}
                className={`flex-1 h-[52px] items-center pt-2 border-darkgray/12 ${
                  ci < row.length - 1 ? "border-r" : ""
                } ${ri < monthRows.length - 1 ? "border-b" : ""}`}
              >
                <AppText className="text-sm text-black">{String(m).padStart(2, "0")}</AppText>
                {!!count && (
                  <AppText className="text-xs text-orange mt-0.5">{count}</AppText>
                )}
              </View>
            );
          })}
        </View>
      ))}

      {isEmpty && (
        <View className="items-center justify-center py-20">
          <AppText className="text-sm text-darkgray">Мэдээлэл байхгүй байна</AppText>
        </View>
      )}

      {/* Unplanned employees */}
      {unplanned.length > 0 && (
        <View className="mt-1">
          {unplanned.map((emp, i) => (
            <View key={emp.employee_id}>
              <Pressable
                className="flex-row items-center gap-3 py-3"
                onPress={() =>
                  router.navigate({
                    pathname: "/senior/leave-plan/[id]",
                    params: {
                      id: String(emp.employee_id),
                      year: String(year),
                      firstName: emp.first_name ?? "",
                      lastName: emp.last_name ?? "",
                      totalDays: String(emp.total_days),
                      startDate: emp.start_date,
                      endDate: emp.end_date,
                      profileImageUrl: emp.profile_image_url ?? "",
                      maxSplits: String(data?.max_leave_splits ?? ""),
                    },
                  })
                }
              >
                <Avatar alt={fullName(emp)} className="w-10 h-10">
                  <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                  <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                    {avatarFallback(emp)}
                  </Avatar.Fallback>
                </Avatar>
                <View className="flex-1">
                  <AppText className="text-sm font-medium" numberOfLines={1}>
                    {shortName(emp)}
                  </AppText>
                  <AppText className="text-sm text-darkgray mt-0.5" numberOfLines={1}>
                    Боломжит хоног {emp.total_days}
                  </AppText>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <HugeiconsIcon icon={Alert01Icon} color="#BC1818" size={16} />
                  <AppText className="text-sm text-red">Төлөвлөөгүй байна</AppText>
                </View>
              </Pressable>
              {i < unplanned.length - 1 && <Separator className="bg-darkgray/12" />}
            </View>
          ))}
        </View>
      )}

      {/* Planned leave by month */}
      <View className="mt-1">
        {months.map((section) => (
          <View key={section.month}>
            <View className="bg-lightblue rounded-md px-3 py-1.5 mt-2">
              <AppText className="text-sm text-darkblue">{monthLabel(section.month)}</AppText>
            </View>
            {section.splits.map((split, i) => (
              <View key={`${split.employee_id}-${split.start_date}`}>
                <LeaveSplitRow split={split} />
                {i < section.splits.length - 1 && <Separator className="bg-darkgray/12" />}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// The floating menu pill. Rendered through a Portal (app root) so it can slide
// down into the area the bottom tab bar vacates without being clipped by the
// screen's scene bounds. Only shown while the senior tab is focused, since tab
// screens stay mounted in the background. Targets the dedicated
// "floating-overlay" host, which sits below the default HeroUI portal host in
// the root layout — bottom sheets and dialogs always draw above the pill.
function SeniorMenuOverlay({
  active,
  onChange,
  hiddenKeys,
  badges,
}: {
  active: SeniorMenuKey;
  onChange: (key: SeniorMenuKey) => void;
  hiddenKeys: SeniorMenuKey[];
  badges?: SeniorMenuKey[];
}) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  // Resting position: 16px above the bottom tab bar.
  const restBottom = TAB_BAR_BASE_HEIGHT + insets.bottom + 16;
  const animatedStyle = useAnimatedStyle(() => ({
    // When hidden, drop the pill so it rests flush against the bottom safe-area
    // inset (restBottom → insets.bottom), filling the space the tab bar vacates.
    transform: [{ translateY: tabBarHidden.value * (restBottom - insets.bottom) }],
  }));

  if (!isFocused) return null;

  return (
    <Portal name="senior-menu-overlay" hostName="floating-overlay">
      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: restBottom,
            alignItems: "center",
          },
          animatedStyle,
        ]}
      >
        <SeniorMenuBar active={active} onChange={onChange} hiddenKeys={hiddenKeys} badges={badges} />
      </Animated.View>
    </Portal>
  );
}

export default function SeniorScreen() {
  const router = useRouter();
  const { onScroll, reset: resetTabBar } = useHideTabBarOnScroll();
  const [activeMenu, setActiveMenu] = useState<SeniorMenuKey>("request");
  const [requests, setRequests] = useState<AssignedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<SelectOption>(FILTER_OPTIONS[0]);
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<SelectOption | null>(null);
  const [scheduleMonth, setScheduleMonth] = useState<SelectOption>(() => {
    const value = String(dayjs().month() + 1).padStart(2, "0");
    return { value, label: `${value} сар` };
  });
  const [leaveYear, setLeaveYear] = useState(dayjs().year());
  const [leaveYears, setLeaveYears] = useState<number[]>([]);
  const [perfDeadline, setPerfDeadline] = useState<DeadlineInfo | null>(null);
  // Hide the schedule menu unless the senior actually manages shift-roster employees.
  const [hasShiftEmployees, setHasShiftEmployees] = useState(false);
  const currentPage = useRef(1);
  const lastPage = useRef(1);
  const isFetching = useRef(false);

  const monthOptions = useMemo<SelectOption[]>(
    () =>
      summaries.map((s) => ({
        value: monthKey(s.year, s.month),
        label: `${s.year}/${String(s.month).padStart(2, "0")}`,
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

  const year = selectedSummary?.year ?? dayjs().year();
  const month = selectedSummary?.month ?? dayjs().month() + 1;

  const maxScheduleMonth = Math.min(dayjs().month() + 2, 12);
  const scheduleMonthOptions = useMemo<SelectOption[]>(
    () =>
      Array.from({ length: maxScheduleMonth }, (_, i) => {
        const m = maxScheduleMonth - i;
        const value = String(m).padStart(2, "0");
        return { value, label: `${value} сар` };
      }),
    [maxScheduleMonth]
  );

  const leaveYearOptions = useMemo<SelectOption[]>(
    () => leaveYears.map((y) => ({ value: String(y), label: `${y} он` })),
    [leaveYears]
  );

  const handleLeaveYearsLoaded = useCallback((years: number[]) => {
    setLeaveYears(years);
  }, []);

  const handlePerfDeadlineChange = useCallback((info: DeadlineInfo | null) => {
    setPerfDeadline(info);
  }, []);

  const scheduleYear = dayjs().year();
  const scheduleMonthNum = parseInt(scheduleMonth.value);

  useFocusEffect(
    useCallback(() => {
      useNotificationStore.getState().clear("employee_request_assigned");
    }, [])
  );

  // Reveal the bottom tab bar whenever the active section changes, and restore
  // it when the screen loses focus so the other tabs never inherit a hidden bar.
  useEffect(() => {
    resetTabBar();
  }, [activeMenu, resetTabBar]);

  useFocusEffect(
    useCallback(() => {
      return () => resetTabBar();
    }, [resetTabBar])
  );

  // Does this senior manage any shift-roster employees? If not, the schedule
  // menu is hidden entirely.
  useEffect(() => {
    api<{ id: number }[]>({
      path: "/senior/timesheet/shift-employees",
      method: "GET",
    })
      .then((res) => {
        setHasShiftEmployees(
          res.status === 200 && Array.isArray(res.data) && res.data.length > 0
        );
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    api<MonthlySummary[]>({
      path: "/employee-request/assigned/monthly-summary",
      method: "GET",
    })
      .then((res) => {
        if (res.status === 200 && Array.isArray(res.data)) {
          setSummaries(res.data);
          if (res.data.length > 0) {
            const first = res.data[0];
            setSelectedMonth({
              value: monthKey(first.year, first.month),
              label: `${first.year}/${String(first.month).padStart(2, "0")}`,
            });
          } else {
            setLoading(false);
          }
        }
      })
      .catch(console.error);
  }, []);

  const fetchPage = useCallback(
    (page: number, y: number, m: number, statuses: string[], isRefresh = false) => {
      if (isFetching.current) return;
      isFetching.current = true;
      currentPage.current = page;

      const isFirstPage = page === 1;
      if (isRefresh) setRefreshing(true);
      else if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      const statusQuery = statuses.map((s) => `&status[]=${s}`).join("");

      api<PaginatedResponse>({
        path: `/employee-request/assigned?year=${y}&month=${m}&current_page=${page}${statusQuery}`,
        method: "GET",
      })
        .then((res) => {
          if (res.status === 200 && res.data) {
            setRequests((prev) => (isFirstPage ? res.data.data : [...prev, ...res.data.data]));
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

  const statuses = useMemo(() => STATUS_QUERY[filter.value] ?? [], [filter]);

  useEffect(() => {
    if (!selectedSummary) return;
    fetchPage(1, year, month, statuses);
  }, [fetchPage, selectedSummary, year, month, statuses]);

  const handleRefresh = useCallback(() => {
    fetchPage(1, year, month, statuses, true);
  }, [fetchPage, year, month, statuses]);

  const handleEndReached = useCallback(() => {
    if (currentPage.current < lastPage.current) {
      fetchPage(currentPage.current + 1, year, month, statuses);
    }
  }, [fetchPage, year, month, statuses]);

  // Refresh the request list when returning from the detail screen (e.g. after
  // approving/rejecting a request). The callback is kept stable and reads the
  // latest fetch args from a ref so it only fires on an actual refocus — not on
  // every selectedSummary/filter change — and skips the initial focus to avoid a
  // duplicate load alongside the effect above.
  const refreshArgsRef = useRef({ selectedSummary, year, month, statuses });
  refreshArgsRef.current = { selectedSummary, year, month, statuses };
  const skipFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      const a = refreshArgsRef.current;
      if (a.selectedSummary) {
        fetchPage(1, a.year, a.month, a.statuses, true);
      }
    }, [fetchPage])
  );

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-4">
        <AppHeader
          className="items-end"
          title={MENU_TITLES[activeMenu]}
          rightContent={
            activeMenu === "announcement" ? (
              <AppButton
                label="Илгээх"
                className="h-10 px-5 rounded-full border-0 bg-[#F2F2F2]"
                labelClassName="text-blue font-semibold"
                onPress={() => router.navigate("/senior/announcement/create")}
              />
            ) : activeMenu === "schedule" ? (
              <AppSelect
                title="Сар сонгох"
                options={scheduleMonthOptions}
                value={scheduleMonth}
                onValueChange={(opt) => opt && setScheduleMonth(opt)}
                trigger={
                  <AppText className="text-xl font-medium">
                    {String(scheduleMonthNum).padStart(2, "0")} сар
                  </AppText>
                }
              />
            ) : activeMenu === "performance" ? (
              perfDeadline ? (
                <AppText
                  className={cn("text-sm", perfDeadline.urgent ? "text-red" : "text-darkgray")}
                  numberOfLines={1}
                >
                  {perfDeadline.label}
                </AppText>
              ) : undefined
            ) : activeMenu === "leave" ? (
              leaveYearOptions.length > 0 ? (
                <AppSelect
                  title="Он сонгох"
                  options={leaveYearOptions}
                  value={leaveYearOptions.find((o) => o.value === String(leaveYear))}
                  onValueChange={(opt) => opt && setLeaveYear(Number(opt.value))}
                  trigger={
                    <AppText className="text-xl font-medium">{leaveYear} он</AppText>
                  }
                />
              ) : (
                <AppText className="text-xl font-medium">{leaveYear} он</AppText>
              )
            ) : undefined
          }
        />

        <View className="flex-1">
          {activeMenu === "request" ? (
            <>
              <View className="flex-row items-center gap-3 mb-3">
                <View className="flex-[2]">
                  <AppSelect
                    title="Төлөв"
                    options={FILTER_OPTIONS}
                    value={filter}
                    onValueChange={(opt) => opt && setFilter(opt)}
                    placeholder="Бүгд"
                  />
                </View>
                <View className="flex-1">
                  <AppSelect
                    title="Сар сонгох"
                    options={monthOptions}
                    value={selectedMonth ?? undefined}
                    onValueChange={(opt) => opt && setSelectedMonth(opt)}
                    placeholder={`${String(month).padStart(2, "0")} сар`}
                    renderValue={(opt) => (
                      <AppText className="text-sm">{opt.value.split("-")[1]} сар</AppText>
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
                  data={requests}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  showsVerticalScrollIndicator={false}
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  onEndReached={handleEndReached}
                  onEndReachedThreshold={0.3}
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  contentContainerStyle={{ paddingBottom: 88 }}
                  ItemSeparatorComponent={() => <Separator className="bg-darkgray/12" />}
                  ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                      <AppText className="text-sm text-darkgray">Хүсэлт байхгүй байна</AppText>
                    </View>
                  }
                  ListFooterComponent={
                    loadingMore ? (
                      <View className="py-4 items-center">
                        <ActivityIndicator />
                      </View>
                    ) : null
                  }
                  renderItem={({ item }) => {
                    const isReviewed =
                      item.status === "pending" && !!item.review_detail?.reviewed_at;
                    const isPending =
                      item.status === "senior_pending" ||
                      item.status === "review_pending" ||
                      (item.status === "pending" && !isReviewed);
                    let statusText = "";
                    let statusColor = "text-darkgray";
                    if (isReviewed) {
                      statusText = "Санал өгсөн";
                      statusColor = "text-black";
                    } else if (isPending) {
                      statusText = "Хүлээгдэж байна";
                      statusColor = "text-yellow";
                    } else if (item.status === "approved") {
                      statusText = "Зөвшөөрсөн";
                      statusColor = "text-green";
                    } else if (item.status === "rejected") {
                      statusText = "Татгалзсан";
                      statusColor = "text-red";
                    }
                    const created = item.created_at ? dayjs(item.created_at) : null;
                    const dateStr = created
                      ? `${created.format("DD")} / ${WEEKDAYS_FULL[created.day()]}`
                      : "";
                    return (
                      <Pressable
                        className="flex-row items-center py-3 gap-3"
                        onPress={() =>
                          router.navigate({
                            pathname: "/senior/request/[id]",
                            params: { id: String(item.id) },
                          })
                        }
                      >
                        <Avatar alt={fullName(item.employee)} className="w-10 h-10">
                          <Avatar.Image source={{ uri: item.employee.profile_image_url ?? "" }} />
                          <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                            {avatarFallback(item.employee)}
                          </Avatar.Fallback>
                        </Avatar>
                        <View className="flex-1">
                          <AppText className="text-sm font-medium" numberOfLines={1}>
                            {item.setting.name}
                          </AppText>
                          <View className="flex-row items-center justify-between gap-2 mt-0.5">
                            <AppText
                              className={cn("text-sm font-medium flex-1", statusColor)}
                              numberOfLines={1}
                            >
                              {statusText}
                            </AppText>
                            {dateStr && (
                              <AppText className="text-sm text-darkgray" numberOfLines={1}>
                                {dateStr}
                              </AppText>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    );
                  }}
                />
              )}
            </>
          ) : activeMenu === "announcement" ? (
            <SeniorAnnouncements onScroll={onScroll} />
          ) : activeMenu === "performance" ? (
            <SeniorPerformance onScroll={onScroll} onDeadlineChange={handlePerfDeadlineChange} />
          ) : activeMenu === "schedule" ? (
            <SeniorSchedule year={scheduleYear} month={scheduleMonthNum} onScroll={onScroll} />
          ) : activeMenu === "leave" ? (
            <SeniorLeave
              year={leaveYear}
              onYearsLoaded={handleLeaveYearsLoaded}
              onScroll={onScroll}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <AppText className="text-sm text-darkgray">Удахгүй нэмэгдэнэ</AppText>
            </View>
          )}
        </View>

        <SeniorMenuOverlay
          active={activeMenu}
          onChange={setActiveMenu}
          hiddenKeys={hasShiftEmployees ? [] : ["schedule"]}
          // TODO: badge-ийг бодит өгөгдөлд холбох (Хүсэлт ← assigned-request,
          // Гүйцэтгэл ← үнэлгээний төлөв). Одоохондоо дизайны дагуу default-аар асаалттай.
          badges={["request", "performance"]}
        />
      </View>
    </StyledSafeAreaView>
  );
}
