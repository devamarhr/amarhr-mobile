import { AppButton } from "@/components/app-button";
import { AppHeader } from "@/components/app-header";
import { AppSelect, SelectOption } from "@/components/app-select";
import { AppText } from "@/components/app-text";
import { SeniorMenuKey } from "@/components/senior-menu-bar";
import { SeniorAnnouncements } from "@/components/senior/senior-announcements";
import { SeniorLeave } from "@/components/senior/senior-leave";
import { SeniorPerformance } from "@/components/senior/senior-performance";
import { SeniorRequests } from "@/components/senior/senior-requests";
import { SeniorSchedule } from "@/components/senior/senior-schedule";
import {
  DeadlineInfo,
  MENU_TITLES,
  MenuBadges,
  SeniorMenuOverlay,
} from "@/components/senior/shared";
import { api } from "@/config/api";
import { useHideTabBarOnScroll } from "@/hooks/use-hide-tab-bar";
import dayjs from "dayjs";
import { useFocusEffect, useRouter } from "expo-router";
import { cn } from "heroui-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function SeniorScreen() {
  const router = useRouter();
  const { onScroll, reset: resetTabBar } = useHideTabBarOnScroll();
  const [activeMenu, setActiveMenu] = useState<SeniorMenuKey>("request");
  const [badgeKeys, setBadgeKeys] = useState<SeniorMenuKey[]>([]);
  const [scheduleMonth, setScheduleMonth] = useState<SelectOption>(() => {
    const value = String(dayjs().month() + 1).padStart(2, "0");
    return { value, label: `${value} сар` };
  });
  const [leaveYear, setLeaveYear] = useState(dayjs().year());
  const [leaveYears, setLeaveYears] = useState<number[]>([]);
  const [perfDeadline, setPerfDeadline] = useState<DeadlineInfo | null>(null);
  // Hide the schedule menu unless the senior actually manages shift-roster employees.
  const [hasShiftEmployees, setHasShiftEmployees] = useState(false);

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

  // Menu badge dots — refetch the per-section pending counts on every focus so
  // they stay current after the senior acts on requests/evaluations/leaves.
  useFocusEffect(
    useCallback(() => {
      api<MenuBadges>({ path: "/senior/menu-badges", method: "GET" })
        .then((res) => {
          if (res.status === 200 && res.data) {
            const d = res.data;
            setBadgeKeys(
              (Object.keys(d) as SeniorMenuKey[]).filter((k) => (d[k] ?? 0) > 0)
            );
          }
        })
        .catch(console.error);
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

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-4">
        <AppHeader
          className="items-center h-10"
          title={MENU_TITLES[activeMenu]}
          rightContent={
            activeMenu === "announcement" ? (
              <AppButton
                label="Илгээх"
                className="h-10 px-5 rounded-full border-0 bg-lightgray"
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
            <SeniorRequests onScroll={onScroll} />
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
          badges={badgeKeys}
        />
      </View>
    </StyledSafeAreaView>
  );
}
