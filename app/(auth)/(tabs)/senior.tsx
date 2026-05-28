import { AppButton } from "@/components/app-button";
import { AppHeader } from "@/components/app-header";
import { AppSelect, SelectOption } from "@/components/app-select";
import { AppText } from "@/components/app-text";
import { AppTextField } from "@/components/app-text-field";
import { SeniorMenuBar, SeniorMenuKey } from "@/components/senior-menu-bar";
import { api } from "@/config/api";
import { useNotificationStore } from "@/store/notification-store";
import { FileAttachmentIcon, Search01Icon } from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import dayjs from "dayjs";
import { useFocusEffect, useRouter } from "expo-router";
import { Avatar, Dialog, Separator } from "heroui-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

const STATUS_DOT: Record<string, string> = {
  approved: "bg-green",
  rejected: "bg-red",
};

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

function fullName(emp: AssignedEmployee): string {
  const parts = [emp.last_name, emp.first_name].filter(Boolean) as string[];
  return parts.join(" ");
}

function avatarFallback(emp: AssignedEmployee): string {
  return ((emp.last_name?.[0] ?? "") + (emp.first_name?.[0] ?? "")) || "?";
}

const MENU_TITLES: Record<SeniorMenuKey, string> = {
  request: "Өргөдөл хүсэлт",
  announcement: "Зарлал мэдээлэл",
  performance: "Гүйцэтгэл",
  schedule: "Хуваарь",
  leave: "Ээлжийн амралт",
};

// --- Senior Announcements ---

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

function SeniorAnnouncements() {
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
  const [viewingAttachments, setViewingAttachments] = useState<AnnouncementAttachment[] | null>(null);

  const monthOptions = useMemo<SelectOption[]>(
    () =>
      summaries.map((s) => ({
        value: monthKey(s.year, s.month),
        label: s.label,
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
        label: first.label,
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
    const dateStr = item.created_at ? dayjs(item.created_at).format("MM/DD  HH:mm") : "";
    const hasAttachments = !!item.attachments?.length;
    return (
      <View className="py-5">
        <View className="flex-row items-center justify-between gap-3">
          <AppText
            className={`text-base font-medium flex-1 ${item.type === "warning" ? "text-red" : ""}`}
          >
            {item.title}
          </AppText>
          {dateStr && <AppText className="text-sm text-darkgray">{dateStr}</AppText>}
        </View>
        <AppText className="text-sm mt-2">{item.content}</AppText>
        <View className="flex-row items-center justify-between mt-2 gap-3">
          {hasAttachments ? (
            <Pressable
              className="flex-row items-center gap-1.5"
              onPress={() => {
                if (item.attachments.length === 1) {
                  Linking.openURL(item.attachments[0].url);
                } else {
                  setViewingAttachments(item.attachments);
                }
              }}
            >
              <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={16} />
              <AppText className="text-sm text-blue">Хавсралттай</AppText>
            </Pressable>
          ) : (
            <View />
          )}
          <AppText className="text-sm text-blue font-medium">
            Илгээсэн {item.employees_count}
          </AppText>
        </View>
      </View>
    );
  }, []);

  return (
    <>
      <View className="flex-row items-center gap-3 mb-3">
        <View className="flex-[2]">
          <AppTextField
            placeholder="Хайх"
            leftIcon={<HugeiconsIcon icon={Search01Icon} color="#222222" size={20} />}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View className="flex-1">
          <AppSelect
            title="Он сар сонгох"
            options={monthOptions}
            value={selectedMonth ?? undefined}
            onValueChange={(opt) => opt && setSelectedMonth(opt)}
            placeholder={dayjs().format("YYYY/MM")}
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
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ paddingBottom: 88 }}
          ItemSeparatorComponent={() => <Separator className="bg-darkgray/12" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <AppText className="text-sm text-darkgray">Зарлал байхгүй байна</AppText>
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

      <Dialog
        isOpen={viewingAttachments !== null}
        onOpenChange={(open) => !open && setViewingAttachments(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="bg-[#6C719F]/40" />
          <Dialog.Content>
            <View className="mb-4 gap-1.5">
              <Dialog.Title>Хавсралт</Dialog.Title>
            </View>
            <View className="gap-2">
              {viewingAttachments?.map((file, i) => (
                <Pressable
                  key={i}
                  className="flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3"
                  onPress={() => Linking.openURL(file.url)}
                >
                  <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={20} />
                  <AppText className="text-sm text-blue flex-1" numberOfLines={1}>
                    {file.name ?? file.path.split("/").pop()}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  );
}

export default function SeniorScreen() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<SeniorMenuKey>("request");
  const [requests, setRequests] = useState<AssignedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<SelectOption>(FILTER_OPTIONS[0]);
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<SelectOption | null>(null);
  const currentPage = useRef(1);
  const lastPage = useRef(1);
  const isFetching = useRef(false);

  const monthOptions = useMemo<SelectOption[]>(
    () =>
      summaries.map((s) => ({
        value: monthKey(s.year, s.month),
        label: s.label,
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

  useFocusEffect(
    useCallback(() => {
      useNotificationStore.getState().clear("employee_request_assigned");
    }, [])
  );

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
              label: first.label,
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

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-4">
        <AppHeader
          subtitle="Ахлах"
          title={MENU_TITLES[activeMenu]}
          rightContent={
            activeMenu === "announcement" ? (
              <AppButton
                label="Илгээх"
                className="h-10 px-5 rounded-full"
                onPress={() => router.navigate("/senior/announcement/create")}
              />
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
                    placeholder={`${year}/${String(month).padStart(2, "0")}`}
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
                    const dotColor = STATUS_DOT[item.status];
                    const dateStr = item.created_at ? dayjs(item.created_at).format("MM/DD") : "";
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
                          <View className="flex-row items-center gap-2">
                            <AppText className="text-sm font-medium flex-1" numberOfLines={1}>
                              {item.setting.name}
                            </AppText>
                            {dotColor && (
                              <View className={`w-2 h-2 rounded-full ${dotColor}`} />
                            )}
                          </View>
                          {isPending && (
                            <AppText className="text-sm font-medium text-yellow mt-0.5">
                              Хүлээгдэж байна
                            </AppText>
                          )}
                          {isReviewed && (
                            <AppText className="text-sm font-medium text-darkcyan mt-0.5">
                              Санал өгсөн
                            </AppText>
                          )}
                        </View>
                        {dateStr && <AppText className="text-sm text-darkgray">{dateStr}</AppText>}
                      </Pressable>
                    );
                  }}
                />
              )}
            </>
          ) : activeMenu === "announcement" ? (
            <SeniorAnnouncements />
          ) : (
            <View className="flex-1 items-center justify-center">
              <AppText className="text-sm text-darkgray">Удахгүй нэмэгдэнэ</AppText>
            </View>
          )}
        </View>

        <View className="absolute bottom-2 left-0 right-0 items-center" pointerEvents="box-none">
          <SeniorMenuBar active={activeMenu} onChange={setActiveMenu} />
        </View>
      </View>
    </StyledSafeAreaView>
  );
}
