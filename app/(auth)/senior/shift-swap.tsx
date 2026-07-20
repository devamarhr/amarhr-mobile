import { AppButton } from "@/components/app-button";
import { AppHeader } from "@/components/app-header";
import { AppIcon } from "@/components/app-icon";
import { AppText } from "@/components/app-text";
import { AppToast } from "@/components/app-toast";
import { api } from "@/config/api";
import { BottomSheetScrollView, type BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
import {
  Alert01Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Tick02Icon,
  UserSwitchIcon,
} from "@hugeicons-pro/core-stroke-standard";
import dayjs from "dayjs";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar, BottomSheet, cn, Separator, useToast } from "heroui-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

const WEEKDAYS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
// Sunday-first to align with dayjs().day() (0 = Sunday).
const WEEKDAYS_FULL = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

interface ShiftEmployee {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  job_position?: string | null;
  roster_template?: { id: number; name: string } | null;
}

interface MonthScheduleShift {
  timesheet_id: number;
  shift_index: number;
  planned_start: string; // "YYYY-MM-DD HH:mm:ss"
  planned_end: string; // shöний ээлж маргааш руу шилжинэ
}

interface MonthScheduleDay {
  day: number; // 1–31
  shifts: MonthScheduleShift[]; // ээлжгүй/амралттай өдөр → []
}

interface DayShift {
  timesheet_id: number;
  start: string;
  end: string;
}

interface TargetShift extends DayShift {
  date: string;
}

function shortName(p: { first_name?: string | null; last_name?: string | null }): string {
  const initial = p.last_name?.[0];
  return initial ? `${initial}.${p.first_name ?? ""}` : p.first_name ?? "";
}

function avatarFallback(p: { first_name?: string | null; last_name?: string | null }): string {
  return ((p.last_name?.[0] ?? "") + (p.first_name?.[0] ?? "")) || "?";
}

function DateLabel({ date }: { date: string }) {
  return (
    <AppText className="text-base text-darkgray">
      {dayjs(date).format("MM/DD")}{" "}
      <AppText className="text-xs text-darkgray">{WEEKDAYS_FULL[dayjs(date).day()]}</AppText>
    </AppText>
  );
}

