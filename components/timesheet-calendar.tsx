import { AppText } from '@/components/app-text';
import { Sun03Icon } from "@hugeicons-pro/core-solid-standard";
import { HugeiconsIcon } from '@hugeicons/react-native';
import dayjs from 'dayjs';
import { cn } from 'heroui-native';
import React, { useMemo } from 'react';
import { View } from 'react-native';

const WEEKDAYS = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];

export interface DayData {
  date: string; // YYYY-MM-DD
  isNonWorkingDay?: boolean;
  isHoliday?: boolean;
  hasOvertime?: boolean;
  isLate?: boolean;
  isLeave?: boolean;
  isAnnualLeave?: boolean;
}

interface TimesheetCalendarProps {
  year: number;
  month: number; // 1-12
  dayData?: DayData[];
  className?: string;
  hideOtherMonthDays?: boolean;
}

interface CalendarDay {
  day: number;
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  dayOfWeek: number; // 0=Mon, 6=Sun
}

function generateCalendarDays(year: number, month: number): CalendarDay[][] {
  const firstOfMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const daysInMonth = firstOfMonth.daysInMonth();
  const today = dayjs().format('YYYY-MM-DD');

  // dayjs .day() returns 0=Sun, we want 0=Mon
  const startDow = (firstOfMonth.day() + 6) % 7;

  const days: CalendarDay[] = [];

  // Previous month padding
  const prevMonth = firstOfMonth.subtract(1, 'month');
  const prevDaysInMonth = prevMonth.daysInMonth();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevDaysInMonth - i;
    const date = prevMonth.date(d);
    days.push({
      day: d,
      date: date.format('YYYY-MM-DD'),
      isCurrentMonth: false,
      isToday: date.format('YYYY-MM-DD') === today,
      isWeekend: days.length % 7 >= 5,
      dayOfWeek: days.length % 7,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = firstOfMonth.date(d);
    const dow = days.length % 7;
    days.push({
      day: d,
      date: date.format('YYYY-MM-DD'),
      isCurrentMonth: true,
      isToday: date.format('YYYY-MM-DD') === today,
      isWeekend: dow >= 5,
      dayOfWeek: dow,
    });
  }

  // Next month padding
  const remaining = days.length % 7;
  if (remaining > 0) {
    const nextMonth = firstOfMonth.add(1, 'month');
    for (let d = 1; d <= 7 - remaining; d++) {
      const date = nextMonth.date(d);
      const dow = days.length % 7;
      days.push({
        day: d,
        date: date.format('YYYY-MM-DD'),
        isCurrentMonth: false,
        isToday: date.format('YYYY-MM-DD') === today,
        isWeekend: dow >= 5,
        dayOfWeek: dow,
      });
    }
  }

  // Split into weeks
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function DayCell({
  day,
  dayDataMap,
  hideOtherMonthDays
}: {
  day: CalendarDay;
  dayDataMap?: Record<string, DayData>;
  hideOtherMonthDays?: boolean;
}) {
  const data = dayDataMap?.[day.date];

  if (hideOtherMonthDays && !day.isCurrentMonth) {
    return <View className="flex-1" />;
  }

  return (
    <View className={cn(
      'flex-1 aspect-square items-center justify-center rounded-md',
      day.isToday && day.isCurrentMonth && 'bg-lightblue',
    )}>
      <View className="">
        <AppText
          className={cn(
            'text-sm font-medium',
            !day.isCurrentMonth && 'text-darkgray/30',
            day.isCurrentMonth && 'text-black',
            day.isCurrentMonth && data?.isNonWorkingDay && 'text-darkgray/50',
            day.isCurrentMonth && data?.isHoliday && 'text-blue',
          )}
        >
          {day.day}
        </AppText>
      </View>
      {/* Indicators */}
      <View className="flex-row gap-0.5 h-2 mt-1 items-center">
        {day.isCurrentMonth && data?.hasOvertime && (
          <View className="w-1.5 h-1.5 rounded-full bg-green" />
        )}
        {day.isCurrentMonth && data?.isLate && (
          <View className="w-1.5 h-1.5 rounded-full bg-red" />
        )}
        {day.isCurrentMonth && data?.isLeave && (
          <View className="w-6 h-1.5 rounded-full bg-darkgray/30" />
        )}
        {day.isCurrentMonth && data?.isAnnualLeave && (
          <HugeiconsIcon icon={Sun03Icon} size={12} color="#F0B400" />
        )}
      </View>
    </View>
  );
}

export function TimesheetCalendar({
  year,
  month,
  dayData,
  className,
  hideOtherMonthDays
}: TimesheetCalendarProps) {
  const weeks = useMemo(() => generateCalendarDays(year, month), [year, month]);
  const dayDataMap = useMemo(
    () => dayData?.reduce<Record<string, DayData>>((acc, d) => { acc[d.date] = d; return acc; }, {}),
    [dayData],
  );

  return (
    <View className={cn('', className)}>
      {/* Weekday headers */}
      <View className="flex-row mb-3">
        {WEEKDAYS.map((label, i) => (
          <View key={label} className="flex-1 items-center py-1">
            <AppText
              className={cn(
                'text-sm font-medium',
                i >= 5 ? 'text-blue' : 'text-darkgray',
              )}
            >
              {label}
            </AppText>
          </View>
        ))}
      </View>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row">
          {week.map((day) => (
            <DayCell
              key={day.date}
              day={day}
              dayDataMap={dayDataMap}
              hideOtherMonthDays={hideOtherMonthDays}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// --- Mini calendar for year view ---

interface MiniCalendarProps {
  year: number;
  month: number; // 1-12
  dayDataMap?: Record<string, DayData>;
  highlightRanges?: { start: string; end: string; color: 'green' | 'green/50' | 'blue' | 'cyan' }[];
  hideOtherMonthDays?: boolean;
}

function MiniDayCell({
  day,
  dayDataMap,
  highlightRanges,
  hideOtherMonthDays,
}: {
  day: CalendarDay;
  dayDataMap?: Record<string, DayData>;
  highlightRanges?: MiniCalendarProps['highlightRanges'];
  hideOtherMonthDays?: boolean;
}) {
  if (hideOtherMonthDays && !day.isCurrentMonth) {
    return <View className="flex-1" />;
  }
  const data = dayDataMap?.[day.date];
  const isNonWorking = data ? !!data.isNonWorkingDay : false;
  const rawHighlight = highlightRanges?.find(
    (r) => day.date >= r.start && day.date <= r.end && day.isCurrentMonth,
  );
  // Annual leave (green/green-50) skips non-working days within the range.
  const isAnnualLeave = rawHighlight?.color === 'green' || rawHighlight?.color === 'green/50';
  const highlight = rawHighlight && isAnnualLeave && isNonWorking ? undefined : rawHighlight;

  return (
    <View className="flex-1 items-center py-0.5">
      <View
        className={cn(
          'w-5 h-5 items-center justify-center rounded-full',
          day.isToday && 'bg-lightblue',
          highlight?.color === 'green' && 'bg-green',
          highlight?.color === 'green/50' && 'bg-green/50',
          highlight?.color === 'blue' && 'bg-blue',
          highlight?.color === 'cyan' && 'bg-cyan',
        )}
      >
        <AppText
          className={cn(
            'text-xs',
            !day.isCurrentMonth && 'text-darkgray/30',
            day.isCurrentMonth && isNonWorking && 'text-darkgray/30',
            day.isCurrentMonth && !isNonWorking && 'text-black',
            highlight && day.isCurrentMonth && 'text-white',
          )}
        >
          {day.day}
        </AppText>
      </View>
    </View>
  );
}

export function MiniCalendar({ year, month, dayDataMap, highlightRanges, hideOtherMonthDays }: MiniCalendarProps) {
  const weeks = useMemo(() => generateCalendarDays(year, month), [year, month]);
  const monthLabel = `${month} сар`;

  return (
    <View className="flex-1 gap-0.5">
      {/* Month label */}
      <View className="bg-lightblue rounded-md py-1.5 px-2">
        <AppText className="text-xs font-medium text-darkblue text-center">{monthLabel}</AppText>
      </View>

      <View className="px-1 pb-1">
        {/* Weekday headers */}
        <View className="flex-row py-1">
          {['Д', 'М', 'Л', 'П', 'Б', 'Б', 'Н'].map((label, i) => (
            <View key={i} className="flex-1 items-center py-0.5">
              <AppText
                className={cn(
                  'text-xs font-medium',
                  i >= 5 ? 'text-blue' : 'text-black',
                )}
              >
                {label}
              </AppText>
            </View>
          ))}
        </View>

        {/* Day grid */}
        {weeks.map((week, wi) => (
          <View key={wi} className="flex-row">
            {week.map((day) => (
              <MiniDayCell
                key={day.date}
                day={day}
                dayDataMap={dayDataMap}
                highlightRanges={highlightRanges}
                hideOtherMonthDays={hideOtherMonthDays}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}