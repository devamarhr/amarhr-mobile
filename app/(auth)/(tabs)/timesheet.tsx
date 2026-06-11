import { AppSelect, SelectOption } from "@/components/app-select";
import { AppText } from '@/components/app-text';
import type { DayData } from '@/components/timesheet-calendar';
import { MiniCalendar, TimesheetCalendar } from '@/components/timesheet-calendar';
import { api } from "@/config/api";
import {
  ArrowDown01Icon,
  Clock01Icon,
  LoginCircle02Icon,
  LogoutCircle02Icon,
  Sun03StrokeStandard,
} from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import dayjs from 'dayjs';
import { router } from "expo-router";
import { cn, Separator } from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
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

interface TimesheetDay {
  cdate: string;
  shifts: Shift[];
  is_work_day: boolean;
  is_public_holiday: boolean;
  leave: string | null;
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

function deriveDayData(monthData: TimesheetDay[]): DayData[] {
  return monthData.map((d) => {
    const data: DayData = { date: d.cdate };
    if (!hasPlannedShift(d)) data.isNonWorkingDay = true;
    if (d.is_public_holiday && !hasPlannedShift(d)) data.isHoliday = true;
    if (d.total_overtime_minutes > 0) data.hasOvertime = true;
    if (d.total_lateness_minutes > 0) data.isLate = true;
    if (d.leave) data.isLeave = true;
    if (d.annual) data.isAnnualLeave = true;
    return data;
  });
}

interface YearSummaryStats {
  total_planned_minutes: number;
  total_worked_minutes: number;
  total_regular_overtime_minutes: number;
  total_night_overtime_minutes: number;
  total_holiday_overtime_minutes: number;
  total_rest_day_overtime_minutes: number;
  total_compensatory_rest_minutes: number;
  total_lateness_minutes: number;
  total_paid_leave_minutes: number;
  total_unpaid_leave_minutes: number;
  total_work_days: number;
  total_public_holidays: number;
}

interface YearSummaryHoliday {
  key: string;
  name: string;
  dates: string[];
}

interface YearSummaryExtra {
  has_annual_leave: boolean;
  annual_leave_available_days: number;
  annual_leave_splits: { start_date: string; end_date: string; days: number }[];
  annual_leave_plan_splits: { start_date: string; end_date: string; days: number }[];
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
  dayColor,
  isToday,
  isFuture,
  isNonWorkingDay,
  hasLeave,
}: {
  shift: Shift | null;
  isFirst: boolean;
  dayStr: string;
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
      <View className={cn('w-14 h-14 items-center justify-center', isToday && isFirst && 'bg-lightblue')}>
        <AppText className={cn('text-lg', dayColor, !isFirst && 'opacity-0')}>{dayStr}</AppText>
      </View>
      <View className="flex-1 items-center justify-center">
        <AppText className={cn('text-sm', arrivedColor)}>{arrivedDisplay}</AppText>
      </View>
      <View className="flex-1 items-center justify-center">
        <AppText className={cn('text-sm', leftColor)}>{leftDisplay}</AppText>
      </View>
      <View className="flex-1 items-center justify-center">
        <AppText className={cn('text-sm', workHourColor)}>{workHourDisplay}</AppText>
      </View>
    </View>
  );
}

