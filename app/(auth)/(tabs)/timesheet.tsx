import { View, ScrollView, Pressable } from 'react-native';
import { cn, Separator } from 'heroui-native';
import { withUniwind } from 'uniwind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/app-text';
import { TimesheetCalendar, MiniCalendar } from '@/components/timesheet-calendar';
import type { DayData } from '@/components/timesheet-calendar';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  ArrowDown01Icon,
  Clock01Icon,
  LoginCircle02Icon,
  LogoutCircle02Icon,
  Sun03StrokeStandard,
  TimeQuarterPassIcon,
} from '@hugeicons-pro/core-stroke-standard';
import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { AppSelect, SelectOption } from "@/components/app-select";
import { router } from "expo-router";

const StyledSafeAreaView = withUniwind(SafeAreaView);

type ViewMode = 'month' | 'year';

// --- Month day data ---

interface MonthDayData {
  day: number;
  isNonWorkingDay: boolean;
  isHoliday?: boolean;
  arrived?: string;
  isLate?: boolean;
  left?: string;
  workHour?: string;
  overtime?: string;
  overtimeStart?: string;
  overtimeEnd?: string;
  leave?: string;
  clockIn?: string;
  clockOut?: string;
  annualLeave?: boolean;
}

// Mock data
const MOCK_MONTH_DATA: MonthDayData[] = [
  { day: 1, isNonWorkingDay: false, arrived: "09:31", isLate: true, left: "18:21", workHour: "07:50", overtime: "02:30", overtimeStart: "19:00", overtimeEnd: "21:30" },
  { day: 2, isNonWorkingDay: true },
  { day: 3, isNonWorkingDay: true },
  { day: 4, isNonWorkingDay: false, isHoliday: true },
  { day: 5, isNonWorkingDay: false, leave: "Өвчний чөлөө /5 хүртэлх хоног, цалинтай/" },
  { day: 6, isNonWorkingDay: false, leave: "Өвчний чөлөө /5 хүртэлх хоног, цалинтай/" },
  { day: 7, isNonWorkingDay: false, arrived: "08:51", isLate: false, left: "18:21", workHour: "07:50", overtime: "02:30", overtimeStart: "19:00", overtimeEnd: "21:30" },
  { day: 8, isNonWorkingDay: false, arrived: "09:51", isLate: true, left: "18:21", workHour: "07:50" },
  { day: 9, isNonWorkingDay: true },
  { day: 10, isNonWorkingDay: true },
  { day: 11, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 12, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 13, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 14, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 15, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 16, isNonWorkingDay: true },
  { day: 17, isNonWorkingDay: true },
  { day: 18, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 19, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 20, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 21, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 22, isNonWorkingDay: false },
  { day: 23, isNonWorkingDay: true },
  { day: 24, isNonWorkingDay: true },
  { day: 25, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 26, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 27, isNonWorkingDay: false, clockIn: "09:00", clockOut: "18:00" },
  { day: 28, isNonWorkingDay: false, annualLeave: true, clockIn: "09:00", clockOut: "18:00" },
  { day: 29, isNonWorkingDay: false, annualLeave: true, clockIn: "09:00", clockOut: "18:00" },
  { day: 30, isNonWorkingDay: true },
  { day: 31, isNonWorkingDay: true },
];

function deriveDayData(monthData: MonthDayData[], year: number, month: number): DayData[] {
  return monthData.map(d => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
    const data: DayData = { date };
    if (d.isNonWorkingDay) data.isNonWorkingDay = true;
    if (d.isHoliday) data.isHoliday = true;
    if (d.overtime) data.hasOvertime = true;
    if (d.isLate) data.isLate = true;
    if (d.leave) data.isLeave = true;
    if (d.annualLeave) data.isAnnualLeave = true;
    return data;
  });
}

// Mock year view data
const YEAR_STATS = [
  { label: 'Тайлант жил', value: '320 хоног, 2016:00 цаг' },
  { label: 'Ажилласан энгийн', value: '2016:00 цаг' },
  { label: 'Илүү цаг', value: '2016:00 цаг' },
  { label: 'Э/амралтын цаг', value: '2016:00 цаг' },
  { label: 'Нөхөн амарсан цаг', value: '2016:00 цаг' },
  { label: 'Цалинтай чөлөө', value: '16:00 цаг' },
  { label: 'Хоцорсон, тасалсан', value: '16:00 цаг' },
  { label: 'Цалингүй чөлөө', value: '16:00 цаг' },
  { label: 'Сул зогсолт', value: '16:00 цаг' },
];

