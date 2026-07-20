import { AppIcon } from "@/components/app-icon";
import { AppSelect, SelectOption } from "@/components/app-select";
import { AppText } from '@/components/app-text';
import type { DayData } from '@/components/timesheet-calendar';
import { MiniCalendar, TimesheetCalendar } from '@/components/timesheet-calendar';
import { api } from "@/config/api";
import {
  Clock01Icon,
  Login03Icon,
  Logout03Icon,
} from '@hugeicons-pro/core-stroke-rounded';
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Sun03StrokeStandard,
} from '@hugeicons-pro/core-stroke-standard';
import dayjs from 'dayjs';
import { router, useFocusEffect } from "expo-router";
import { cn, Separator } from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

type ViewMode = 'month' | 'year';

// --- Timesheet day data (matches /timesheet API response shape) ---

type OvertimeCategory = 'overtime' | 'compensatory' | 'accumulated' | 'compensatory_rest';

interface Shift {
  id: number;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  lateness_minutes: number;
  worked_duration_minutes: number | null;
  overtime_category: OvertimeCategory | null;
}

const OVERTIME_CATEGORY_LABELS: Record<OvertimeCategory, string> = {
  overtime: 'Илүү цаг',
  compensatory: 'Нөхөн олговорт цаг',
  accumulated: 'Хуримтлуулсан цаг',
  compensatory_rest: 'Нөхөн амралт',
};

// Цагийн төрөл (цаг засах header): илүү цаг -> ангилал, эс бөгөөс
// тухайн өдөр чөлөө/амралттай бол түүний текст, аль нь ч биш бол "Энгийн цаг".
function shiftTimeTypeLabel(shift: Shift, leave: string | null): string {
  if (shift.overtime_category) return OVERTIME_CATEGORY_LABELS[shift.overtime_category];
  if (leave) return leave;
  return 'Энгийн цаг';
}

interface TimesheetDay {
  cdate: string;
  shifts: Shift[];
  is_work_day: boolean;
  is_public_holiday: boolean;
  public_holiday_name: string | null;
  leave: string | null;
  leave_type: string | null;
  annual: boolean;
  total_lateness_minutes: number;
  total_overtime_minutes: number;
}

function extractTime(dt: string | null | undefined): string | undefined {
  if (!dt) return undefined;
  return dt.split(' ')[1]?.slice(0, 5);
}

