import { AppButton } from "@/components/app-button";
import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { AppToast } from "@/components/app-toast";
import { api } from "@/config/api";
import { BottomSheetScrollView, type BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
import {
  Alert01Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowUpDownIcon,
  CheckmarkCircle02Icon,
  MultiplicationSignIcon,
  Tick02Icon,
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import dayjs from "dayjs";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar, BottomSheet, cn, PressableFeedback, Separator, useToast } from "heroui-native";
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
    <AppText className="text-sm text-darkgray">
      {dayjs(date).format("MM/DD")}{" "}
      <AppText className="text-sm text-darkgray/50">{WEEKDAYS_FULL[dayjs(date).day()]}</AppText>
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
            title="Хуваарь солих"
            showBack
            backIcon={<HugeiconsIcon icon={ArrowLeft02Icon} color="#222222" size={24} />}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4 gap-4">
            {/* Source card (fixed) */}
            <View className="flex-row items-center gap-3 rounded-xl border border-darkgray/15 px-3 py-3">
              <Avatar alt={shortName(sourcePerson)} className="w-12 h-12">
                <Avatar.Image source={{ uri: params.profileImageUrl ?? "" }} />
                <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                  {avatarFallback(sourcePerson)}
                </Avatar.Fallback>
              </Avatar>
              <View className="flex-1">
                <AppText className="text-base font-medium" numberOfLines={1}>
                  {shortName(sourcePerson)}
                </AppText>
                <AppText className="text-sm text-darkgray mt-0.5">
                  {params.shiftStart} - {params.shiftEnd}
                </AppText>
              </View>
              <View className="self-end">
                <DateLabel date={sourceDate} />
              </View>
            </View>

            {!targetEmployee ? (
              <Pressable
                onPress={openPicker}
                className="h-12 rounded-full border border-blue/40 items-center justify-center"
              >
                <AppText className="text-sm font-medium text-black">
                  Хуваарь солих ажилтнаа сонгоно уу
                </AppText>
              </Pressable>
            ) : (
              <>
                <View className="items-center">
                  <HugeiconsIcon icon={ArrowUpDownIcon} color="#6A6A6A" size={26} />
                </View>

                {/* Target card — same layout as the source card once a shift is
                    chosen: name + time on the left, date bottom-right. */}
                <View className="flex-row items-center gap-3 rounded-xl border border-blue/40 px-3 py-3">
                  <Pressable
                    onPress={openPicker}
                    className="flex-1 flex-row items-center gap-3"
                  >
                    <Avatar alt={shortName(targetEmployee)} className="w-12 h-12">
                      <Avatar.Image source={{ uri: targetEmployee.profile_image_url ?? "" }} />
                      <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                        {avatarFallback(targetEmployee)}
                      </Avatar.Fallback>
                    </Avatar>
                    <View className="flex-1">
                      <AppText className="text-base font-medium" numberOfLines={1}>
                        {shortName(targetEmployee)}
                      </AppText>
                      {targetShift ? (
                        <AppText className="text-sm text-darkgray mt-0.5" numberOfLines={1}>
                          {targetShift.start} - {targetShift.end}
                        </AppText>
                      ) : (
                        <AppText className="text-sm text-darkgray/60 mt-0.5" numberOfLines={1}>
                          Солих хуваарь сонгоогүй байна
                        </AppText>
                      )}
                    </View>
                  </Pressable>
                  {targetShift && (
                    <Pressable onPress={openCalendar} className="self-end">
                      <DateLabel date={targetShift.date} />
                    </Pressable>
                  )}
                </View>

                {!targetShift && (
                  <Pressable
                    onPress={openCalendar}
                    className="h-12 rounded-full border border-blue/40 items-center justify-center"
                  >
                    <AppText className="text-sm font-medium text-black">
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
          <BottomSheet.Overlay className="bg-[#6C719F]/40" />
          <BottomSheet.Content
            snapPoints={["92%"]}
            topInset={insets.top}
            enableOverDrag={false}
            enableDynamicSizing={false}
            handleComponent={null}
            contentContainerClassName="h-full p-0 rounded-t-[10px] border border-transparent bg-overlay overflow-hidden"
          >
            <View className="flex-row px-4 py-5 justify-between items-center">
              <View className="flex-1">
                <AppText className="text-base font-medium text-center">Солигдох ажилтан</AppText>
              </View>
              <PressableFeedback onPress={() => setPickerOpen(false)}>
                <HugeiconsIcon icon={MultiplicationSignIcon} color="#6A6A6A" size={24} />
              </PressableFeedback>
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
                employees.map((emp, index) => {
                  const isSelected = targetEmployee?.id === emp.id;
                  return (
                    <View key={emp.id}>
                      <Pressable
                        className="flex-row items-center py-3 gap-3"
                        onPress={() => handleSelectEmployee(emp)}
                      >
                        <Avatar alt={shortName(emp)} className="w-10 h-10">
                          <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                          <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                            {avatarFallback(emp)}
                          </Avatar.Fallback>
                        </Avatar>
                        <View className="flex-1">
                          <AppText className={cn("text-sm", isSelected && "font-medium")}>
                            {shortName(emp)}
                          </AppText>
                          {emp.job_position && (
                            <AppText className="text-sm text-darkgray mt-0.5">
                              {emp.job_position}
                            </AppText>
                          )}
                        </View>
                        <View className="w-6 h-6 items-center justify-center">
                          {isSelected && (
                            <HugeiconsIcon icon={Tick02Icon} size={24} color="#18AA0B" />
                          )}
                        </View>
                      </Pressable>
                      {index < employees.length - 1 && <Separator className="bg-darkgray/15" />}
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
          <BottomSheet.Overlay className="bg-[#6C719F]/40" />
          <BottomSheet.Content
            snapPoints={["70%"]}
            topInset={insets.top}
            enableOverDrag={false}
            enableDynamicSizing={false}
            handleComponent={null}
            contentContainerClassName="h-full p-0 rounded-t-[10px] border border-transparent bg-overlay overflow-hidden"
          >
            {/* Month navigation */}
            <View className="flex-row px-4 py-5 items-center justify-between">
              <Pressable
                onPress={() => canPrev && setCalMonth((m) => m.subtract(1, "month"))}
                disabled={!canPrev}
                hitSlop={8}
                className={cn("w-8 items-center", !canPrev && "opacity-30")}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} color="#222222" size={22} />
              </Pressable>
              <AppText className="text-base font-medium">{calMonth.month() + 1} сар</AppText>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => canNext && setCalMonth((m) => m.add(1, "month"))}
                  disabled={!canNext}
                  hitSlop={8}
                  className={cn("w-8 items-center", !canNext && "opacity-30")}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} color="#222222" size={22} />
                </Pressable>
                <PressableFeedback onPress={() => setCalOpen(false)}>
                  <HugeiconsIcon icon={MultiplicationSignIcon} color="#6A6A6A" size={24} />
                </PressableFeedback>
              </View>
            </View>

            <View className="px-4">
              {/* Weekday header */}
              <View className="flex-row mb-1">
                {WEEKDAYS.map((w, i) => (
                  <AppText
                    key={w}
                    className={cn(
                      "flex-1 text-center text-sm",
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
                          "flex-1 h-12 items-center justify-center rounded-lg",
                          isSel && "bg-lightblue"
                        )}
                      >
                        {cell && (
                          <AppText
                            className={cn(
                              "text-sm",
                              isPast
                                ? "text-darkgray/30"
                                : isSel
                                  ? "text-darkblue font-medium"
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
                        <AppText className={cn("text-sm", isSel ? "text-black font-medium" : "text-darkgray")}>
                          {s.start} - {s.end}
                        </AppText>
                        {isSel && <HugeiconsIcon icon={Tick02Icon} size={22} color="#18AA0B" />}
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