export default function SeniorShiftSwapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();

  const params = useLocalSearchParams<{
    employeeId: string;
    firstName?: string;
    lastName?: string;
    jobPosition?: string;
    profileImageUrl?: string;
    timesheetId: string;
    rosterTemplateId?: string;
    date: string;
    shiftStart?: string;
    shiftEnd?: string;
    shiftIndex?: string;
  }>();

  const sourceEmployeeId = Number(params.employeeId);
  const sourceTimesheetId = Number(params.timesheetId);
  const rosterTemplateId = params.rosterTemplateId ? Number(params.rosterTemplateId) : null;
  const sourceDate = params.date ?? dayjs().format("YYYY-MM-DD");
  const sourcePerson = {
    first_name: params.firstName ?? null,
    last_name: params.lastName ?? null,
    profile_image_url: params.profileImageUrl ?? null,
  };

  // Target selection
  const [targetEmployee, setTargetEmployee] = useState<ShiftEmployee | null>(null);
  const [targetShift, setTargetShift] = useState<TargetShift | null>(null);

  // Employee picker sheet
  const [pickerOpen, setPickerOpen] = useState(false);
  const [employees, setEmployees] = useState<ShiftEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const pickerScrollRef = useRef<BottomSheetScrollViewMethods>(null);

  // Calendar sheet
  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => dayjs(sourceDate).startOf("month"));
  const [pickDate, setPickDate] = useState<string | null>(null);
  const [monthSchedule, setMonthSchedule] = useState<MonthScheduleDay[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const showToast = useCallback(
    (message: string, ok: boolean) => {
      toast.show({
        component: (props) => (
          <AppToast
            {...props}
            variant={ok ? "success" : "danger"}
            description={message}
            icon={
              <AppIcon
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

  // Load the same-roster employees when the picker opens.
  useEffect(() => {
    if (!pickerOpen || rosterTemplateId == null) return;
    setEmployeesLoading(true);
    pickerScrollRef.current?.scrollTo({ y: 0, animated: false });
    api<ShiftEmployee[]>({
      path: `/senior/timesheet/shift-employees?roster_template_id=${rosterTemplateId}`,
      method: "GET",
    })
      .then((res) => {
        if (res.status === 200 && Array.isArray(res.data)) {
          setEmployees(res.data.filter((e) => e.id !== sourceEmployeeId));
        }
      })
      .catch(console.error)
      .finally(() => setEmployeesLoading(false));
  }, [pickerOpen, rosterTemplateId, sourceEmployeeId]);

  const handleSelectEmployee = useCallback((emp: ShiftEmployee) => {
    setTargetEmployee(emp);
    setTargetShift(null);
    setPickerOpen(false);
  }, []);

  // Fetch the target employee's planned shifts for the whole month so the
  // calendar can mark working days (dark) vs non-working days (gray).
  const loadMonthSchedule = useCallback((employeeId: number, month: dayjs.Dayjs) => {
    setMonthSchedule([]);
    setMonthLoading(true);
    api<MonthScheduleDay[]>({
      path: `/senior/timesheet/employee-schedule?employee_id=${employeeId}&year=${month.year()}&month=${month.month() + 1}`,
      method: "GET",
    })
      .then((res) => {
        if (res.status === 200 && Array.isArray(res.data)) {
          setMonthSchedule(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setMonthLoading(false));
  }, []);

  const handlePickDate = useCallback((date: string) => {
    setPickDate(date);
  }, []);

  const handleSelectDayShift = useCallback(
    (s: DayShift) => {
      if (!pickDate) return;
      setTargetShift({ ...s, date: pickDate });
      setCalOpen(false);
    },
    [pickDate]
  );

  const openPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const openCalendar = useCallback(() => {
    if (targetShift) {
      setCalMonth(dayjs(targetShift.date).startOf("month"));
      setPickDate(targetShift.date);
    } else {
      setCalMonth(dayjs(sourceDate).startOf("month"));
      setPickDate(null);
    }
    setCalOpen(true);
  }, [targetShift, sourceDate]);

  // (Re)load the month schedule whenever the calendar is open for an employee
  // or the displayed month changes.
  useEffect(() => {
    if (!calOpen || !targetEmployee) return;
    loadMonthSchedule(targetEmployee.id, calMonth);
  }, [calOpen, targetEmployee, calMonth, loadMonthSchedule]);

  // Calendar grid + navigation bounds (today's month .. +1 month, no past days).
  const todayStart = dayjs().startOf("day");
  const monthIdx = (m: dayjs.Dayjs) => m.year() * 12 + m.month();
  const minMonthIdx = monthIdx(dayjs().startOf("month"));
  const maxMonthIdx = minMonthIdx + 1;
  const canPrev = monthIdx(calMonth) > minMonthIdx;
  const canNext = monthIdx(calMonth) < maxMonthIdx;

  const calWeeks = useMemo(() => {
    const start = calMonth.startOf("month");
    const daysInMonth = start.daysInMonth();
    const lead = (start.day() + 6) % 7; // Monday-first offset
    const cells: ({ day: number; date: string } | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, date: start.date(d).format("YYYY-MM-DD") });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: ({ day: number; date: string } | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [calMonth]);

  // Day numbers (1–31) the employee has at least one planned shift this month.
  const workDays = useMemo(() => {
    const s = new Set<number>();
    monthSchedule.forEach((d) => {
      if (d.shifts.length > 0) s.add(d.day);
    });
    return s;
  }, [monthSchedule]);

  // Shifts of the picked date, derived from the already-loaded month schedule.
  const dayShifts = useMemo<DayShift[]>(() => {
    if (!pickDate) return [];
    const entry = monthSchedule.find((d) => d.day === dayjs(pickDate).date());
    return (entry?.shifts ?? []).map((s) => ({
      timesheet_id: s.timesheet_id,
      start: dayjs(s.planned_start).format("HH:mm"),
      end: dayjs(s.planned_end).format("HH:mm"),
    }));
  }, [pickDate, monthSchedule]);

  const canSubmit = targetShift != null && sourceTimesheetId !== targetShift.timesheet_id;

  const handleSwap = useCallback(async () => {
    if (!canSubmit || !targetShift) return;
    setSubmitting(true);
    try {
      const res = await api<{ result?: string; message: string }>({
        path: "/senior/timesheet/shift/swap",
        method: "POST",
        data: {
          first_timesheet_id: sourceTimesheetId,
          second_timesheet_id: targetShift.timesheet_id,
        },
      });
      if (res.status === 200) {
        showToast(res.message || "Ээлжийг амжилттай соллоо.", true);
        router.back();
      } else {
        showToast(res.message || "Алдаа гарлаа", false);
      }
    } catch (e) {
      console.error("Shift swap failed:", e);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, targetShift, sourceTimesheetId, showToast, router]);

  return (
    <View className="flex-1 bg-background">
      <StyledSafeAreaView className="flex-1" edges={["top"]}>
        <View className="px-4">
          <AppHeader
            backTitle="Хуваарь солих"
            showBack
            backIcon={<AppIcon icon={ArrowLeft02Icon} color="#222222" size={24} />}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4 gap-[30px]">
            {/* Source card (fixed) */}
            <View className="flex-row items-center gap-2 rounded-[10px] bg-lightgray px-3 h-[72px]">
              <Avatar alt={shortName(sourcePerson)} className="w-[52px] h-[52px]">
                <Avatar.Image source={{ uri: params.profileImageUrl ?? "" }} />
                <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                  {avatarFallback(sourcePerson)}
                </Avatar.Fallback>
              </Avatar>
              <View className="flex-1">
                <AppText className="text-base" numberOfLines={1}>
                  {shortName(sourcePerson)}
                </AppText>
                {/* time (left) + date (right) share one row, per design */}
                <View className="flex-row items-center justify-between gap-2">
                  <AppText className="text-base text-darkgray shrink" numberOfLines={1}>
                    {params.shiftStart} - {params.shiftEnd}
                  </AppText>
                  <DateLabel date={sourceDate} />
                </View>
              </View>
            </View>

            {!targetEmployee ? (
              <Pressable
                onPress={openPicker}
                className="h-11 rounded-full bg-blue/10 border border-blue/10 items-center justify-center"
              >
                <AppText className="text-base font-semibold text-blue">
                  Хуваарь солих ажилтнаа сонгоно уу
                </AppText>
              </Pressable>
            ) : (
              <>
                {/* Target card — the swap icon floats centered in the 30px gap
                    above it (per design), so it adds no vertical space. */}
                <View className="relative flex-row items-center gap-2 rounded-[10px] bg-lightgray px-3 h-[72px]">
                  <View className="absolute -top-[26px] left-0 right-0 items-center">
                    <AppIcon icon={UserSwitchIcon} color="#005FEE" size={22} />
                  </View>
                  <Pressable
                    onPress={openPicker}
                    className="flex-1 flex-row items-center gap-2"
                  >
                    <Avatar alt={shortName(targetEmployee)} className="w-[52px] h-[52px]">
                      <Avatar.Image source={{ uri: targetEmployee.profile_image_url ?? "" }} />
                      <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                        {avatarFallback(targetEmployee)}
                      </Avatar.Fallback>
                    </Avatar>
                    <View className="flex-1">
                      <AppText className="text-base" numberOfLines={1}>
                        {shortName(targetEmployee)}
                      </AppText>
                      {targetShift ? (
                        // time (left) + date (right) on one row, per design. The
                        // date stays separately tappable (re-opens the calendar).
                        <View className="flex-row items-center justify-between gap-2">
                          <AppText className="text-base text-darkgray shrink" numberOfLines={1}>
                            {targetShift.start} - {targetShift.end}
                          </AppText>
                          <Pressable onPress={openCalendar} hitSlop={8}>
                            <DateLabel date={targetShift.date} />
                          </Pressable>
                        </View>
                      ) : (
                        <AppText className="text-sm text-red/60" numberOfLines={1}>
                          Солих хуваарь сонгогдоогүй байна
                        </AppText>
                      )}
                    </View>
                  </Pressable>
                </View>

                {!targetShift && (
                  <Pressable
                    onPress={openCalendar}
                    className="h-11 rounded-full bg-blue/10 border border-blue/10 items-center justify-center"
                  >
                    <AppText className="text-base font-semibold text-blue">
                      Солих хуваариа сонгоно уу
                    </AppText>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {targetShift && (
          <View className="px-4 bg-background" style={{ paddingBottom: insets.bottom + 10 }}>
            <AppButton
              label="Хадгалах"
              onPress={handleSwap}
              isDisabled={!canSubmit}
              isLoading={submitting}
              spinnerColor="#FFFFFF"
              className={cn(
                canSubmit ? "bg-blue border-blue/15" : "bg-darkgray/15 border-darkgray/10"
              )}
              labelClassName={cn(canSubmit ? "text-white" : "disabled:text-darkgray")}
            />
          </View>
        )}
      </StyledSafeAreaView>

      {/* Солигдох ажилтан picker */}
      <BottomSheet isOpen={pickerOpen} onOpenChange={setPickerOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay className="bg-scrim/40" />
          <BottomSheet.Content
            snapPoints={["92%"]}
            topInset={insets.top}
            enableOverDrag={false}
            enableDynamicSizing={false}
            handleComponent={null}
            contentContainerClassName="h-full p-0 rounded-t-[10px] border border-transparent bg-overlay overflow-hidden"
          >
            <View className="h-[60px] items-center justify-center">
              <AppText className="text-lg font-medium text-center">Солигдох ажилтан</AppText>
            </View>

            <BottomSheetScrollView
              ref={pickerScrollRef}
              contentContainerClassName="px-4 pb-8"
              showsVerticalScrollIndicator={false}
            >
              {employeesLoading ? (
                <View className="py-6 items-center">
                  <ActivityIndicator />
                </View>
              ) : employees.length === 0 ? (
                <View className="py-6 items-center">
                  <AppText className="text-sm text-darkgray">Ажилтан олдсонгүй</AppText>
                </View>
              ) : (
                employees.map((emp) => {
                  const isSelected = targetEmployee?.id === emp.id;
                  return (
                    <View key={emp.id}>
                      <Pressable
                        className="flex-row items-center py-1.5 gap-2"
                        onPress={() => handleSelectEmployee(emp)}
                      >
                        <Avatar alt={shortName(emp)} className="w-[52px] h-[52px]">
                          <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                          <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                            {avatarFallback(emp)}
                          </Avatar.Fallback>
                        </Avatar>
                        <View className="flex-1">
                          <AppText className={cn("text-base", isSelected && "font-medium")}>
                            {shortName(emp)}
                          </AppText>
                          {emp.job_position && (
                            <AppText className="text-sm text-darkgray">
                              {emp.job_position}
                            </AppText>
                          )}
                        </View>
                        <View className="w-6 h-6 items-center justify-center">
                          {isSelected && (
                            <AppIcon icon={Tick02Icon} size={24} color="#18AA0B" />
                          )}
                        </View>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      {/* Calendar sheet (pick date → shift) */}
      <BottomSheet isOpen={calOpen} onOpenChange={setCalOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay className="bg-scrim/40" />
          <BottomSheet.Content
            snapPoints={["70%"]}
            topInset={insets.top}
            enableOverDrag={false}
            enableDynamicSizing={false}
            handleComponent={null}
            contentContainerClassName="h-full p-0 rounded-t-[10px] border border-transparent bg-overlay overflow-hidden"
          >
            {/* Month navigation (dismiss via overlay tap / swipe — no close button, per design) */}
            <View className="flex-row px-4 py-5 items-center">
              <Pressable
                onPress={() => canPrev && setCalMonth((m) => m.subtract(1, "month"))}
                disabled={!canPrev}
                hitSlop={8}
                className={cn("w-8 items-center", !canPrev && "opacity-30")}
              >
                <AppIcon icon={ArrowLeft01Icon} color="#222222" size={26} />
              </Pressable>
              <AppText className="flex-1 text-center text-lg font-medium">
                {calMonth.format("MM")} сар
              </AppText>
              <Pressable
                onPress={() => canNext && setCalMonth((m) => m.add(1, "month"))}
                disabled={!canNext}
                hitSlop={8}
                className={cn("w-8 items-center", !canNext && "opacity-30")}
              >
                <AppIcon icon={ArrowRight01Icon} color="#222222" size={26} />
              </Pressable>
            </View>

            <View className="px-4">
              {/* Weekday header */}
              <View className="flex-row mb-1">
                {WEEKDAYS.map((w, i) => (
                  <AppText
                    key={w}
                    className={cn(
                      "flex-1 text-center text-sm font-medium",
                      i >= 5 ? "text-blue" : "text-darkgray"
                    )}
                  >
                    {w}
                  </AppText>
                ))}
              </View>

              {/* Day grid */}
              {calWeeks.map((row, ri) => (
                <View key={ri} className="flex-row">
                  {row.map((cell, ci) => {
                    const isPast = cell ? dayjs(cell.date).isBefore(todayStart, "day") : false;
                    const isSel = cell && cell.date === pickDate;
                    const isWorking = cell ? workDays.has(cell.day) : false;
                    return (
                      <Pressable
                        key={ci}
                        disabled={!cell || isPast}
                        onPress={() => cell && handlePickDate(cell.date)}
                        className={cn(
                          "flex-1 h-[49px] items-center justify-center rounded-[5px]",
                          isSel && "bg-lightblue"
                        )}
                      >
                        {cell && (
                          <AppText
                            className={cn(
                              "text-sm font-medium",
                              isPast
                                ? "text-darkgray/30"
                                : isSel
                                  ? "text-black font-semibold"
                                  : isWorking
                                    ? "text-black"
                                    : "text-darkgray/50"
                            )}
                          >
                            {String(cell.day).padStart(2, "0")}
                          </AppText>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Shifts of the picked date */}
            <View className="px-4 mt-3 flex-1">
              <Separator className="bg-darkgray/12 mb-2" />
              {monthLoading ? (
                <View className="py-4 items-center">
                  <ActivityIndicator />
                </View>
              ) : !pickDate ? (
                <View className="py-4 items-center">
                  <AppText className="text-sm text-darkgray">Өдөр сонгоно уу</AppText>
                </View>
              ) : dayShifts.length === 0 ? (
                <View className="py-4 items-center">
                  <AppText className="text-sm text-darkgray">Энэ өдөр ээлжгүй байна</AppText>
                </View>
              ) : (
                dayShifts.map((s, i) => {
                  const isSel = targetShift?.timesheet_id === s.timesheet_id;
                  return (
                    <View key={s.timesheet_id}>
                      <Pressable
                        onPress={() => handleSelectDayShift(s)}
                        className="flex-row items-center justify-between py-3"
                      >
                        <AppText className={cn("text-base text-black", isSel && "font-medium")}>
                          {s.start} - {s.end}
                        </AppText>
                        {isSel && <AppIcon icon={Tick02Icon} size={24} color="#18AA0B" />}
                      </Pressable>
                      {i < dayShifts.length - 1 && <Separator className="bg-darkgray/12" />}
                    </View>
                  );
                })
              )}
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </View>
  );
}