const YEAR_EXTRA = [
  { label: 'Э/амралтын боломжит хоног', value: '12 хоног' },
  { label: 'Э/амралт төлөвлөсөн хуваарь', value: '07/26 - 08/15', className: "text-green" },
  { label: 'Эрүүл мэндийн үзлэг', value: '11/15', className: "text-darkcyan" },
];

const HOLIDAYS = [
  { date: '01/01', name: 'Шинэ жил / 2024 - 2025' },
  { date: '02/10 - 02/12', name: 'Цагаан сар' },
  { date: '03/08', name: 'Олон улсын эмэгтэйчүүдийн өдөр' },
  { date: '05/23', name: 'Бурхан багшийн Их дүйчин өдөр' },
  { date: '06/01', name: 'Хүүхдийн баяр' },
  { date: '06/28', name: 'УИХ сонгууль' },
  { date: '07/11 - 07/15', name: 'Үндэсний их баяр наадам' },
  { date: '11/02', name: 'Эзэн Чингис хааны өдөр' },
  { date: '11/26', name: 'Бүгд Найрамдах Улс тунхагласан өдөр' },
  { date: '12/29', name: 'Үндэсний эрх чөлөө, тусгаар тогтнолоо сэргээсний баярын өдөр' },
];

const YEAR_HIGHLIGHT_RANGES = [
  { start: '2026-07-11', end: '2026-07-15', color: 'blue' as const },
  { start: '2026-08-01', end: '2026-08-15', color: 'green' as const },
  { start: '2026-11-15', end: '2026-11-15', color: 'cyan' as const },
];

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

function TimesheetListRow({
  day,
  year,
  month,
  today,
}: {
  day: MonthDayData;
  year: number;
  month: number;
  today: string;
}) {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
  const isFuture = dateStr > today;
  const dayStr = String(day.day).padStart(2, '0');

  // Day number color
  const dayColor = day.isHoliday
    ? 'text-blue'
    : (day.isNonWorkingDay || day.annualLeave || day.leave)
      ? 'text-darkgray'
      : '';

  // Annual leave: special row
  if (day.annualLeave) {
    return (
      <Pressable className="border-b border-darkgray/10 bg-yellow/10">
        <View className="flex-row">
          <View className="w-14 items-center justify-center py-4">
            <AppText className={cn('text-lg', dayColor)}>{dayStr}</AppText>
          </View>
          <View className="flex-1 items-center justify-center">
            <HugeiconsIcon icon={Sun03StrokeStandard} size={24} color="#F0B400" />
          </View>
          <View className="flex-1 items-center justify-center" />
          <View className="flex-1 items-center justify-center" />
          <View className="flex-1 items-center justify-center" />
        </View>
      </Pressable>
    );
  }

  // Determine column values and colors
  let arrivedDisplay = '00:00';
  let arrivedColor = 'text-darkgray/15';
  let leftDisplay = '00:00';
  let leftColor = 'text-darkgray/15';
  let workHourDisplay = '00:00';
  let workHourColor = 'text-darkgray/15';
  let overtimeDisplay = '00:00';
  let overtimeColor = 'text-darkgray/15';

  if (day.arrived) {
    arrivedDisplay = day.arrived;
    arrivedColor = day.isLate ? 'text-red' : 'text-darkgray';
  } else if (isFuture && !day.isNonWorkingDay && !day.leave && day.clockIn) {
    arrivedDisplay = day.clockIn;
    arrivedColor = 'text-darkgray/40';
  }

  if (day.left) {
    leftDisplay = day.left;
    leftColor = 'text-darkgray';
  } else if (isFuture && !day.isNonWorkingDay && !day.leave && day.clockOut) {
    leftDisplay = day.clockOut;
    leftColor = 'text-darkgray/40';
  }

  if (day.workHour) {
    workHourDisplay = day.workHour;
    workHourColor = 'font-medium';
  }

  if (day.overtime) {
    overtimeDisplay = day.overtime;
    overtimeColor = 'text-green';
  }

  const isToday = dateStr === today;

  return (
    <Pressable
      className="border-b border-darkgray/10"
      onPress={day.arrived ? () => router.push({
        pathname: '/request/create',
        params: {
          title: `Цаг засах  ${String(month).padStart(2, '0')}/${dayStr}`,
          type: 'timeCorrection',
          headerInfo: JSON.stringify([
            { label: 'Ирсэн, тарсан цаг', value: `${day.arrived} - ${day.left ?? ''}` },
            ...(day.overtimeStart ? [{ label: 'Илүү цаг', value: `${day.overtimeStart} - ${day.overtimeEnd ?? ''}` }] : []),
          ]),
          arrived: day.arrived,
          left: day.left ?? '',
          overtimeStart: day.overtimeStart ?? '',
          overtimeEnd: day.overtimeEnd ?? '',
        },
      }) : undefined}
    >
      <View className="flex-row">
        <View className={cn('w-14 items-center justify-center py-4', isToday && 'bg-lightblue')}>
          <AppText className={cn('text-lg', dayColor)}>{dayStr}</AppText>
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
        <View className="flex-1 items-center justify-center">
          <AppText className={cn('text-sm', overtimeColor)}>{overtimeDisplay}</AppText>
        </View>
      </View>
      {day.leave && (
        <View className="bg-darkgray/7 px-3 py-1">
          <AppText className="text-gray text-xs">{day.leave}</AppText>
        </View>
      )}
    </Pressable>
  );
}

