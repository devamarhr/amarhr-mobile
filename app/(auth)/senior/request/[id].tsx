import { AppButton } from "@/components/app-button";
import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { AppTextField } from "@/components/app-text-field";
import { AppToast } from "@/components/app-toast";
import { api, uploadFile } from "@/config/api";
import { pickAttachments, type PickedAsset } from "@/utils/pick-attachment";
import {
  Alert01Icon,
  FileAttachmentIcon,
  MultiplicationSignIcon,
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import dayjs from "dayjs";
import { useLocalSearchParams } from "expo-router";
import { Avatar, Dialog, Separator, Spinner, useToast } from "heroui-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

type FormType =
  | "dateRange"
  | "timeRange"
  | "compensatory"
  | "textOnly"
  | "timeCorrection"
  | "annualLeave"
  | "remote"
  | "employeeStatus"
  | "attendance";

type ReviewerType = string | null;

interface ReviewDetail {
  comment: string | null;
  review_at?: string | null;
  decision_at?: string | null;
  attachments?: { name: string; path: string; url: string }[] | null;
}

type AttachmentItem = { name: string; path: string; url: string };

interface SettingDetail {
  name?: string;
  key?: string;
  fields?: { time_unit?: string; time_value?: number; has_salary?: boolean; salary_percent?: number } | [];
  annual_leave_available_days?: number;
  annual_leave_available_start_date?: string | null;
  annual_leave_available_end_date?: string | null;
  compensatory_hours?: number;
  salary_percent?: number;
  has_salary?: boolean;
}

interface RequestSetting {
  id: number;
  name: string;
  type?: string;
  request_type?: string;
  detail?: SettingDetail;
}

interface AssignedEmployee {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  last_assignment?: {
    department?: { id: number; name: string } | null;
    job_position?: { id: number; name: string } | null;
  } | null;
}

interface EmployeeRequestDetail {
  id: number;
  employee_request_setting_id: number;
  status: string;
  review_by_type: ReviewerType;
  review_detail: ReviewDetail | null;
  decision_by_type: ReviewerType;
  decision_detail: ReviewDetail | null;
  detail: Record<string, any> | null;
  attachments: { name: string; path: string; url: string }[] | null;
  created_at: string | null;
  setting: RequestSetting;
  employee?: AssignedEmployee;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Хүлээгдэж байна", color: "text-yellow" },
  senior_pending: { label: "Хүлээгдэж байна", color: "text-yellow" },
  review_pending: { label: "Хүлээгдэж байна", color: "text-yellow" },
  approved: { label: "Зөвшөөрсөн", color: "text-green" },
  rejected: { label: "Татгалзсан", color: "text-red" },
  read: { label: "Уншиж танилцсан", color: "text-darkcyan" },
};

function getFormType(setting: RequestSetting | undefined, detail: Record<string, any> | null): FormType {
  if (setting?.request_type === "time_correction") return "timeCorrection";

  const type = setting?.type;
  if (type === "benefit") return "textOnly";
  if (type === "attendance") return "attendance";
  if (type === "remote") return "remote";
  if (type === "employee_status") return "employeeStatus";

  const key = setting?.detail?.key;
  if (key === "overtime") return "timeRange";
  if (key === "feedback" || key === "anonymous_feedback") return "textOnly";
  if (key === "compensatory") return "compensatory";
  if (key === "annual_leave") return "annualLeave";

  if (detail) {
    if (Array.isArray(detail.periods)) return "annualLeave";
    if (detail.endTime || detail.arrivalTime || detail.leaveTime || Array.isArray(detail.shifts)) {
      return "timeCorrection";
    }
    if (detail.compensatoryMode || (detail.start && detail.end)) return "compensatory";
    if (detail.startTime && detail.hours != null) return "timeRange";
    if (detail.startDate && detail.days != null) return "dateRange";
  }

  const fields = setting?.detail?.fields;
  if (fields && !Array.isArray(fields)) {
    if (fields.time_unit === "hour") return "timeRange";
    if (fields.time_unit === "day") return "dateRange";
  }

  return "textOnly";
}

interface InfoRow {
  label: string;
  value: string;
}

function TruncatedText({
  text,
  className,
  onExpand,
}: {
  text: string;
  className?: string;
  onExpand: () => void;
}) {
  const [truncated, setTruncated] = useState(false);
  return (
    <Pressable onPress={() => truncated && onExpand()} disabled={!truncated}>
      <AppText className={className} numberOfLines={truncated ? 4 : undefined}>
        {text}
      </AppText>
      {!truncated && (
        <AppText
          className={className}
          style={{ position: "absolute", left: 0, right: 0, opacity: 0 }}
          onTextLayout={(e) => {
            if (e.nativeEvent.lines.length > 4) setTruncated(true);
          }}
        >
          {text}
        </AppText>
      )}
    </Pressable>
  );
}

function InfoRowsView({ rows }: { rows: InfoRow[] }) {
  if (rows.length === 0) return null;
  return (
    <View className="gap-2.5">
      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-2 justify-between">
          <AppText className="text-sm text-darkgray">{row.label}</AppText>
          <AppText className="text-sm font-medium text-black">{row.value}</AppText>
        </View>
      ))}
    </View>
  );
}

