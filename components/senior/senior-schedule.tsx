import { AppDialog } from "@/components/app-dialog";
import { AppIcon } from "@/components/app-icon";
import { AppSelect, SelectOption } from "@/components/app-select";
import { AppText } from "@/components/app-text";
import { AppToast } from "@/components/app-toast";
import { avatarFallback, useSeniorContentPad } from "@/components/senior/shared";
import { api } from "@/config/api";
import { ScrollHandler } from "@/hooks/use-hide-tab-bar";
import { BottomSheetScrollView, type BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
import {
  Alert01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  PlusSignIcon,
  Tick02Icon,
} from "@hugeicons-pro/core-stroke-standard";
import dayjs from "dayjs";
import { useFocusEffect, useRouter } from "expo-router";
import { Avatar, BottomSheet, cn, Separator, useToast } from "heroui-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function shortName(emp: { first_name?: string | null; last_name?: string | null }): string {
  const initial = emp.last_name?.[0];
  return initial ? `${initial}.${emp.first_name ?? ""}` : emp.first_name ?? "";
}

const WEEKDAYS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

interface ShiftRequestSetting {
  id: number;
  name: string;
  has_salary: boolean;
}

interface ScheduleEmployee {
  id: number;
  timesheet_id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  job_position: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  lateness_minutes: number;
  planned_work_duration_minutes: number | null;
  worked_duration_minutes: number | null;
  employee_request_setting: ShiftRequestSetting | null;
}

interface ScheduleShift {
  shift_index: number;
  name: string;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  employees: ScheduleEmployee[];
}

interface NonWorkingEmployee {
  id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  job_position: string | null;
}

interface RosterTemplate {
  id: number;
  name: string;
}

interface ScheduleResponse {
  date: string;
  selected_roster: number | null;
  is_public_holiday: boolean;
  roster_templates: RosterTemplate[];
  shifts: ScheduleShift[];
  non_working: NonWorkingEmployee[];
}

interface SummaryDay {
  day: number;
  planned: number;
  actual: number;
}

interface ShiftEmployee {
  id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  job_position: string | null;
  roster_template: { id: number; name: string } | null;
}

function fmtHm(s: string | null): string {
  return s ? dayjs(s).format("HH:mm") : "—";
}

// --- Attendance summary (Хоцролт / Таслалт / Зайнаас / Ам-чөлөө) ---

interface AttendanceTotals {
  lateness_minutes: number;
  absent_count: number;
  remote_minutes: number;
  leave_minutes: number;
}

interface AttendancePerson {
  employee_id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
}

interface LatenessRow extends AttendancePerson {
  lateness_minutes: number;
}

interface AbsenceRow extends AttendancePerson {
  absent_count: number;
}

// Зайнаас / Ам-чөлөө: нэг ажилтан хүсэлтийн төрөл тус бүрээр тусдаа мөр болно.
interface RequestSettingRow extends AttendancePerson {
  request_setting_id: number;
  request_setting_name: string;
  minutes: number;
}

// The API serves the 4 cards' totals plus each card's pre-sorted, pre-filtered
// (non-zero rows only) detail list in one call.
interface AttendanceSummary {
  year: number;
  month: number;
  totals: AttendanceTotals;
  lateness: LatenessRow[];
  absence: AbsenceRow[];
  remote: RequestSettingRow[];
  leave: RequestSettingRow[];
}

type AttendanceMetricKey = "lateness" | "absent" | "remote" | "leave";

interface AttendanceMetricDef {
  key: AttendanceMetricKey;
  label: string;
  // Field name on `totals` for the card value.
  field: keyof AttendanceTotals;
  // Таслалт is a count ("X удаа"); the rest are minutes rendered as HH:MM.
  isCount?: boolean;
  // Detail-sheet header (m = month number, rendered as "MM").
  sheetTitle: (m: number) => string;
}

const pad2 = (m: number) => String(m).padStart(2, "0");