function TimesheetList({
  data,
  year,
  month,
}: {
  data: MonthDayData[];
  year: number;
  month: number;
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
        <View className="flex-1 items-center justify-center">
          <HugeiconsIcon icon={TimeQuarterPassIcon} size={22} color="#005FEE" />
        </View>
      </View>

      {/* Rows */}
      {data.map((day) => (
        <TimesheetListRow
          key={day.day}
          day={day}
          year={year}
          month={month}
          today={today}
        />
      ))}
    </View>
  );
}

// --- Month View ---

function MonthView({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const calendarDayData = useMemo(
    () => deriveDayData(MOCK_MONTH_DATA, year, month),
    [year, month],
  );

  return (
    <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
      <View className="mb-5">
        <TimesheetCalendar
          year={year}
          month={month}
          dayData={calendarDayData}
          hideOtherMonthDays
        />
      </View>

      <TimesheetList data={MOCK_MONTH_DATA} year={year} month={month} />
    </ScrollView>
  );
}

// --- Year View ---

function YearView({ year }: { year: number }) {
  const [showHoliday, setShowHoliday] = useState(false);

  return (
    <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
      {/* Stats */}
      <View className="gap-3">
        {YEAR_STATS.map((item) => (
          <View key={item.label} className="flex-row justify-between">
            <AppText className="text-sm text-darkgray">{item.label}</AppText>
            <AppText className="text-sm">{item.value}</AppText>
          </View>
        ))}
      </View>

      <Separator className="bg-darkgray/15 my-5" />

      {/* Extra stats */}
      <View className="gap-3">
        {YEAR_EXTRA.map((item) => (
          <View key={item.label} className="flex-row justify-between">
            <AppText className="text-sm text-darkgray">{item.label}</AppText>
            <AppText
              className={cn(
                'text-sm',
                item.className,
              )}
            >
              {item.value}
            </AppText>
          </View>
        ))}
        <View className="flex-row justify-between mb-7.5">
          <AppText className="text-sm text-darkgray">Нийтээр амрах баярын өдөр</AppText>
          <Pressable className="flex-row gap-1 items-center" onPress={() => setShowHoliday(!showHoliday)}>
            <HugeiconsIcon icon={ArrowDown01Icon} />
            <AppText className="text-sm font-medium text-blue">12 хоног</AppText>
          </Pressable>
        </View>
      </View>

      {/* Holidays */}
      {
        showHoliday && (
          <View className="gap-3 mb-7.5">
            {HOLIDAYS.map((h) => (
              <View key={h.date} className="flex-row gap-3">
                <AppText className="text-sm text-blue w-24">{h.date}</AppText>
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
              highlightRanges={YEAR_HIGHLIGHT_RANGES}
              hideOtherMonthDays
            />
            <MiniCalendar
              year={year}
              month={i * 2 + 2}
              highlightRanges={YEAR_HIGHLIGHT_RANGES}
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

  const MONTH_OPTIONS: SelectOption[] = [
    { value: '05', label: '05 сар' },
    { value: '04', label: '04 сар' },
    { value: '03', label: '03 сар' },
    { value: '02', label: '02 сар' },
    { value: '01', label: '01 сар' },
  ];

  const YEAR_OPTIONS: SelectOption[] = [
    { value: '2026', label: '2026 он' },
    { value: '2025', label: '2025 он' },
    { value: '2024', label: '2024 он' },
    { value: '2023', label: '2023 он' },
  ];

  const [selectedMonth, setSelectedMonth] = useState<SelectOption>(MONTH_OPTIONS[0]);
  const [selectedYear, setSelectedYear] = useState<SelectOption>(YEAR_OPTIONS[0]);

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
              <AppText className="text-xl leading-5 font-medium">{selectedMonth.label}</AppText>
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
              <AppText className="text-xl leading-5 font-medium">{selectedYear.label}</AppText>
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
        />
      ) : (
        <YearView year={parseInt(selectedYear.value)} />
      )}
    </StyledSafeAreaView>
  );
}