function TimesheetListRow({
  day,
  month,
  today,
  timeCorrectionId,
}: {
  day: TimesheetDay;
  month: number;
  today: string;
  timeCorrectionId: string | null;
}) {
  const dayNum = parseInt(day.cdate.split('-')[2], 10);
  const dateStr = day.cdate;
  const dayStr = String(dayNum).padStart(2, '0');
  const isFuture = dateStr > today;
  const isToday = dateStr === today;
  const isPlanned = hasPlannedShift(day);
  const isNonWorkingDay = !isPlanned;

  // Day number color
  const dayColor = day.annual || day.leave
    ? 'text-darkgray'
    : !isPlanned
      ? 'text-blue'
      : '';

  // Annual leave: special row, no shift breakdown
  if (day.annual) {
    return (
      <View className="border-b border-darkgray/10 bg-yellow/10">
        <View className="flex-row">
          <View className="w-14 h-14 items-center justify-center">
            <AppText className={cn('text-lg', dayColor)}>{dayStr}</AppText>
          </View>
          <View className="flex-1 items-center justify-center">
            <HugeiconsIcon icon={Sun03StrokeStandard} size={24} color="#F0B400" />
          </View>
          <View className="flex-1 items-center justify-center" />
          <View className="flex-1 items-center justify-center" />
        </View>
      </View>
    );
  }

  const shifts: (Shift | null)[] = day.shifts.length > 0 ? day.shifts : [null];
  const isCurrentMonth = dateStr.slice(0, 7) === today.slice(0, 7);

  const buildShiftPress = (shift: Shift) => {
    if (!timeCorrectionId || !isCurrentMonth || !shift.actual_start) return undefined;
    return () => {
      const arrivedTime = extractTime(shift.actual_start) ?? '';
      const leftTime = extractTime(shift.actual_end) ?? '';
      const arrivedDt = shift.actual_start?.slice(0, 16) ?? '';
      const leftDt = shift.actual_end?.slice(0, 16) ?? '';
      const headerInfoPayload = [
        { label: 'Ирсэн, тарсан цаг', value: `${arrivedTime} - ${leftTime}` },
      ];
      const shiftPayload = { arrived: arrivedDt, left: leftDt };
      router.navigate({
        pathname: '/request/create',
        params: {
          id: timeCorrectionId,
          shiftId: String(shift.id),
          cdate: day.cdate,
          title: `Цаг засах  ${String(month).padStart(2, '0')}/${dayStr}`,
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
        <View className="bg-darkgray/7 px-3 py-1">
          <AppText className="text-gray text-xs">{day.leave}</AppText>
        </View>
      )}
    </View>
  );
}

function TimesheetList({
  data,
  month,
  timeCorrectionId,
}: {
  data: TimesheetDay[];
  month: number;
  timeCorrectionId: string | null;
}) {
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <View className="pb-20">
      {/* Header */}
      <View className="flex-row">
        <View className="w-14" />
        <View className="flex-1 items-center justify-center">
          <HugeiconsIcon icon={LoginCircle02Icon} size={22} color="#005FEE" />
        </View>
        <View className="flex-1 items-center justify-center">
          <HugeiconsIcon icon={LogoutCircle02Icon} size={22} color="#005FEE" />
        </View>
        <View className="flex-1 items-center justify-center">
          <HugeiconsIcon icon={Clock01Icon} size={22} color="#005FEE" />
        </View>
      </View>

      {/* Rows */}
      {data.map((day) => (
        <TimesheetListRow
          key={day.cdate}
          day={day}
          month={month}
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

      <TimesheetList data={monthData} month={month} timeCorrectionId={timeCorrectionId} />
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

  const yearStatsRows = [
    {
      label: 'Тайлант жил',
      value: `${stats?.total_work_days ?? 0} хоног, ${formatMinutesHHMM(stats?.total_planned_minutes ?? 0)} цаг`,
    },
    { label: 'Ажилласан энгийн', value: `${formatMinutesHHMM(stats?.total_worked_minutes ?? 0)} цаг` },
    { label: 'Илүү цаг', value: `${formatMinutesHHMM(totalOvertimeMinutes)} цаг` },
    { label: 'Нөхөн амарсан цаг', value: `${formatMinutesHHMM(stats?.total_compensatory_rest_minutes ?? 0)} цаг` },
    { label: 'Цалинтай чөлөө', value: `${formatMinutesHHMM(stats?.total_paid_leave_minutes ?? 0)} цаг` },
    { label: 'Хоцорсон', value: `${formatMinutesHHMM(stats?.total_lateness_minutes ?? 0)} цаг` },
    { label: 'Цалингүй чөлөө', value: `${formatMinutesHHMM(stats?.total_unpaid_leave_minutes ?? 0)} цаг` },
  ];

  const totalHolidayDays = holidays.reduce((sum, h) => sum + h.dates.length, 0);

  const formatRange = (s: { start_date: string; end_date: string }) =>
    `${s.start_date.slice(5).replace('-', '/')} - ${s.end_date.slice(5).replace('-', '/')}`;

  const validSplits = (extra?.annual_leave_splits ?? []).filter((s) => s?.start_date && s?.end_date);
  const validPlanSplits = (extra?.annual_leave_plan_splits ?? []).filter((s) => s?.start_date && s?.end_date);
  const hasSplits = !!extra?.has_annual_leave && (validSplits.length > 0 || validPlanSplits.length > 0);
  const splitFormattedList = validSplits.map(formatRange);
  const planSplitFormattedList = validPlanSplits.map(formatRange);
  const hasMedical = !!extra?.medical_examinations?.[0];
  const medicalFormatted = hasMedical
    ? extra!.medical_examinations[0].slice(5).replace('-', '/')
    : 'Хамрагдаагүй';

  const highlightRanges = useMemo(() => {
    const ranges: { start: string; end: string; color: 'blue' | 'green' | 'green/50' | 'cyan' }[] = [];
    holidays.forEach((h) => {
      if (h.dates.length === 0) return;
      ranges.push({ start: h.dates[0], end: h.dates[h.dates.length - 1], color: 'blue' });
    });
    if (extra?.has_annual_leave) {
      // Confirmed splits (bright green) first so .find() picks them over plans on overlap.
      extra.annual_leave_splits?.forEach((s) => {
        if (s?.start_date && s?.end_date) {
          ranges.push({ start: s.start_date, end: s.end_date, color: 'green' });
        }
      });
      extra.annual_leave_plan_splits?.forEach((s) => {
        if (s?.start_date && s?.end_date) {
          ranges.push({ start: s.start_date, end: s.end_date, color: 'green/50' });
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
      {/* Stats */}
      <View className="gap-3">
        {yearStatsRows.map((item) => (
          <View key={item.label} className="flex-row justify-between">
            <AppText className="text-sm text-darkgray">{item.label}</AppText>
            <AppText className="text-sm">{item.value}</AppText>
          </View>
        ))}
      </View>

      <Separator className="bg-darkgray/15 my-5" />

      {/* Extra stats */}
      <View className="gap-3">
        <View className="flex-row justify-between">
          <AppText className="text-sm text-darkgray">Э/амралтын боломжит хоног</AppText>
          <AppText className="text-sm">{extra?.annual_leave_available_days ?? 0} хоног</AppText>
        </View>

        <View className="flex-row justify-between">
          <AppText className="text-sm text-darkgray">Э/амралт төлөвлөсөн хуваарь</AppText>
          {hasSplits ? (
            <View className="items-end gap-1">
              {splitFormattedList.map((s, i) => (
                <AppText key={`s-${i}`} className="text-sm text-green">{s}</AppText>
              ))}
              {planSplitFormattedList.map((s, i) => (
                <AppText key={`p-${i}`} className="text-sm text-green/50">{s}</AppText>
              ))}
            </View>
          ) : (
            <AppText className="text-sm text-red">Төлөвлөөгүй</AppText>
          )}
        </View>

        <View className="flex-row justify-between">
          <AppText className="text-sm text-darkgray">Эрүүл мэндийн үзлэг</AppText>
          <AppText className={cn('text-sm', hasMedical ? 'text-darkcyan' : 'text-red')}>
            {medicalFormatted}
          </AppText>
        </View>

        <View className="flex-row justify-between mb-7.5">
          <AppText className="text-sm text-darkgray">Нийтээр амрах баярын өдөр</AppText>
          <Pressable className="flex-row gap-1 items-center" onPress={() => setShowHoliday(!showHoliday)}>
            <HugeiconsIcon icon={ArrowDown01Icon} />
            <AppText className="text-sm font-medium text-blue">{totalHolidayDays} хоног</AppText>
          </Pressable>
        </View>
      </View>

      {/* Holidays */}
      {
        showHoliday && (
          <View className="gap-3 mb-7.5">
            {holidays.map((h) => (
              <View key={h.key} className="flex-row gap-3">
                <AppText className="text-sm text-blue w-24">{formatHolidayDates(h.dates)}</AppText>
                <AppText className="text-sm flex-1">{h.name}</AppText>
              </View>
            ))}
          </View>
        )
      }

      {/* Mini calendars grid - 2 per row */}
      <View className="gap-3 pb-20">
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
      </View>
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
  const MONTH_OPTIONS: SelectOption[] = useMemo(
    () =>
      Array.from({ length: currentMonth }, (_, i) => {
        const m = currentMonth - i;
        const value = String(m).padStart(2, '0');
        return { value, label: `${value} сар` };
      }),
    [currentMonth],
  );

  const [availableYears, setAvailableYears] = useState<number[]>([today.year()]);

  const YEAR_OPTIONS: SelectOption[] = useMemo(
    () =>
      [...availableYears]
        .sort((a, b) => b - a)
        .map((y) => ({ value: String(y), label: `${y} он` })),
    [availableYears],
  );

  const [selectedMonth, setSelectedMonth] = useState<SelectOption>(MONTH_OPTIONS[0]);
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
            title="Ажлын хуваарь, цагийн мэдээлэл"
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