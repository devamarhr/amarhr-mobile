import { AppText } from "@/components/app-text";
import {
  avatarFallback,
  fullName,
  nameWithInitial,
  useSeniorContentPad,
} from "@/components/senior/shared";
import { api } from "@/config/api";
import { ScrollHandler } from "@/hooks/use-hide-tab-bar";
import dayjs from "dayjs";
import { useFocusEffect, useRouter } from "expo-router";
import { Avatar } from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";

interface UnplannedEmployee {
  employee_id: number;
  total_days: number;
  used_days: number;
  start_date: string;
  end_date: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
}

interface LeaveSplit {
  id: number;
  decree_id: number | null;
  type: 'scheduled' | 'advance' | 'unused';
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

interface AnnualLeavesResponse {
  max_leave_splits: number;
  years: number[];
  monthly_counts: MonthlyCount[];
  unplanned: UnplannedEmployee[];
  months: LeaveMonth[];
}

function monthLabel(month: number): string {
  return `${String(month).padStart(2, "0")} сар`;
}

function LeaveSplitRow({ split, onPress }: { split: LeaveSplit; onPress: () => void }) {
  const range = `${dayjs(split.start_date).format("MM/DD")} - ${dayjs(split.end_date).format("MM/DD")}`;
  return (
    <Pressable className="flex-row items-center gap-2 h-16" onPress={onPress}>
      <Avatar alt={fullName(split)} className="w-[52px] h-[52px]">
        <Avatar.Image source={{ uri: split.profile_image_url ?? "" }} />
        <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
          {avatarFallback(split)}
        </Avatar.Fallback>
      </Avatar>
      <View className="flex-1">
        <AppText className="text-base text-black" numberOfLines={1}>
          {nameWithInitial(split)}
        </AppText>
        <View className="flex-row items-center justify-between gap-2">
          <AppText className="text-sm text-darkgray" numberOfLines={1}>
            {range}
          </AppText>
          <AppText className="text-sm text-darkgray">{split.days} хоног</AppText>
        </View>
      </View>
    </Pressable>
  );
}

export function SeniorLeave({
  year,
  onYearsLoaded,
  onScroll,
}: {
  year: number;
  onYearsLoaded: (years: number[]) => void;
  onScroll?: ScrollHandler;
}) {
  const contentPad = useSeniorContentPad();
  const router = useRouter();
  const [data, setData] = useState<AnnualLeavesResponse | null>(null);
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
        const res = await api<AnnualLeavesResponse>({
          path: `/senior/annual-leaves?year=${year}`,
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
      // Cancel the parent's px-4 so the scroll view spans full width; re-inset
      // normal content via contentContainer padding while the month band uses
      // -mx-4 to reach the screen edges.
      style={{ marginHorizontal: -16 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: contentPad }}
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
                className={`flex-1 h-[57px] items-center pt-2 border-darkgray/12 ${
                  ci < row.length - 1 ? "border-r" : ""
                } ${ri < monthRows.length - 1 ? "border-b" : ""}`}
              >
                <AppText className="text-sm font-medium text-darkgray">
                  {String(m).padStart(2, "0")}
                </AppText>
                {!!count && (
                  <AppText className="text-sm font-semibold text-orange mt-0.5">{count}</AppText>
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
        <View className="mt-2.5">
          {unplanned.map((emp) => (
            <Pressable
              key={emp.employee_id}
              className="flex-row items-center gap-2 h-16"
              onPress={() =>
                router.navigate({
                  pathname: "/senior/leave-plan/[id]",
                  params: {
                    id: String(emp.employee_id),
                    firstName: emp.first_name ?? "",
                    lastName: emp.last_name ?? "",
                  },
                })
              }
            >
              <Avatar alt={fullName(emp)} className="w-[52px] h-[52px]">
                <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                  {avatarFallback(emp)}
                </Avatar.Fallback>
              </Avatar>
              <View className="flex-1">
                <AppText className="text-base text-black" numberOfLines={1}>
                  {nameWithInitial(emp)}
                </AppText>
                <AppText className="text-sm text-red/60" numberOfLines={1}>
                  Төлөвлөөгүй байна
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Planned leave by month */}
      <View>
        {months.map((section) => (
          <View key={section.month}>
            <View className="bg-lightblue py-2 px-4 -mx-4 mt-2.5">
              <AppText className="text-sm text-darkblue">{monthLabel(section.month)}</AppText>
            </View>
            {(section.splits ?? []).map((split) => (
              <LeaveSplitRow
                key={split.id}
                split={split}
                onPress={() =>
                  router.navigate({
                    pathname: "/senior/leave-plan/[id]",
                    params: {
                      id: String(split.employee_id),
                      firstName: split.first_name ?? "",
                      lastName: split.last_name ?? "",
                    },
                  })
                }
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
