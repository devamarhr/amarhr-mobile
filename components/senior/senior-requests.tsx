import { AppSelect, SelectOption } from "@/components/app-select";
import { AppText } from "@/components/app-text";
import {
  avatarFallback,
  fullName,
  monthKey,
  MonthlySummary,
  useSeniorContentPad,
  WEEKDAYS_FULL,
} from "@/components/senior/shared";
import { api } from "@/config/api";
import { ScrollHandler } from "@/hooks/use-hide-tab-bar";
import { useNotificationStore } from "@/store/notification-store";
import dayjs from "dayjs";
import { useFocusEffect, useRouter } from "expo-router";
import { Avatar, cn } from "heroui-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";

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

export function SeniorRequests({ onScroll }: { onScroll?: ScrollHandler }) {
  const contentPad = useSeniorContentPad();
  const router = useRouter();
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
    (
      page: number,
      y: number,
      m: number,
      statuses: string[],
      isRefresh = false,
      // Background refetch (e.g. returning from a detail screen) — updates the
      // list without toggling any spinner. A programmatic RefreshControl spinner
      // can stick on iOS when the list isn't scrolled to the top, so re-focus
      // refreshes run silently and only the user's pull-to-refresh shows it.
      silent = false
    ) => {
      if (isFetching.current) return;
      isFetching.current = true;
      currentPage.current = page;

      const isFirstPage = page === 1;
      if (silent) {
        // no indicator
      } else if (isRefresh) setRefreshing(true);
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
          if (silent) {
            // nothing was set
          } else if (isRefresh) setRefreshing(false);
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
        // silent = true → refresh in the background without the RefreshControl
        // spinner, which can otherwise stick on iOS when returning here.
        fetchPage(1, a.year, a.month, a.statuses, false, true);
      }
    }, [fetchPage])
  );

  return (
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
          data={requests}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ paddingBottom: contentPad }}
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
            let statusWeight = "font-normal";
            if (isReviewed) {
              statusText = "Санал өгсөн";
              statusColor = "text-darkgray";
            } else if (isPending) {
              statusText = "Хүлээгдэж байна";
              statusColor = "text-yellow";
              statusWeight = "font-medium";
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
                className="flex-row items-center py-1.5 gap-2"
                onPress={() =>
                  router.navigate({
                    pathname: "/senior/request/[id]",
                    params: { id: String(item.id) },
                  })
                }
              >
                <Avatar alt={fullName(item.employee)} className="w-[52px] h-[52px]">
                  <Avatar.Image source={{ uri: item.employee.profile_image_url ?? "" }} />
                  <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                    {avatarFallback(item.employee)}
                  </Avatar.Fallback>
                </Avatar>
                <View className="flex-1">
                  <AppText className="text-base font-medium" numberOfLines={1}>
                    {item.setting.name}
                  </AppText>
                  <View className="flex-row items-center justify-between gap-2 mt-0.5">
                    <AppText
                      className={cn("text-sm flex-1", statusColor, statusWeight)}
                      numberOfLines={1}
                    >
                      {statusText}
                    </AppText>
                    {dateStr && (
                      <AppText className="text-sm text-darkgray/50" numberOfLines={1}>
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
  );
}