function employeeFullName(emp: AssignedEmployee): string {
  const first = emp.first_name?.trim();
  const lastInitial = emp.last_name?.trim()?.[0];
  if (first && lastInitial) return `${first}.${lastInitial}`;
  return first ?? emp.last_name ?? "";
}

function employeeFallback(emp: AssignedEmployee): string {
  return ((emp.last_name?.[0] ?? "") + (emp.first_name?.[0] ?? "")) || "?";
}

type ActionType = "approve" | "reject" | "review";
type ActionMode = "decide" | "review" | "readOnly";

function getActionMode(status: string | undefined): ActionMode {
  if (status === "senior_pending") return "decide";
  if (status === "review_pending") return "review";
  return "readOnly";
}

export default function SeniorRequestDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<EmployeeRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submittingAction, setSubmittingAction] = useState<ActionType | null>(null);
  const [viewingAttachments, setViewingAttachments] = useState<AttachmentItem[] | null>(null);
  const [actionAttachments, setActionAttachments] = useState<{ name: string; path: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [expandedText, setExpandedText] = useState<{ title: string; text: string } | null>(null);
  const { toast } = useToast();

  const uploadAssets = async (assets: PickedAsset[]) => {
    if (!assets.length) return;
    setIsUploading(true);
    for (const asset of assets) {
      try {
        const res = await uploadFile<{ path: string }>("/file-upload", asset.uri);
        if (res.status === 200) {
          setActionAttachments((prev) => [...prev, { name: asset.name, path: res.data.path }]);
        } else {
          toast.show({
            component: (props) => (
              <AppToast
                {...props}
                variant="danger"
                description={res.message || "Алдаа гарлаа"}
                icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
              />
            ),
          });
        }
      } catch (e) {
        console.error("Upload failed:", e);
      }
    }
    setIsUploading(false);
  };

  const handlePickAttachments = async () => {
    const assets = await pickAttachments();
    await uploadAssets(assets);
  };

  const handleRemoveAttachment = (index: number) => {
    setActionAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const loadRequest = useCallback(() => {
    setLoading(true);
    return api<EmployeeRequestDetail>({
      path: `/employee-request/${params.id}`,
      method: "GET",
    })
      .then((res) => {
        if (res.status === 200) setRequest(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const actionMode = getActionMode(request?.status);

  const submitAction = async (action: ActionType) => {
    if (!request || submittingAction) return;
    setSubmittingAction(action);
    try {
      const data: Record<string, unknown> = {
        comment: comment.trim() || null,
        attachments: actionAttachments,
      };
      if (action === "approve") data.status = "approved";
      else if (action === "reject") data.status = "rejected";
      const res = await api({
        path: `/employee-request/${request.id}/action`,
        method: "POST",
        data,
      });
      if (res.status === 200) {
        await loadRequest();
      } else {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              description={res.message || "Алдаа гарлаа"}
              icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const formType = useMemo(
    () => (request ? getFormType(request.setting, request.detail) : "textOnly"),
    [request]
  );
  const detail = request?.detail ?? {};
  const description = (detail.description as string | undefined) ?? "";
  const status = request ? statusMap[request.status] ?? { label: request.status, color: "text-darkgray" } : null;

  const formRows = useMemo<InfoRow[]>(() => {
    if (!request) return [];

    if (formType === "dateRange") {
      const rows: InfoRow[] = [];
      if (detail.startDate) {
        const d = dayjs(detail.startDate, "YYYY-MM-DD");
        if (d.isValid()) rows.push({ label: "Эхлэх өдөр", value: d.format("MM/DD") });
      }
      if (detail.days != null) rows.push({ label: "Хоног", value: `${detail.days} хоног` });
      return rows;
    }

    if (formType === "timeRange") {
      const rows: InfoRow[] = [];
      const start = detail.startTime
        ? dayjs(detail.startTime, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"])
        : null;
      const end = detail.endTime
        ? dayjs(detail.endTime, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"])
        : start && detail.hours != null
          ? start.add(detail.hours, "hour")
          : null;
      if (start && start.isValid()) {
        rows.push({ label: "Огноо", value: start.format("MM/DD") });
      }
      if (start && start.isValid() && end && end.isValid()) {
        const hoursText = detail.hours != null ? ` (${detail.hours} цаг)` : "";
        rows.push({
          label: "Илүү цаг",
          value: `${start.format("HH:mm")} - ${end.format("HH:mm")}${hoursText}`,
        });
      } else if (detail.hours != null) {
        rows.push({ label: "Хугацаа", value: `${detail.hours} цаг` });
      }
      return rows;
    }

    if (formType === "timeCorrection") {
      const parseDt = (s?: string) => {
        if (!s) return undefined;
        const d = dayjs(s, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "HH:mm:ss", "HH:mm"]);
        return d.isValid() ? d : undefined;
      };
      type Shift = {
        arrivalTime?: string;
        leaveTime?: string;
        actual_start?: string;
        actual_end?: string;
      };
      const shifts: Shift[] = Array.isArray(detail.shifts)
        ? detail.shifts
        : [
            {
              arrivalTime: detail.startTime ?? detail.arrivalTime,
              leaveTime: detail.endTime ?? detail.leaveTime,
              actual_start: detail.actual_start,
              actual_end: detail.actual_end,
            },
          ];
      const firstWithDate = shifts.find((s) =>
        /\d{4}-\d{2}-\d{2}/.test(s.arrivalTime ?? s.leaveTime ?? "")
      );
      const shiftDateSource = firstWithDate?.arrivalTime ?? firstWithDate?.leaveTime;
      const shiftDate = shiftDateSource
        ? dayjs(shiftDateSource, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"])
        : null;
      const rows: InfoRow[] = [];
      if (shiftDate && shiftDate.isValid()) {
        rows.push({ label: "Огноо", value: shiftDate.format("MM/DD") });
      }
      shifts.forEach((s, idx) => {
        const arrival = parseDt(s.arrivalTime);
        const leave = parseDt(s.leaveTime);
        const actualArrival = parseDt(s.actual_start);
        const actualLeave = parseDt(s.actual_end);
        const suffix = shifts.length > 1 ? ` ${idx + 1}` : "";
        if (arrival) {
          const value = actualArrival
            ? `${actualArrival.format("HH:mm")} → ${arrival.format("HH:mm")}`
            : arrival.format("HH:mm");
          rows.push({ label: `Ирсэн цаг${suffix}`, value });
        }
        if (leave) {
          const value = actualLeave
            ? `${actualLeave.format("HH:mm")} → ${leave.format("HH:mm")}`
            : leave.format("HH:mm");
          rows.push({ label: `Тарсан цаг${suffix}`, value });
        }
      });
      return rows;
    }

    if (formType === "compensatory") {
      const mode = (detail.compensatoryMode as "day" | "hour" | undefined) ?? (detail.hours != null ? "hour" : "day");
      const parseRange = (s?: string) => {
        if (!s) return undefined;
        const d = dayjs(s, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"]);
        return d.isValid() ? d : undefined;
      };
      const startValue = parseRange(detail.start ?? detail.startDate ?? detail.startTime);
      const endValue = parseRange(detail.end ?? detail.endDate ?? detail.endTime);
      const rows: InfoRow[] = [{ label: "Төрөл", value: mode === "day" ? "Өдрөөр" : "Цагаар" }];

      if (mode === "hour") {
        if (startValue) rows.push({ label: "Огноо", value: startValue.format("MM/DD") });
        if (startValue && endValue) {
          const workMinutes = typeof detail.work_minutes === "number" ? detail.work_minutes : null;
          const durationText =
            workMinutes != null
              ? ` (${String(Math.floor(workMinutes / 60)).padStart(2, "0")}:${String(workMinutes % 60).padStart(2, "0")})`
              : "";
          rows.push({
            label: "Хугацаа",
            value: `${startValue.format("HH:mm")} - ${endValue.format("HH:mm")}${durationText}`,
          });
        }
      } else {
        if (startValue && endValue) {
          rows.push({
            label: "Огноо",
            value: `${startValue.format("MM/DD")} — ${endValue.format("MM/DD")}`,
          });
        } else if (startValue) {
          rows.push({ label: "Огноо", value: startValue.format("MM/DD") });
        }
        if (detail.days != null) {
          rows.push({ label: "Хугацаа", value: `${detail.days} өдөр` });
        }
      }
      return rows;
    }

    if (formType === "attendance") {
      const rows: InfoRow[] = [];
      const settingFields = request.setting.detail?.fields;
      const settingFieldsObj =
        settingFields && !Array.isArray(settingFields) ? settingFields : undefined;
      const isHourMode =
        detail.startTime != null ||
        detail.endTime != null ||
        detail.hours != null ||
        settingFieldsObj?.time_unit === "hour";

      if (isHourMode) {
        const start = detail.startTime
          ? dayjs(detail.startTime, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"])
          : null;
        const end = detail.endTime
          ? dayjs(detail.endTime, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"])
          : start && detail.hours != null
            ? start.add(detail.hours, "hour")
            : null;
        if (start && start.isValid()) {
          rows.push({ label: "Огноо", value: start.format("YYYY/MM/DD") });
        }
        if (start && start.isValid() && end && end.isValid()) {
          const hoursText = detail.hours != null ? ` (${detail.hours} цаг)` : "";
          rows.push({
            label: "Хугацаа",
            value: `${start.format("HH:mm")} - ${end.format("HH:mm")}${hoursText}`,
          });
        } else if (detail.hours != null) {
          rows.push({ label: "Хугацаа", value: `${detail.hours} цаг` });
        }
      } else {
        const startSrc = detail.date ?? detail.startDate ?? detail.start;
        const endSrc = detail.endDate ?? detail.end;
        const startDay = startSrc
          ? dayjs(startSrc, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"])
          : null;
        const endDay = endSrc
          ? dayjs(endSrc, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"])
          : null;
        const sameDay = startDay && endDay && startDay.isValid() && endDay.isValid() && startDay.isSame(endDay, "day");
        if (startDay && startDay.isValid() && endDay && endDay.isValid() && !sameDay) {
          rows.push({
            label: "Огноо",
            value: `${startDay.format("YYYY/MM/DD")} — ${endDay.format("YYYY/MM/DD")}`,
          });
        } else if (startDay && startDay.isValid()) {
          rows.push({ label: "Огноо", value: startDay.format("YYYY/MM/DD") });
        }
        if (detail.days != null) {
          rows.push({ label: "Хугацаа", value: `${detail.days} хоног` });
        }
      }

      const hasSalary =
        detail.has_salary ?? request.setting.detail?.has_salary ?? settingFieldsObj?.has_salary;
      if (hasSalary != null) {
        rows.push({ label: "Цалин", value: hasSalary ? "Цалинтай" : "Цалингүй" });
      }
      return rows;
    }

    if (formType === "remote") {
      const rows: InfoRow[] = [];
      const dateSrc = detail.date ?? detail.startDate ?? detail.start;
      if (dateSrc) {
        const d = dayjs(dateSrc, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"]);
        if (d.isValid()) rows.push({ label: "Огноо", value: d.format("YYYY/MM/DD") });
      }
      if (detail.days != null) {
        rows.push({ label: "Хугацаа", value: `${detail.days} хоног` });
      }
      const settingFields = request.setting.detail?.fields;
      const settingFieldsObj =
        settingFields && !Array.isArray(settingFields) ? settingFields : undefined;
      const salaryPercent =
        detail.salary_percent ??
        request.setting.detail?.salary_percent ??
        settingFieldsObj?.salary_percent;
      if (salaryPercent != null) {
        rows.push({ label: "Ирцээс хамаарсан цалин", value: `${salaryPercent}%` });
      }
      return rows;
    }

    if (formType === "employeeStatus") {
      const rows: InfoRow[] = [];
      const startSrc = detail.startDate ?? detail.start ?? detail.start_date;
      const endSrc = detail.endDate ?? detail.end ?? detail.end_date;
      const start = startSrc
        ? dayjs(startSrc, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"])
        : null;
      const end = endSrc
        ? dayjs(endSrc, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"])
        : null;
      if (start && start.isValid() && end && end.isValid()) {
        rows.push({ label: "Огноо", value: `${start.format("MM/DD")} - ${end.format("MM/DD")}` });
      } else if (start && start.isValid()) {
        rows.push({ label: "Огноо", value: start.format("MM/DD") });
      }
      if (detail.days != null) {
        rows.push({ label: "Нийт хоног", value: `${detail.days} хоног` });
      }
      const settingFields = request.setting.detail?.fields;
      const settingFieldsObj =
        settingFields && !Array.isArray(settingFields) ? settingFields : undefined;
      const hasSalary =
        detail.has_salary ?? request.setting.detail?.has_salary ?? settingFieldsObj?.has_salary;
      if (hasSalary != null) {
        rows.push({ label: "Төрөл", value: hasSalary ? "Цалинтай" : "Цалингүй" });
      }
      return rows;
    }

    return [];
  }, [request, formType, detail]);

  const renderAnnualLeave = () => {
    const periods = Array.isArray(detail.periods) ? detail.periods : [];
    if (periods.length === 0) return null;
    const totalDays = periods.reduce(
      (sum: number, p: any) => sum + (Number(p?.days) || 0),
      0
    );
    return (
      <View className="gap-2.5">
        {periods.map((p: any, i: number) => {
          const start = p.start_date ? dayjs(p.start_date, "YYYY-MM-DD") : null;
          const end = p.end_date ? dayjs(p.end_date, "YYYY-MM-DD") : null;
          const sameDay = start && end && start.isValid() && end.isValid() && start.isSame(end, "day");
          let value = "";
          if (start && start.isValid() && end && end.isValid() && !sameDay) {
            value = `${start.format("YYYY/MM/DD")} — ${end.format("YYYY/MM/DD")}`;
          } else if (start && start.isValid()) {
            value = start.format("YYYY/MM/DD");
          }
          return (
            <View key={i} className="flex-row gap-2 justify-between">
              <AppText className="text-sm text-darkgray">Амралт {i + 1}</AppText>
              <AppText className="text-sm font-medium text-black">{value}</AppText>
            </View>
          );
        })}
        {totalDays > 0 && (
          <View className="flex-row gap-2 justify-between">
            <AppText className="text-sm text-darkgray">Хоног</AppText>
            <AppText className="text-sm font-medium text-black">{totalDays} хоног</AppText>
          </View>
        )}
      </View>
    );
  };

  const employee = request?.employee;

  return (
    <>
    <StyledSafeAreaView className="flex-1 bg-darkgray/7" edges={["top"]}>
      <View className="flex-1">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : !request ? (
          <View className="flex-1 items-center justify-center">
            <AppText className="text-sm text-darkgray">Мэдээлэл олдсонгүй</AppText>
          </View>
        ) : (
          <>
            <View className="px-4 pb-5">
              <AppHeader
                backTitle="Буцах"
                backTitleClassName="text-sm font-medium text-darkgray"
                showBack
              />

              {employee && (
                <View className="flex-row items-center gap-3 mb-5">
                  <Avatar alt={employeeFullName(employee)} className="w-12 h-12">
                    <Avatar.Image source={{ uri: employee.profile_image_url ?? "" }} />
                    <Avatar.Fallback classNames={{ text: "text-black text-sm" }}>
                      {employeeFallback(employee)}
                    </Avatar.Fallback>
                  </Avatar>
                  <View className="flex-1">
                    <AppText className="text-base font-medium" numberOfLines={1}>
                      {employeeFullName(employee)}
                    </AppText>
                    {employee.last_assignment?.job_position?.name && (
                      <AppText className="text-sm text-darkgray mt-0.5" numberOfLines={1}>
                        {employee.last_assignment.job_position.name}
                      </AppText>
                    )}
                  </View>
                </View>
              )}

              <AppText className="text-base font-medium text-black mb-3" numberOfLines={1}>
                {request.setting.name}
              </AppText>
              <Separator className="bg-darkgray/50 mb-5" />

              <View className="gap-6">
                {formType === "annualLeave"
                  ? renderAnnualLeave()
                  : formRows.length > 0
                    ? <InfoRowsView rows={formRows} />
                    : null}

                <View className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <AppText className="text-sm text-darkgray">Шалтгаан</AppText>
                    {request.attachments && request.attachments.length > 0 && (
                      <Pressable
                        className="flex-row items-center gap-1.5"
                        onPress={() => setViewingAttachments(request.attachments!)}
                      >
                        <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={16} />
                        <AppText className="text-sm text-blue">Хавсралттай</AppText>
                      </Pressable>
                    )}
                  </View>
                  {description ? (
                    <TruncatedText
                      text={description}
                      className="text-sm text-black"
                      onExpand={() => setExpandedText({ title: "Шалтгаан", text: description })}
                    />
                  ) : (
                    <AppText className="text-sm text-muted">-</AppText>
                  )}
                </View>

              </View>
            </View>

            <View className="flex-1 bg-background px-4">
            {request.review_detail?.comment && (
              <View className="pt-5 gap-1">
                <View className="flex-row items-center justify-between">
                  <AppText className="text-sm text-darkgray">Санал</AppText>
                  {request.review_detail.attachments && request.review_detail.attachments.length > 0 && (
                    <Pressable
                      className="flex-row items-center gap-1.5"
                      onPress={() => setViewingAttachments(request.review_detail!.attachments!)}
                    >
                      <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={16} />
                      <AppText className="text-sm text-blue">Хавсралттай</AppText>
                    </Pressable>
                  )}
                </View>
                <TruncatedText
                  text={request.review_detail.comment}
                  className="text-sm"
                  onExpand={() =>
                    setExpandedText({
                      title: "Санал",
                      text: request.review_detail!.comment!,
                    })
                  }
                />
              </View>
            )}
            {request.decision_detail?.comment && (
              <View className="pt-5 gap-1">
                <View className="flex-row items-center justify-between">
                  <AppText className="text-sm text-darkgray">Шийдвэр</AppText>
                  {request.decision_detail.attachments && request.decision_detail.attachments.length > 0 && (
                    <Pressable
                      className="flex-row items-center gap-1.5"
                      onPress={() => setViewingAttachments(request.decision_detail!.attachments!)}
                    >
                      <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={16} />
                      <AppText className="text-sm text-blue">Хавсралттай</AppText>
                    </Pressable>
                  )}
                </View>
                <TruncatedText
                  text={request.decision_detail.comment}
                  className="text-sm"
                  onExpand={() =>
                    setExpandedText({
                      title: "Шийдвэр",
                      text: request.decision_detail!.comment!,
                    })
                  }
                />
              </View>
            )}
            {actionMode !== "readOnly" && (
              <View className="gap-3 pt-6">
                <AppTextField
                  isTextArea
                  placeholder="Тайлбараа энд бичнэ үү"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={4}
                  className="min-h-24"
                />

                <Pressable
                  className="flex-row items-center justify-end gap-2"
                  onPress={handlePickAttachments}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Spinner color="#005FEE" size="sm" />
                  ) : (
                    <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={20} />
                  )}
                  <AppText className="text-sm text-darkgray">
                    {isUploading ? "Хуулж байна..." : "Файл хавсаргах"}
                  </AppText>
                </Pressable>

                {actionAttachments.map((file, index) => (
                  <View key={index} className="flex-row items-center gap-2">
                    <View className="flex-1 flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3">
                      <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={20} />
                      <AppText className="text-sm flex-1" numberOfLines={1}>
                        {file.name}
                      </AppText>
                    </View>
                    <Pressable
                      onPress={() => handleRemoveAttachment(index)}
                      className="w-12 h-12 items-center justify-center border border-gray/20 rounded-xl"
                    >
                      <HugeiconsIcon icon={MultiplicationSignIcon} color="#EF4444" size={18} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {actionMode === "decide" ? (
              <View
                className="flex-row gap-3 mt-auto"
                style={{ paddingBottom: insets.bottom + 10, paddingTop: 24 }}
              >
                <AppButton
                  label="Татгалзах"
                  className="flex-1 border-red/15 bg-red/10"
                  labelClassName="text-red"
                  isLoading={submittingAction === "reject"}
                  isDisabled={isUploading || !comment.trim() || (submittingAction !== null && submittingAction !== "reject")}
                  spinnerColor="#EF4444"
                  onPress={() => setPendingAction("reject")}
                />
                <AppButton
                  label="Зөвшөөрөх"
                  className="flex-1 border-green/15 bg-green/10"
                  labelClassName="text-green"
                  isLoading={submittingAction === "approve"}
                  isDisabled={isUploading || !comment.trim() || (submittingAction !== null && submittingAction !== "approve")}
                  spinnerColor="#16A34A"
                  onPress={() => setPendingAction("approve")}
                />
              </View>
            ) : actionMode === "review" ? (
              <View className="mt-auto" style={{ paddingBottom: insets.bottom + 10, paddingTop: 24 }}>
                <AppButton
                  label="Саналаа илгээх"
                  className="border-darkcyan/15 bg-darkcyan/10"
                  labelClassName="text-darkcyan"
                  isLoading={submittingAction === "review"}
                  isDisabled={isUploading || !comment.trim()}
                  spinnerColor="#0E7490"
                  onPress={() => setPendingAction("review")}
                />
              </View>
            ) : request?.review_by_type?.includes("Employee") && request?.status === "pending" ? (
              <View
                className="items-center mt-auto"
                style={{ paddingBottom: insets.bottom + 10, paddingTop: 24 }}
              >
                <AppText className="text-base font-medium text-darkcyan">Санал өгсөн</AppText>
              </View>
            ) : status ? (
              <View
                className="items-center mt-auto"
                style={{ paddingBottom: insets.bottom + 10, paddingTop: 24 }}
              >
                <AppText className={`text-base font-medium ${status.color}`}>{status.label}</AppText>
              </View>
            ) : null}
            </View>
          </>
        )}
      </View>
    </StyledSafeAreaView>

    <Dialog
      isOpen={viewingAttachments !== null}
      onOpenChange={(open) => !open && setViewingAttachments(null)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="bg-[#6C719F]/40" />
        <Dialog.Content>
          <View className="mb-4 gap-1.5">
            <Dialog.Title>Хавсралт</Dialog.Title>
          </View>
          <View className="gap-2">
            {viewingAttachments?.map((file, i) => (
              <Pressable
                key={i}
                className="flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3"
                onPress={() => Linking.openURL(file.url)}
              >
                <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={20} />
                <AppText className="text-sm text-blue flex-1" numberOfLines={1}>
                  {file.name}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>

    <Dialog isOpen={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-[#6C719F]/40" />
        <Dialog.Content>
          <View className="mb-5 gap-1.5">
            <Dialog.Title>
              {pendingAction === "reject"
                ? "Татгалзах"
                : pendingAction === "approve"
                  ? "Зөвшөөрөх"
                  : "Санал илгээх"}
            </Dialog.Title>
            <Dialog.Description>
              {pendingAction === "reject"
                ? "Та энэ хүсэлтийг татгалзахдаа итгэлтэй байна уу?"
                : pendingAction === "approve"
                  ? "Та энэ хүсэлтийг зөвшөөрөхдөө итгэлтэй байна уу?"
                  : "Та саналаа илгээхдээ итгэлтэй байна уу?"}
            </Dialog.Description>
          </View>
          <View className="flex-row justify-end gap-3">
            <AppButton
              label="Үгүй"
              className="border-transparent bg-transparent"
              onPress={() => setPendingAction(null)}
            />
            <AppButton
              label="Тийм"
              labelClassName="text-white"
              className="bg-blue"
              isLoading={submittingAction !== null}
              onPress={async () => {
                if (!pendingAction) return;
                const action = pendingAction;
                await submitAction(action);
                setPendingAction(null);
              }}
            />
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>

    <Dialog isOpen={expandedText !== null} onOpenChange={(open) => !open && setExpandedText(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-[#6C719F]/40" />
        <Dialog.Content>
          <View className="mb-4 gap-1.5">
            <Dialog.Title>{expandedText?.title ?? ""}</Dialog.Title>
          </View>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            <AppText className="text-sm text-black">{expandedText?.text ?? ""}</AppText>
          </ScrollView>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
    </>
  );
}