// Header cards (2×2) and the tap-through detail list, in display order.
const ATTENDANCE_METRICS: AttendanceMetricDef[] = [
  {
    key: "lateness",
    label: "Хоцролт",
    field: "lateness_minutes",
    sheetTitle: (m) => `${pad2(m)} сарын хоцролт`,
  },
  {
    key: "absent",
    label: "Таслалт",
    field: "absent_count",
    isCount: true,
    sheetTitle: (m) => `${pad2(m)} сарын таслалт`,
  },
  {
    key: "remote",
    label: "Зайнаас",
    field: "remote_minutes",
    sheetTitle: (m) => `${pad2(m)} сард зайнаас ажилласан`,
  },
  {
    key: "leave",
    label: "Ам/чөлөө",
    field: "leave_minutes",
    sheetTitle: (m) => `${pad2(m)} сард амралт, чөлөө авсан`,
  },
];

function formatMinutesHHMM(minutes: number): string {
  const total = Math.max(0, minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatMetricValue(value: number, isCount?: boolean): string {
  return isCount ? `${value} удаа` : formatMinutesHHMM(value);
}

function StatCard({
  metric,
  total,
  onPress,
}: {
  metric: AttendanceMetricDef;
  total: number;
  onPress: () => void;
}) {
  // total === 0 → no employee has a non-zero value, so the detail list would be
  // empty; leave the card non-tappable in that case.
  return (
    <Pressable
      onPress={onPress}
      disabled={total <= 0}
      className="flex-1 h-[38px] rounded-[5px] bg-[#F2F2F2] flex-row items-center justify-between px-3"
    >
      <AppText className="text-sm font-medium text-darkgray">{metric.label}</AppText>
      <AppText className="text-sm font-medium text-black">
        {formatMetricValue(total, metric.isCount)}
      </AppText>
    </Pressable>
  );
}

// One row of the metric detail list: 52px avatar, name (+ optional request-type
// descriptor), and the metric value right-aligned.
function MetricRow({
  emp,
  valueText,
  subtitle,
}: {
  emp: AttendancePerson;
  valueText: string;
  subtitle?: string | null;
}) {
  return (
    <View className="flex-row items-center gap-2 h-16">
      <Avatar alt={shortName(emp)} className="w-[52px] h-[52px]">
        <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
        <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
          {avatarFallback(emp)}
        </Avatar.Fallback>
      </Avatar>
      <View className="flex-1">
        <AppText className="text-base text-black" numberOfLines={1}>
          {shortName(emp)}
        </AppText>
        {subtitle ? (
          <AppText className="text-sm text-darkgray mt-0.5" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <AppText className="text-base font-medium text-black">{valueText}</AppText>
    </View>
  );
}

function ShiftRow({
  emp,
  number,
  shiftStart,
  shiftEnd,
  expanded,
  canAct,
  onToggle,
  onSwap,
  onRelease,
}: {
  emp: ScheduleEmployee;
  number: number | null; // null → on leave (renders "-" and is not actionable)
  shiftStart: string; // shift's nominal "HH:mm"
  shiftEnd: string;
  expanded: boolean;
  canAct: boolean;
  onToggle: () => void;
  onSwap: () => void;
  onRelease: () => void;
}) {
  const name = shortName(emp);
  const late = emp.lateness_minutes > 0;
  const setting = emp.employee_request_setting?.name ?? null;
  const isLeave = number === null;
  // Leave/request rows read as active (foreground/black) when the request is
  // paid, and dimmed (#6A6A6A at 70%) when unpaid — per design.
  const requestColor = emp.employee_request_setting?.has_salary
    ? "text-foreground"
    : "text-darkgray/70";

  const hasActual = !!emp.actual_start || !!emp.actual_end;
  // Does the employee's own planned time differ from the shift's nominal time?
  const pStart = emp.planned_start ? dayjs(emp.planned_start).format("HH:mm") : null;
  const pEnd = emp.planned_end ? dayjs(emp.planned_end).format("HH:mm") : null;
  const plannedDiffers = (!!pStart && pStart !== shiftStart) || (!!pEnd && pEnd !== shiftEnd);

  // Subtitle carries only what the shift header doesn't already imply: actual
  // clock times (red when late) once worked, else the leave/request name, else a
  // personal planned time that differs from the shift's nominal hours.
  let subtitle: React.ReactNode = null;
  if (hasActual) {
    subtitle = (
      <AppText className="text-sm" numberOfLines={1}>
        <AppText className={late ? "text-red text-sm" : "text-darkgray text-sm"}>
          {fmtHm(emp.actual_start ?? emp.planned_start)}
        </AppText>
        <AppText className="text-darkgray text-sm"> - {fmtHm(emp.actual_end ?? emp.planned_end)}</AppText>
        {setting ? <AppText className="text-darkgray text-sm"> / {setting}</AppText> : null}
      </AppText>
    );
  } else if (setting) {
    subtitle = (
      <AppText className={cn("text-sm", requestColor)} numberOfLines={1}>
        {setting}
      </AppText>
    );
  } else if (plannedDiffers) {
    subtitle = (
      <AppText className="text-sm text-darkgray" numberOfLines={1}>
        {pStart ?? "—"} - {pEnd ?? "—"}
      </AppText>
    );
  }

  // Only working rows on today/future days can be swapped or released.
  const tappable = canAct && !isLeave;

  return (
    <View>
      <Pressable
        onPress={tappable ? onToggle : undefined}
        disabled={!tappable}
        className="flex-row items-center gap-2 py-3"
      >
        <View className="w-7 items-center">
          <AppText className={cn("text-base", isLeave ? "text-red" : "text-darkgray/50")}>
            {isLeave ? "-" : number}
          </AppText>
        </View>
        <Avatar alt={name} className={cn("w-[52px] h-[52px]", isLeave && "opacity-60")}>
          <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
          <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
            {avatarFallback(emp)}
          </Avatar.Fallback>
        </Avatar>
        <View className="flex-1">
          <AppText
            className={cn(
              "text-base",
              expanded && "font-medium",
              isLeave ? requestColor : "text-black"
            )}
            numberOfLines={1}
          >
            {name}
          </AppText>
          {subtitle}
        </View>
        {tappable && (
          <AppIcon
            icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
            size={24}
            color={expanded ? "#222222" : "#6A6A6A80"}
          />
        )}
      </Pressable>

      {tappable && expanded && (
        <View className="flex-row gap-3 pb-3">
          <Pressable
            onPress={onSwap}
            className="flex-1 h-11 rounded-full bg-[#F2F2F2] items-center justify-center"
          >
            <AppText className="text-sm font-semibold text-blue">Хуваарь солих</AppText>
          </Pressable>
          <Pressable
            onPress={onRelease}
            className="flex-1 h-11 rounded-full bg-[#F2F2F2] items-center justify-center"
          >
            <AppText className="text-sm font-semibold text-red">Чөлөөлөх</AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function SeniorSchedule({
  year,
  month,
  onScroll,
}: {
  year: number;
  month: number;
  onScroll?: ScrollHandler;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentPad = useSeniorContentPad();
  const { toast } = useToast();
  const today = dayjs();
  const monthStart = useMemo(
    () => dayjs(`${year}-${String(month).padStart(2, "0")}-01`),
    [year, month]
  );
  const isCurrentMonth =
    monthStart.year() === today.year() && monthStart.month() === today.month();

  const [summary, setSummary] = useState<SummaryDay[]>([]);
  const [detail, setDetail] = useState<ScheduleResponse | null>(null);
  const [rosterTemplates, setRosterTemplates] = useState<RosterTemplate[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<number | null>(null);
  const [selected, setSelected] = useState<number>(isCurrentMonth ? today.date() : 1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Attendance summary (header cards) + the metric whose detail sheet is open.
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [metricKey, setMetricKey] = useState<AttendanceMetricKey | null>(null);

  // Чөлөөлөх confirm
  const [releaseTarget, setReleaseTarget] = useState<ScheduleEmployee | null>(null);
  const [releasing, setReleasing] = useState(false);

  // Ажилтан нэмэх picker
  const [addShift, setAddShift] = useState<ScheduleShift | null>(null);
  const [addList, setAddList] = useState<ShiftEmployee[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const addScrollRef = useRef<BottomSheetScrollViewMethods>(null);

  const selectedDate = `${year}-${String(month).padStart(2, "0")}-${String(selected).padStart(2, "0")}`;
  // Past-day shifts can't be added/released/swapped, so their rows aren't actionable.
  const selectedIsPast = dayjs(selectedDate).isBefore(today.startOf("day"), "day");

  useEffect(() => {
    setSelected(isCurrentMonth ? today.date() : 1);
    setSelectedRoster(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

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

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api<SummaryDay[]>({
        path: `/senior/timesheet/summary?year=${year}&month=${month}`,
        method: "GET",
      });
      setSummary(res.status === 200 && Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setSummary([]);
    }
  }, [year, month]);

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await api<AttendanceSummary>({
        path: `/senior/timesheet/attendance-summary?year=${year}&month=${month}`,
        method: "GET",
      });
      // 404 ("Ажилтны бүртгэл олдсонгүй") returns an error shape, not totals.
      setAttendance(res.status === 200 && res.data && res.data.totals ? res.data : null);
    } catch (err) {
      console.error(err);
      setAttendance(null);
    }
  }, [year, month]);

  const fetchDetail = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setExpandedId(null);
      try {
        const rosterQuery = selectedRoster != null ? `&roster_template_id=${selectedRoster}` : "";
        const res = await api<ScheduleResponse>({
          path: `/senior/timesheet/schedule?date=${selectedDate}${rosterQuery}`,
          method: "GET",
        });
        if (res.status === 200 && res.data) {
          setDetail(res.data);
          setRosterTemplates(res.data.roster_templates ?? []);
          // Adopt the server's default roster only until the user picks one.
          if (selectedRoster == null) setSelectedRoster(res.data.selected_roster ?? null);
        } else {
          setDetail(null);
        }
      } catch (err) {
        console.error(err);
        setDetail(null);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [selectedDate, selectedRoster]
  );

  // Refetch the month summary + selected day's schedule when the day/roster/month
  // change or the screen regains focus (e.g. returning after a shift swap).
  useFocusEffect(
    useCallback(() => {
      void fetchDetail();
      void fetchSummary();
      void fetchAttendance();
    }, [fetchDetail, fetchSummary, fetchAttendance])
  );

  const summaryMap = useMemo(() => {
    const m = new Map<number, SummaryDay>();
    summary.forEach((s) => m.set(s.day, s));
    return m;
  }, [summary]);

  const activeMetric = useMemo(
    () => ATTENDANCE_METRICS.find((m) => m.key === metricKey) ?? null,
    [metricKey]
  );

  // The tapped metric's detail list, mapped to a common row shape. The API
  // serves each list pre-sorted with zero rows already dropped; remote/leave
  // rows carry their request-type name as the subtitle and one employee may
  // appear once per request type.
  const metricRows = useMemo(() => {
    if (!attendance || !metricKey) return [];
    switch (metricKey) {
      case "lateness":
        return (attendance.lateness ?? []).map((r) => ({
          key: String(r.employee_id),
          emp: r,
          valueText: formatMinutesHHMM(r.lateness_minutes),
          subtitle: null as string | null,
        }));
      case "absent":
        return (attendance.absence ?? []).map((r) => ({
          key: String(r.employee_id),
          emp: r,
          valueText: `${r.absent_count} удаа`,
          subtitle: null as string | null,
        }));
      case "remote":
        return (attendance.remote ?? []).map((r) => ({
          key: `${r.employee_id}-${r.request_setting_id}`,
          emp: r,
          valueText: formatMinutesHHMM(r.minutes),
          subtitle: r.request_setting_name,
        }));
      case "leave":
        return (attendance.leave ?? []).map((r) => ({
          key: `${r.employee_id}-${r.request_setting_id}`,
          emp: r,
          valueText: formatMinutesHHMM(r.minutes),
          subtitle: r.request_setting_name,
        }));
    }
  }, [attendance, metricKey]);

  const weeks = useMemo(() => {
    const start = monthStart.startOf("month");
    const daysInMonth = monthStart.daysInMonth();
    const lead = (start.day() + 6) % 7; // Monday-first offset
    const cells: (number | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [monthStart]);

  const isToday = useCallback(
    (d: number) => isCurrentMonth && d === today.date(),
    [isCurrentMonth, today]
  );

  const rosterOptions = useMemo<SelectOption[]>(
    () => rosterTemplates.map((r) => ({ value: String(r.id), label: r.name })),
    [rosterTemplates]
  );
  const selectedRosterOption = rosterOptions.find((o) => o.value === String(selectedRoster));

  const goSwap = useCallback(
    (shift: ScheduleShift, emp: ScheduleEmployee) => {
      router.navigate({
        pathname: "/senior/shift-swap",
        params: {
          employeeId: String(emp.id),
          firstName: emp.first_name ?? "",
          lastName: emp.last_name ?? "",
          jobPosition: emp.job_position ?? "",
          profileImageUrl: emp.profile_image_url ?? "",
          timesheetId: String(emp.timesheet_id),
          rosterTemplateId: String(selectedRoster ?? ""),
          date: selectedDate,
          shiftStart: shift.start,
          shiftEnd: shift.end,
          shiftIndex: String(shift.shift_index),
        },
      });
    },
    [router, selectedRoster, selectedDate]
  );

  const handleRelease = useCallback(async () => {
    if (!releaseTarget) return;
    setReleasing(true);
    try {
      const res = await api<{ result?: string; message: string }>({
        path: `/senior/timesheet/shift/${releaseTarget.timesheet_id}`,
        method: "DELETE",
      });
      if (res.status === 200) {
        showToast(res.message || "Амралтын өдөр болголоо.", true);
        setReleaseTarget(null);
        await Promise.all([fetchDetail(), fetchSummary()]);
      } else {
        showToast(res.message || "Алдаа гарлаа", false);
      }
    } catch (e) {
      console.error("Release failed:", e);
    } finally {
      setReleasing(false);
    }
  }, [releaseTarget, showToast, fetchDetail, fetchSummary]);

  const openAddSheet = useCallback(
    (shift: ScheduleShift) => {
      setAddShift(shift);
      setAddList([]);
      setAddLoading(true);
      addScrollRef.current?.scrollTo({ y: 0, animated: false });
      const rosterQuery = selectedRoster != null ? `&roster_template_id=${selectedRoster}` : "";
      // shift_index → "ажиллахгүй" шүүлтийг тухайн ээлжээр нарийсгана: өөр ээлжид
      // ажиллаж байгаа ч энэ ээлжид сул ажилчид жагсаалтад орно.
      // Laravel-ийн boolean rule "false"/"true" string-ийг авдаггүй тул 0/1 ашиглана.
      const path = `/senior/timesheet/shift-employees?date=${selectedDate}${rosterQuery}&shift_index=${shift.shift_index}&is_working=0`;
      api<ShiftEmployee[]>({ path, method: "GET" })
        .then((res) => {
          if (res.status === 200 && Array.isArray(res.data)) {
            setAddList(res.data);
          } else if (res.status !== 200) {
            showToast(res.message || "Ажилтан ачаалахад алдаа гарлаа", false);
          }
        })
        .catch(console.error)
        .finally(() => setAddLoading(false));
    },
    [selectedRoster, selectedDate, showToast]
  );

  const handleAddEmployee = useCallback(
    async (employeeId: number) => {
      if (!addShift || selectedRoster == null) return;
      setAddingId(employeeId);
      try {
        const res = await api<{ result?: string; message: string }>({
          path: "/senior/timesheet/shift",
          method: "POST",
          data: {
            date: selectedDate,
            roster_template_id: selectedRoster,
            shift_index: addShift.shift_index,
            employee_id: employeeId,
          },
        });
        if (res.status === 200 || res.status === 201) {
          showToast(res.message || "Ээлж нэмлээ.", true);
          setAddShift(null);
          await Promise.all([fetchDetail(), fetchSummary()]);
        } else {
          showToast(res.message || "Алдаа гарлаа", false);
        }
      } catch (e) {
        console.error("Add employee failed:", e);
      } finally {
        setAddingId(null);
      }
    },
    [addShift, selectedRoster, selectedDate, showToast, fetchDetail, fetchSummary]
  );

  const shifts = detail?.shifts ?? [];
  const nonWorking = detail?.non_working ?? [];
  const isEmpty = !loading && shifts.length === 0 && nonWorking.length === 0;

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Cancel the parent's px-4 so the scroll view spans full width; re-inset
        // normal content via contentContainer padding while bands use -mx-4 to
        // reach the screen edges.
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: contentPad }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchDetail(true)} />
        }
      >
        {/* Attendance summary — 2×2 stat cards; tap one to open the per-employee list. */}
        {attendance && (
          <View className="gap-3 mb-4">
            <View className="flex-row gap-3">
              {ATTENDANCE_METRICS.slice(0, 2).map((metric) => (
                <StatCard
                  key={metric.key}
                  metric={metric}
                  total={attendance.totals[metric.field] ?? 0}
                  onPress={() => setMetricKey(metric.key)}
                />
              ))}
            </View>
            <View className="flex-row gap-3">
              {ATTENDANCE_METRICS.slice(2, 4).map((metric) => (
                <StatCard
                  key={metric.key}
                  metric={metric}
                  total={attendance.totals[metric.field] ?? 0}
                  onPress={() => setMetricKey(metric.key)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Calendar */}
        <View className="flex-row mb-2">
          {WEEKDAYS.map((w, i) => (
            <AppText
              key={w}
              className={`flex-1 text-center text-sm font-medium ${i >= 5 ? "text-blue" : "text-darkgray"}`}
            >
              {w}
            </AppText>
          ))}
        </View>

        {weeks.map((row, ri) => (
          <View key={ri} className="flex-row">
            {row.map((d, ci) => {
              const isWeekend = ci >= 5;
              const info = d ? summaryMap.get(d) : undefined;
              // Show the actual (executed) shift count: gray when it meets/exceeds
              // the plan, red when understaffed (actual < planned).
              const showCount = !!info && (info.planned > 0 || info.actual > 0);
              const understaffed = !!info && info.actual < info.planned;
              const todayCell = d ? isToday(d) : false;
              const isSel = d === selected;
              return (
                <Pressable
                  key={ci}
                  disabled={!d}
                  onPress={() => d && setSelected(d)}
                  className={`flex-1 h-[52px] items-center justify-center rounded-lg ${
                    todayCell ? "bg-lightblue" : isSel ? "bg-darkgray/8" : ""
                  }`}
                >
                  {d && (
                    <>
                      <AppText
                        className={`text-sm font-medium ${
                          todayCell
                            ? "text-darkblue"
                            : isWeekend
                              ? "text-darkgray/40"
                              : "text-black"
                        }`}
                      >
                        {String(d).padStart(2, "0")}
                      </AppText>
                      {showCount && info && (
                        <AppText
                          className={cn(
                            "text-sm font-medium mt-0.5",
                            understaffed ? "text-red" : "text-darkgray/50"
                          )}
                        >
                          {info.actual}
                        </AppText>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* Roster template selector */}
        {rosterOptions.length > 0 && (
          <View className="mt-4">
            <AppSelect
              title="Хуваарь сонгох"
              options={rosterOptions}
              value={selectedRosterOption}
              onValueChange={(opt) => opt && setSelectedRoster(Number(opt.value))}
            />
          </View>
        )}

        {/* Shift sections */}
        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator />
          </View>
        ) : isEmpty ? (
          <View className="items-center justify-center py-16">
            <AppText className="text-sm text-darkgray">Хуваарь байхгүй байна</AppText>
          </View>
        ) : (
          <View className="mt-2">
            {shifts.map((shift) => {
              let counter = 0;
              return (
                <View key={shift.shift_index}>
                  <View className="bg-lightblue -mx-4 px-4 py-2.5 mt-3 flex-row items-center justify-between">
                    <AppText className="text-sm font-medium text-darkblue">
                      {shift.start} - {shift.end}
                    </AppText>
                    {!selectedIsPast && (
                      <Pressable
                        onPress={() => openAddSheet(shift)}
                        className="flex-row items-center gap-1"
                        hitSlop={6}
                      >
                        <AppIcon icon={PlusSignIcon} color="#606884" size={16} />
                        <AppText className="text-sm text-darkblue">Ажилтан нэмэх</AppText>
                      </Pressable>
                    )}
                  </View>
                  {shift.employees.length === 0 && (
                    <View className="py-6 items-center">
                      <AppText className="text-sm text-darkgray">Ажилтан байхгүй байна</AppText>
                    </View>
                  )}
                  {shift.employees.map((emp, i) => {
                    const isLeave = !!emp.employee_request_setting;
                    const number = isLeave ? null : (counter += 1);
                    return (
                      <View key={emp.timesheet_id}>
                        <ShiftRow
                          emp={emp}
                          number={number}
                          shiftStart={shift.start}
                          shiftEnd={shift.end}
                          expanded={expandedId === emp.timesheet_id}
                          canAct={!selectedIsPast}
                          onToggle={() =>
                            setExpandedId((p) =>
                              p === emp.timesheet_id ? null : emp.timesheet_id
                            )
                          }
                          onSwap={() => goSwap(shift, emp)}
                          onRelease={() => setReleaseTarget(emp)}
                        />
                        {i < shift.employees.length - 1 && (
                          <Separator className="bg-darkgray/12" />
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* Энэ өдөр хуваарьгүй */}
            {nonWorking.length > 0 && (
              <View className="mt-6">
                <View className="bg-darkgray/5 -mx-4 px-4 py-2.5 mb-1">
                  <AppText className="text-sm text-darkgray">Энэ өдөр хуваарьгүй</AppText>
                </View>
                {nonWorking.map((emp, i) => (
                  <View key={emp.id}>
                    <View className="flex-row items-center gap-2 py-3">
                      <View className="w-7 items-center">
                        <AppText className="text-base text-darkgray/50">{i + 1}</AppText>
                      </View>
                      <Avatar alt={shortName(emp)} className="w-[52px] h-[52px] opacity-60">
                        <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                        <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                          {avatarFallback(emp)}
                        </Avatar.Fallback>
                      </Avatar>
                      <View className="flex-1">
                        <AppText className="text-base text-darkgray/70" numberOfLines={1}>
                          {shortName(emp)}
                        </AppText>
                      </View>
                    </View>
                    {i < nonWorking.length - 1 && <Separator className="bg-darkgray/12" />}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Чөлөөлөх confirm dialog */}
      <AppDialog
        isOpen={!!releaseTarget}
        onOpenChange={(o) => {
          if (!o) setReleaseTarget(null);
        }}
      >
        <View className="mb-5 gap-1.5">
          <AppDialog.Title>Хуваариас чөлөөлөх</AppDialog.Title>
          <AppDialog.Description>
            Та {releaseTarget ? shortName(releaseTarget) : ""}-г хуваариас чөлөөлөхдөө итгэлтэй байна уу ?
          </AppDialog.Description>
        </View>
        <View className="flex-row gap-3">
          <AppDialog.Button
            label="Үгүй"
            className="flex-1"
            onPress={() => setReleaseTarget(null)}
          />
          <AppDialog.Button
            label="Тийм"
            className="flex-1"
            isLoading={releasing}
            onPress={handleRelease}
          />
        </View>
      </AppDialog>

      {/* Ажилтан нэмэх bottom sheet */}
      <BottomSheet
        isOpen={!!addShift}
        onOpenChange={(o) => {
          if (!o) setAddShift(null);
        }}
      >
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
            {/* No close button per design — dismiss via overlay tap / swipe down. */}
            <View className="py-4 items-center">
              <AppText className="text-lg font-medium">Нэмэх ажилтнаа сонгох</AppText>
              {addShift && (
                <AppText className="text-sm text-darkgray mt-1">
                  {dayjs(selectedDate).format("MM/DD")}   {addShift.start} - {addShift.end}
                </AppText>
              )}
            </View>

            <BottomSheetScrollView
              ref={addScrollRef}
              contentContainerClassName="px-4 pb-8"
              showsVerticalScrollIndicator={false}
            >
              {addLoading ? (
                <View className="py-6 items-center">
                  <ActivityIndicator />
                </View>
              ) : addList.length === 0 ? (
                <View className="py-6 items-center">
                  <AppText className="text-sm text-darkgray">Ажилтан байхгүй байна</AppText>
                </View>
              ) : (
                addList.map((emp) => {
                  const adding = addingId === emp.id;
                  return (
                    <Pressable
                      key={emp.id}
                      className="flex-row items-center gap-2 h-16"
                      disabled={addingId !== null}
                      onPress={() => handleAddEmployee(emp.id)}
                    >
                      <Avatar alt={shortName(emp)} className="w-[52px] h-[52px]">
                        <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                        <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                          {avatarFallback(emp)}
                        </Avatar.Fallback>
                      </Avatar>
                      <AppText
                        className={cn("flex-1 text-base text-black", adding && "font-medium")}
                        numberOfLines={1}
                      >
                        {shortName(emp)}
                      </AppText>
                      {adding && <AppIcon icon={Tick02Icon} size={24} color="#18AA0B" />}
                    </Pressable>
                  );
                })
              )}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      {/* Attendance metric detail — employees ranked by the tapped metric.
          A peek sheet (cards stay visible behind); dismiss by tapping the
          overlay or swiping down, per design (no close button). */}
      <BottomSheet
        isOpen={metricKey !== null}
        onOpenChange={(o) => {
          if (!o) setMetricKey(null);
        }}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay className="bg-[#6C719F]/40" />
          <BottomSheet.Content
            snapPoints={["55%", "90%"]}
            topInset={insets.top}
            enableOverDrag={false}
            enableDynamicSizing={false}
            handleComponent={null}
            contentContainerClassName="h-full p-0 rounded-t-[10px] border border-transparent bg-overlay overflow-hidden"
          >
            <View className="h-[60px] items-center justify-center">
              <AppText className="text-lg font-medium">
                {activeMetric ? activeMetric.sheetTitle(month) : ""}
              </AppText>
            </View>

            <BottomSheetScrollView
              contentContainerClassName="px-4 pb-8"
              showsVerticalScrollIndicator={false}
            >
              {metricRows.length === 0 ? (
                <View className="py-6 items-center">
                  <AppText className="text-sm text-darkgray">Мэдээлэл байхгүй байна</AppText>
                </View>
              ) : (
                metricRows.map((row) => (
                  <MetricRow
                    key={row.key}
                    emp={row.emp}
                    valueText={row.valueText}
                    subtitle={row.subtitle}
                  />
                ))
              )}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </>
  );
}