function formatMinutes(minutes: number | null | undefined): string | undefined {
  if (!minutes) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatMinutesHHMM(minutes: number): string {
  const total = Math.max(0, minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatHolidayDates(dates: string[]): string {
  if (dates.length === 0) return '';
  const formatted = dates.map((d) => d.slice(5).replace('-', '/'));
  if (dates.length === 1) return formatted[0];
  return `${formatted[0]} - ${formatted[formatted.length - 1]}`;
}

function hasPlannedShift(day: TimesheetDay): boolean {
  return day.shifts.some((s) => !!s.planned_start && !!s.planned_end);
}

// Monday-first weekday names.
const WEEKDAY_LABELS = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

function weekdayLabel(dateStr: string): string {
  return WEEKDAY_LABELS[(dayjs(dateStr).day() + 6) % 7];
}

function deriveDayData(monthData: TimesheetDay[]): DayData[] {
  return monthData.map((d) => {
    const data: DayData = { date: d.cdate };
    if (!hasPlannedShift(d)) data.isNonWorkingDay = true;
    if (d.is_public_holiday && !hasPlannedShift(d)) data.isHoliday = true;
    if (d.total_overtime_minutes > 0) data.hasOvertime = true;
    if (d.total_lateness_minutes > 0) data.isLate = true;
    if (d.leave) {
      if (d.leave_type === 'remote') data.isRemote = true;
      else data.isLeave = true;
    }
    if (d.annual) data.isAnnualLeave = true;
    return data;
  });
}

interface YearSummaryStats {
  total_planned_minutes: number;
  total_worked_minutes: number;
  total_break_minutes: number;
  total_regular_overtime_minutes: number;
  total_night_overtime_minutes: number;
  total_holiday_overtime_minutes: number;
  total_rest_day_overtime_minutes: number;
  total_compensatory_minutes: number;
  total_accumulated_minutes: number;
  total_compensatory_rest_minutes: number;
  total_lateness_minutes: number;
  total_early_leave_minutes: number;
  total_annual_leave_minutes: number;
  total_annual_leave_days: number;
  total_paid_leave_minutes: number;
  total_unpaid_leave_minutes: number;
  total_work_days: number;
  total_worked_days: number;
  total_public_holidays: number;
  total_leave_days: number;
  total_absent_days: number;
}

interface YearSummaryHoliday {
  key: string;
  name: string;
  dates: string[];
}

interface YearSummaryExtra {
  has_annual_leave: boolean;
  annual_leave_available_days: number;
  annual_leave_total_days: number;
  annual_leave_splits: { start_date: string; end_date: string; days: number }[];
  medical_examinations: string[];
}

interface YearSummary {
  year: number;
  available_years: number[];
  year_stats: YearSummaryStats;
  year_extra: YearSummaryExtra;
  holidays: YearSummaryHoliday[];
  non_working_days: string[];
}

// --- Sub-components ---

function ViewModeToggle({
  mode,
  onChangeMode,
}: {
  mode: ViewMode;
  onChangeMode: (m: ViewMode) => void;
}) {
  return (
    <View className="flex-row gap-2">
      <Pressable onPress={() => onChangeMode('month')}>
        <AppText
          className={cn(
            'text-xl font-medium',
            mode === 'month' ? 'font-medium text-black' : 'text-darkgray/50',
          )}
        >
          Сар
        </AppText>
      </Pressable>
      <Pressable onPress={() => onChangeMode('year')}>
        <AppText
          className={cn(
            'text-xl font-medium',
            mode === 'year' ? 'font-medium text-black' : 'text-darkgray/50',
          )}
        >
          Жил
        </AppText>
      </Pressable>
    </View>
  );
}

// --- Timesheet List ---

function ShiftRow({
  shift,
  isFirst,
  dayStr,
  weekdayStr,
  dayColor,
  isToday,
  isFuture,
  isNonWorkingDay,
  hasLeave,
}: {
  shift: Shift | null;
  isFirst: boolean;
  dayStr: string;
  weekdayStr: string;
  dayColor: string;
  isToday: boolean;
  isFuture: boolean;
  isNonWorkingDay: boolean;
  hasLeave: boolean;
}) {
  const arrived = extractTime(shift?.actual_start);
  const left = extractTime(shift?.actual_end);
  const plannedStart = extractTime(shift?.planned_start);
  const plannedEnd = extractTime(shift?.planned_end);
  const workHour = formatMinutes(shift?.worked_duration_minutes);
  const isLate = (shift?.lateness_minutes ?? 0) > 0;
  const isOvertimeCategory =
    shift?.overtime_category === 'overtime' ||
    shift?.overtime_category === 'compensatory' ||
    shift?.overtime_category === 'accumulated';

  let arrivedDisplay = '00:00';
  let arrivedColor = 'text-darkgray/15';
  let leftDisplay = '00:00';
  let leftColor = 'text-darkgray/15';
  let workHourDisplay = '00:00';
  let workHourColor = 'text-darkgray/15';

  if (arrived) {
    arrivedDisplay = arrived;
    arrivedColor = isLate ? 'text-red' : 'text-darkgray';
  } else if (isFuture && !isNonWorkingDay && !hasLeave && plannedStart) {
    arrivedDisplay = plannedStart;
    arrivedColor = 'text-darkgray/40';
  }

  if (left) {
    leftDisplay = left;
    leftColor = 'text-darkgray';
  } else if (isFuture && !isNonWorkingDay && !hasLeave && plannedEnd) {
    leftDisplay = plannedEnd;
    leftColor = 'text-darkgray/40';
  }

  if (workHour) {
    workHourDisplay = workHour;
    workHourColor = isOvertimeCategory ? 'text-green font-medium' : 'font-medium';
  }

  return (
    <View className={cn('flex-row', !isFirst && 'border-t border-darkgray/5')}>
      <View className={cn('w-[103px] px-[15px] py-[13px]', isToday && isFirst && 'bg-lightblue')}>
        <View className={cn('flex-row items-baseline gap-2.5', !isFirst && 'opacity-0')}>
          <AppText numberOfLines={1} className={cn('w-[26px] text-base font-medium', dayColor)}>{dayStr}</AppText>
          <AppText className={cn('text-xs', dayColor || 'text-darkgray')}>{weekdayStr}</AppText>
        </View>
      </View>
      <View className="flex-1 items-center justify-center">
        <AppText className={cn('text-base', arrivedColor)}>{arrivedDisplay}</AppText>
      </View>
      <View className="flex-1 items-center justify-center">
        <AppText className={cn('text-base', leftColor)}>{leftDisplay}</AppText>
      </View>
      <View className="flex-1 items-center justify-center">
        <AppText className={cn('text-base', workHourColor)}>{workHourDisplay}</AppText>
      </View>
    </View>
  );
}

function TimesheetListRow({
  day,
  today,
  timeCorrectionId,
}: {
  day: TimesheetDay;
  today: string;
  timeCorrectionId: string | null;
}) {
  const dayNum = parseInt(day.cdate.split('-')[2], 10);
  const dateStr = day.cdate;
  const dayStr = String(dayNum).padStart(2, '0');
  const weekdayStr = weekdayLabel(day.cdate);
  const isFuture = dateStr > today;
  const isToday = dateStr === today;
  const isPlanned = hasPlannedShift(day);
  const isNonWorkingDay = !isPlanned;

  // Day number color: today -> #222, weekend/non-working -> blue, else darkgray
  const dayColor = isToday
    ? ''
    : day.annual || day.leave
      ? 'text-darkgray'
      : !isPlanned
        ? 'text-blue'
        : 'text-darkgray';

  // Annual leave: special row, no shift breakdown
  if (day.annual) {
    return (
      <View className="border-b border-darkgray/10 bg-yellow/10">
        <View className="flex-row">
          <View className="w-[103px] px-[15px] py-[13px]">
            <View className="flex-row items-baseline gap-2.5">
              <AppText numberOfLines={1} className={cn('w-[26px] text-base font-medium', dayColor)}>{dayStr}</AppText>
              <AppText className={cn('text-xs', dayColor || 'text-darkgray')}>{weekdayStr}</AppText>
            </View>
          </View>
          <View className="flex-1 items-center justify-center">
            <AppIcon icon={Sun03StrokeStandard} size={24} color="#F0B400" />
          </View>
          <View className="flex-1 items-center" />
          <View className="flex-1 items-center" />
        </View>
      </View>
    );
  }

  const shifts: (Shift | null)[] = day.shifts.length > 0 ? day.shifts : [null];
  const isCurrentMonth = dateStr.slice(0, 7) === today.slice(0, 7);

  const buildShiftPress = (shift: Shift) => {
    if (!timeCorrectionId || !isCurrentMonth || !shift.actual_start) return undefined;
    return () => {
      const arrivedTime = extractTime(shift.actual_start) ?? '--:--';
      const leftTime = extractTime(shift.actual_end) ?? '--:--';
      const arrivedDt = shift.actual_start?.slice(0, 16) ?? '';
      const leftDt = shift.actual_end?.slice(0, 16) ?? '';
      const headerInfoPayload = [
        { label: 'Засах огноо', value: `${dayStr} / ${weekdayStr}` },
        { label: 'Цагийн төрөл', value: shiftTimeTypeLabel(shift, day.leave) },
        { label: 'Бүртгэгдсэн цаг', value: `${arrivedTime} - ${leftTime}` },
      ];
      const shiftPayload = { arrived: arrivedDt, left: leftDt };
      router.navigate({
        pathname: '/request/create',
        params: {
          id: timeCorrectionId,
          shiftId: String(shift.id),
          cdate: day.cdate,
          title: 'Цаг засах',
          type: 'timeCorrection',
          headerInfo: JSON.stringify(headerInfoPayload),
          shift: JSON.stringify(shiftPayload),
        },
      });
    };
  };

  return (
    <View className="border-b border-darkgray/10">
      {shifts.map((shift, idx) => {
        const onPress = shift ? buildShiftPress(shift) : undefined;
        return (
          <Pressable key={idx} onPress={onPress}>
            <ShiftRow
              shift={shift}
              isFirst={idx === 0}
              dayStr={dayStr}
              weekdayStr={weekdayStr}
              dayColor={dayColor}
              isToday={isToday}
              isFuture={isFuture}
              isNonWorkingDay={isNonWorkingDay}
              hasLeave={!!day.leave}
            />
          </Pressable>
        );
      })}
      {day.leave && (
        <View className={cn('px-[15px] py-1', day.leave_type === 'remote' ? 'bg-skyblue' : 'bg-yellow/10')}>
          <AppText className="text-darkgray/70 text-xs">{day.leave}</AppText>
        </View>
      )}
      {day.public_holiday_name && (
        <View className="bg-blue/20 px-[15px] py-1">
          <AppText className="text-darkgray/70 text-xs">{day.public_holiday_name}</AppText>
        </View>
      )}
    </View>
  );
}

function TimesheetList({
  data,
  timeCorrectionId,
}: {
  data: TimesheetDay[];
  timeCorrectionId: string | null;
}) {
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <View className="pb-20">
      {/* Header */}
      <View className="flex-row">
        <View className="w-[103px]" />
        <View className="flex-1 items-center">
          <AppIcon icon={Login03Icon} size={22} color="#6A6A6A80" />
        </View>
        <View className="flex-1 items-center justify-center">
          <AppIcon icon={Logout03Icon} size={22} color="#6A6A6A80" />
        </View>
        <View className="flex-1 items-center justify-center">
          <AppIcon icon={Clock01Icon} size={22} color="#6A6A6A80" />
        </View>
      </View>

      {/* Rows */}
      {data.map((day) => (
        <TimesheetListRow
          key={day.cdate}
          day={day}
          today={today}
          timeCorrectionId={timeCorrectionId}
        />
      ))}
    </View>
  );
}

// --- Month View ---

function MonthView({
  year,
  month,
  timeCorrectionId,
}: {
  year: number;
  month: number;
  timeCorrectionId: string | null;
}) {
  const [monthData, setMonthData] = useState<TimesheetDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api<TimesheetDay[]>({ path: `/timesheet?year=${year}&month=${month}` });
      if (res.status === 200 && Array.isArray(res.data)) {
        setMonthData(res.data);
      } else {
        setMonthData([]);
      }
    } catch (err) {
      console.error(err);
    }
  }, [year, month]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchData().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  // Refetch fresh data whenever the tab regains focus. The effect above already
  // covers the initial mount and month changes (with the spinner), so the first
  // focus is skipped and re-entries refresh silently in the background — no
  // full-screen blank. Reads the latest fetchData via a ref so switching months
  // doesn't re-trigger this focus effect.
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;
  const skipFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      fetchDataRef.current();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const calendarDayData = useMemo(() => deriveDayData(monthData), [monthData]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 px-4"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="mb-5">
        <TimesheetCalendar
          year={year}
          month={month}
          dayData={calendarDayData}
          hideOtherMonthDays
        />
      </View>

      <TimesheetList data={monthData} timeCorrectionId={timeCorrectionId} />
    </ScrollView>
  );
}

// --- Year View ---

function YearView({
  year,
  onAvailableYearsChange,
}: {
  year: number;
  onAvailableYearsChange?: (years: number[]) => void;
}) {
  const [showHoliday, setShowHoliday] = useState(false);
  const [summary, setSummary] = useState<YearSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api<YearSummary>({ path: `/timesheet/year-summary?year=${year}` });
      if (res.status === 200 && res.data && typeof res.data === 'object') {
        setSummary(res.data);
        if (Array.isArray(res.data.available_years)) {
          onAvailableYearsChange?.(res.data.available_years);
        }
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [year, onAvailableYearsChange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchData().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  // Silently refetch on tab re-focus; the mount/year-change load above keeps the
  // spinner. See MonthView for the ref/skip-first-focus rationale.
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;
  const skipFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      fetchDataRef.current();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const stats = summary?.year_stats;
  const extra = summary?.year_extra;
  const holidays = summary?.holidays ?? [];

  const totalOvertimeMinutes =
    (stats?.total_regular_overtime_minutes ?? 0) +
    (stats?.total_night_overtime_minutes ?? 0) +
    (stats?.total_holiday_overtime_minutes ?? 0) +
    (stats?.total_rest_day_overtime_minutes ?? 0);

  const workHourRows = [
    { label: 'Ажилласан энгийн', value: `${formatMinutesHHMM(stats?.total_worked_minutes ?? 0)} цаг` },
    { label: 'Илүү цаг', value: `${formatMinutesHHMM(totalOvertimeMinutes)} цаг` },
    { label: 'Нөхөн амарсан цаг', value: `${formatMinutesHHMM(stats?.total_compensatory_rest_minutes ?? 0)} цаг` },
    { label: 'Цалинтай чөлөө', value: `${formatMinutesHHMM(stats?.total_paid_leave_minutes ?? 0)} цаг` },
    { label: 'Хоцорсон, тасалсан', value: `${formatMinutesHHMM(stats?.total_lateness_minutes ?? 0)} цаг` },
    { label: 'Цалингүй чөлөө', value: `${formatMinutesHHMM(stats?.total_unpaid_leave_minutes ?? 0)} цаг` },
  ];

  const totalHolidayDays = holidays.reduce((sum, h) => sum + h.dates.length, 0);

  const formatRange = (s: { start_date: string; end_date: string }) =>
    `${s.start_date.slice(5).replace('-', '/')} - ${s.end_date.slice(5).replace('-', '/')}`;

  const validSplits = (extra?.annual_leave_splits ?? []).filter((s) => s?.start_date && s?.end_date);
  const hasSplits = !!extra?.has_annual_leave && validSplits.length > 0;
  const splitFormattedList = validSplits.map(formatRange);
  const hasMedical = !!extra?.medical_examinations?.[0];
  const medicalFormatted = hasMedical
    ? extra!.medical_examinations[0].slice(5).replace('-', '/')
    : 'Хамрагдахгүй';

  const highlightRanges = useMemo(() => {
    const ranges: { start: string; end: string; color: 'blue' | 'annual' | 'cyan' }[] = [];
    holidays.forEach((h) => {
      if (h.dates.length === 0) return;
      ranges.push({ start: h.dates[0], end: h.dates[h.dates.length - 1], color: 'blue' });
    });
    if (extra?.has_annual_leave) {
      extra.annual_leave_splits?.forEach((s) => {
        if (s?.start_date && s?.end_date) {
          ranges.push({ start: s.start_date, end: s.end_date, color: 'annual' });
        }
      });
    }
    extra?.medical_examinations?.forEach((d) => {
      ranges.push({ start: d, end: d, color: 'cyan' });
    });
    return ranges;
  }, [holidays, extra]);

  const nonWorkingDayMap = useMemo(() => {
    const map: Record<string, { date: string; isNonWorkingDay: boolean }> = {};
    summary?.non_working_days?.forEach((d) => {
      map[d] = { date: d, isNonWorkingDay: true };
    });
    return map;
  }, [summary]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 px-4"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Тайлант жил */}
      <View className="flex-row justify-between">
        <AppText className="text-base text-darkgray leading-6">Тайлант жил</AppText>
        <View className="items-end gap-2.5">
          <AppText className="text-base text-darkgray leading-6">{stats?.total_work_days ?? 0} хоног</AppText>
          <AppText className="text-base text-darkgray leading-6">{formatMinutesHHMM(stats?.total_planned_minutes ?? 0)} цаг</AppText>
        </View>
      </View>

      <Separator className="bg-darkgray/30 my-5 h-px" />

      {/* Work-hour stats */}
      <View className="gap-2.5">
        {workHourRows.map((item) => (
          <View key={item.label} className="flex-row justify-between">
            <AppText className="text-base text-darkgray leading-6">{item.label}</AppText>
            <AppText className="text-base leading-6">{item.value}</AppText>
          </View>
        ))}
      </View>

      <Separator className="bg-darkgray/30 my-5 h-px" />

      {/* Extra stats */}
      <View className="gap-2.5">
        <View className="flex-row justify-between">
          <AppText className="text-base text-darkgray leading-6">Э/амралтын нийт хоног</AppText>
          <AppText className="text-base leading-6">{extra?.annual_leave_total_days ?? 0} хоног</AppText>
        </View>

        <View className="flex-row justify-between">
          <AppText className="text-base text-darkgray leading-6">Э/амралтын үлдсэн хоног</AppText>
          <AppText className="text-base leading-6">{extra?.annual_leave_available_days ?? 0} хоног</AppText>
        </View>

        <View className="flex-row justify-between">
          <AppText className="text-base text-darkgray leading-6">Э/а төлөвлөсөн хуваарь</AppText>
          {hasSplits ? (
            <View className="items-end gap-2.5">
              {splitFormattedList.map((s, i) => (
                <AppText key={`s-${i}`} className="text-base text-amber leading-6">{s}</AppText>
              ))}
            </View>
          ) : (
            <AppText className="text-base text-red leading-6">Төлөвлөөгүй</AppText>
          )}
        </View>

        <View className="flex-row justify-between">
          <AppText className="text-base text-darkgray leading-6">Эрүүл мэндийн үзлэг</AppText>
          <AppText className={cn('text-base leading-6', hasMedical ? 'text-darkcyan' : 'text-black')}>
            {medicalFormatted}
          </AppText>
        </View>

        <View className="flex-row justify-between mb-7.5">
          <AppText className="text-base text-darkgray leading-6">Нийтээр амрах баярын өдөр</AppText>
          <Pressable className="flex-row gap-1 items-center" onPress={() => setShowHoliday(!showHoliday)}>
            <AppIcon icon={showHoliday ? ArrowUp01Icon : ArrowDown01Icon} />
            <AppText className="text-base font-medium text-blue leading-6">{totalHolidayDays} хоног</AppText>
          </Pressable>
        </View>
      </View>

      {/* Holidays */}
      {
        showHoliday && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(140)}
            className="gap-4 mb-7.5"
          >
            {holidays.map((h) => (
              <View key={h.key} className="gap-1">
                <AppText className="text-base text-blue leading-6">{formatHolidayDates(h.dates)}</AppText>
                <AppText className="text-base leading-6">{h.name}</AppText>
              </View>
            ))}
          </Animated.View>
        )
      }

      {/* Mini calendars grid - 2 per row */}
      <Animated.View className="gap-3 pb-20" layout={LinearTransition.duration(220)}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} className="flex-row gap-3">
            <MiniCalendar
              year={year}
              month={i * 2 + 1}
              dayDataMap={nonWorkingDayMap}
              highlightRanges={highlightRanges}
              hideOtherMonthDays
            />
            <MiniCalendar
              year={year}
              month={i * 2 + 2}
              dayDataMap={nonWorkingDayMap}
              highlightRanges={highlightRanges}
              hideOtherMonthDays
            />
          </View>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

// --- Main Screen ---

export default function TimesheetScreen() {
  const today = dayjs();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [year, setYear] = useState(today.year());
  const [month, setMonth] = useState(today.month() + 1);
  const [timeCorrectionId, setTimeCorrectionId] = useState<string | null>(null);

  useEffect(() => {
    api<Record<string, { id: number; request_type: string }[]>>({
      path: '/employee-request/settings',
    })
      .then((res) => {
        if (res.status === 200) {
          const id = res.data.time_correction?.[0]?.id;
          if (id != null) setTimeCorrectionId(String(id));
        }
      })
      .catch(console.error);
  }, []);

  const currentMonth = today.month() + 1;
  const maxMonth = Math.min(currentMonth + 1, 12);
  const MONTH_OPTIONS: SelectOption[] = useMemo(
    () =>
      Array.from({ length: maxMonth }, (_, i) => {
        const m = maxMonth - i;
        const value = String(m).padStart(2, '0');
        return { value, label: `${value} сар` };
      }),
    [maxMonth],
  );

  const [availableYears, setAvailableYears] = useState<number[]>([today.year()]);

  const YEAR_OPTIONS: SelectOption[] = useMemo(
    () =>
      [...availableYears]
        .sort((a, b) => b - a)
        .map((y) => ({ value: String(y), label: `${y} он` })),
    [availableYears],
  );

  const [selectedMonth, setSelectedMonth] = useState<SelectOption>(
    () =>
      MONTH_OPTIONS.find((o) => o.value === String(currentMonth).padStart(2, '0')) ??
      MONTH_OPTIONS[0],
  );
  const [selectedYear, setSelectedYear] = useState<SelectOption>({
    value: String(today.year()),
    label: `${today.year()} он`,
  });

  const handleAvailableYearsChange = useCallback((years: number[]) => {
    setAvailableYears((prev) => {
      if (prev.length === years.length && prev.every((v, i) => v === years[i])) {
        return prev;
      }
      return years;
    });
  }, []);

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 mt-4 mb-5">
        {viewMode === 'month' ? (
          <AppSelect
            title="Хуваарь, цагийн мэдээлэл"
            options={MONTH_OPTIONS}
            value={selectedMonth}
            onValueChange={(opt) => opt && setSelectedMonth(opt)}
            trigger={
              <AppText className="text-xl font-medium">{selectedMonth.label}</AppText>
            }
            triggerClassName="bg-transparent p-0 min-h-0"
          />
        ) : (
          <AppSelect
            title="Жилийн ерөнхий мэдээлэл"
            options={YEAR_OPTIONS}
            value={selectedYear}
            onValueChange={(opt) => opt && setSelectedYear(opt)}
            trigger={
              <AppText className="text-xl font-medium">{selectedYear.label}</AppText>
            }
            triggerClassName="bg-transparent p-0 min-h-0"
          />
        )}
        <ViewModeToggle mode={viewMode} onChangeMode={setViewMode} />
      </View>

      {/* Content */}
      {viewMode === 'month' ? (
        <MonthView
          year={today.year()}
          month={parseInt(selectedMonth.value)}
          timeCorrectionId={timeCorrectionId}
        />
      ) : (
        <YearView
          year={parseInt(selectedYear.value)}
          onAvailableYearsChange={handleAvailableYearsChange}
        />
      )}
    </StyledSafeAreaView>
  );
}