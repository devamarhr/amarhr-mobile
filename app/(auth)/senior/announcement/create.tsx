import { AppButton } from "@/components/app-button";
import { AppHeader } from "@/components/app-header";
import { AppFieldIcon, AppIcon } from "@/components/app-icon";
import { AppSelect, SelectOption } from "@/components/app-select";
import { AppText } from "@/components/app-text";
import { AppTextField } from "@/components/app-text-field";
import { AppToast } from "@/components/app-toast";
import { api, uploadFile } from "@/config/api";
import { pickAttachments, type PickedAsset } from "@/utils/pick-attachment";
import {
  Alert01Icon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  FileAttachmentIcon,
  MultiplicationSignIcon,
  Tick02Icon,
} from "@hugeicons-pro/core-stroke-standard";
import { useRouter } from "expo-router";
import { Avatar, cn, Separator, Spinner, useToast } from "heroui-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

const MAX_ATTACHMENTS = 3;

interface SubordinateDepartment {
  id: number;
  name: string;
}

interface SubordinateEmployee {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  last_assignment?: {
    job_position?: { id: number; name: string } | null;
  } | null;
}

function employeeName(emp: SubordinateEmployee): string {
  const last = emp.last_name?.trim() ?? "";
  const first = emp.first_name?.trim() ?? "";
  if (last && first) return `${last[0]}.${first}`;
  return first || last || "";
}

function employeeAvatarFallback(emp: SubordinateEmployee): string {
  return ((emp.last_name?.[0] ?? "") + (emp.first_name?.[0] ?? "")) || "?";
}

export default function CreateAnnouncementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<SubordinateDepartment[]>([]);
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);

  const [employees, setEmployees] = useState<SubordinateEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeIds, setEmployeeIds] = useState<number[]>([]);
  const [employeeError, setEmployeeError] = useState(false);

  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [content, setContent] = useState("");
  const [contentError, setContentError] = useState(false);

  const [attachments, setAttachments] = useState<{ name: string; path: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    api<SubordinateDepartment[]>({
      path: "/senior/announcements/subordinate-departments",
      method: "GET",
    }).then((res) => {
      if (res.status === 200 && Array.isArray(res.data)) {
        setDepartments(res.data);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    setEmployeesLoading(true);
    const params = departmentIds.map((id) => `department_ids[]=${id}`).join("&");
    api<SubordinateEmployee[]>({
      path: `/senior/announcements/subordinates${params ? `?${params}` : ""}`,
      method: "GET",
    }).then((res) => {
      if (res.status === 200 && Array.isArray(res.data)) {
        setEmployees(res.data);
        setEmployeeIds((prev) => {
          const allowed = new Set(res.data.map((e) => e.id));
          return prev.filter((id) => allowed.has(id));
        });
      }
    }).catch(console.error).finally(() => setEmployeesLoading(false));
  }, [departmentIds]);

  useEffect(() => {
    if (employeeIds.length > 0) setEmployeeError(false);
  }, [employeeIds]);

  const departmentLabel = useMemo(() => {
    if (departmentIds.length === 0) return "Бүх алба, хэлтэс";
    if (departmentIds.length === 1) {
      return departments.find((d) => d.id === departmentIds[0])?.name ?? `${departmentIds.length} алба хэлтэс`;
    }
    return `${departmentIds.length} алба хэлтэс`;
  }, [departmentIds, departments]);

  const employeeLabel = useMemo(() => {
    if (employees.length === 0) return "Ажилтан байхгүй";
    if (employeeIds.length === 0) return "Ажилтан сонгох";
    if (employeeIds.length === employees.length) return `${employees.length} ажилтан`;
    return `${employeeIds.length} ажилтан`;
  }, [employeeIds, employees]);

  // department / employee ids <-> SelectOption[] for AppSelect (multiple mode).
  const departmentOptions = useMemo<SelectOption[]>(
    () => departments.map((d) => ({ value: String(d.id), label: d.name })),
    [departments]
  );
  const departmentValues = useMemo<SelectOption[]>(
    () => departmentOptions.filter((o) => departmentIds.includes(Number(o.value))),
    [departmentOptions, departmentIds]
  );

  const employeeOptions = useMemo<SelectOption[]>(
    () => employees.map((e) => ({ value: String(e.id), label: employeeName(e) })),
    [employees]
  );
  const employeeValues = useMemo<SelectOption[]>(
    () => employeeOptions.filter((o) => employeeIds.includes(Number(o.value))),
    [employeeOptions, employeeIds]
  );

  const handleSelectAllEmployees = useCallback(() => {
    if (employeeIds.length === employees.length) {
      setEmployeeIds([]);
    } else {
      setEmployeeIds(employees.map((e) => e.id));
    }
  }, [employeeIds, employees]);

  const uploadAssets = async (assets: PickedAsset[]) => {
    if (!assets.length) return;
    setIsUploading(true);
    for (const asset of assets) {
      try {
        const res = await uploadFile<{ path: string }>("/file-upload", asset.uri);
        if (res.status === 200) {
          setAttachments((prev) => [...prev, { name: asset.name, path: res.data.path }]);
        } else {
          toast.show({
            component: (props) => (
              <AppToast
                {...props}
                variant="danger"
                description={res.message || "Алдаа гарлаа"}
                icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
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
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      showError(`Дээд тал нь ${MAX_ATTACHMENTS} хавсралт хавсаргах боломжтой`);
      return;
    }
    const assets = await pickAttachments(remaining);
    await uploadAssets(assets.slice(0, remaining));
    if (assets.length > remaining) {
      showError(`Дээд тал нь ${MAX_ATTACHMENTS} хавсралт хавсаргах боломжтой`);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const showError = (message: string) => {
    toast.show({
      component: (props) => (
        <AppToast
          {...props}
          variant="danger"
          description={message}
          icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
        />
      ),
    });
  };

  const handleSend = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    const empErr = employeeIds.length === 0;
    const titleErr = !trimmedTitle;
    const contentErr = !trimmedContent;
    setEmployeeError(empErr);
    setTitleError(titleErr);
    setContentError(contentErr);
    if (empErr || titleErr || contentErr) return;

    setIsSubmitting(true);
    try {
      const res = await api({
        path: "/senior/announcements",
        method: "POST",
        data: {
          title: trimmedTitle,
          content: trimmedContent,
          attachments,
          employee_ids: employeeIds,
        },
      });
      if (res.status === 200) {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="success"
              description={res.message || "Илгээгдлээ"}
              icon={<AppIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
            />
          ),
        });
        router.back();
      } else {
        showError(res.message || "Алдаа гарлаа");
      }
    } catch (e) {
      console.error("Send announcement failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const employeesAllSelected = employees.length > 0 && employeeIds.length === employees.length;
  const canPickEmployees = employees.length > 0 && !employeesLoading;

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-4">
        <AppHeader backTitle="Зарлал мэдээлэл илгээх" showBack />

        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={footerHeight + 20}
        >
          <View className="gap-[30px]">
            <AppSelect
              label="Алба, хэлтэс"
              title="Илгээх алба, хэлтэс"
              selectionMode="multiple"
              options={departmentOptions}
              values={departmentValues}
              onValuesChange={(opts) => setDepartmentIds(opts.map((o) => Number(o.value)))}
              itemClassName="px-0"
              trigger={
                <View className="flex-row rounded-lg border border-gray/30 items-center px-3 h-11">
                  <AppText className="text-base text-black flex-1">{departmentLabel}</AppText>
                  <AppIcon icon={ArrowDown01Icon} size={24} color="#222222" />
                </View>
              }
              renderItem={({ option, isSelected }) => (
                <AppText className={cn("text-base text-black flex-1", isSelected && "font-medium")}>
                  {option.label}
                </AppText>
              )}
            />

            <AppSelect
              label="Илгээх ажилтан"
              title="Илгээх ажилтан"
              selectionMode="multiple"
              isDisabled={!canPickEmployees}
              options={employeeOptions}
              values={employeeValues}
              onValuesChange={(opts) => setEmployeeIds(opts.map((o) => Number(o.value)))}
              showSeparators={false}
              itemClassName="px-0 py-1.5"
              trigger={
                <View
                  className={cn(
                    "flex-row rounded-lg border items-center px-3 h-11",
                    employeeError ? "border-red" : "border-gray/30",
                    !canPickEmployees && "opacity-50"
                  )}
                >
                  <AppText className={cn("text-base text-black flex-1", employeeIds.length === 0 && "text-muted")}>
                    {employeesLoading ? "Уншиж байна..." : employeeLabel}
                  </AppText>
                  {employeesLoading ? (
                    <ActivityIndicator size="small" color="#222222" />
                  ) : (
                    <AppIcon icon={ArrowDown01Icon} size={24} color="#222222" />
                  )}
                </View>
              }
              listHeader={
                <>
                  <Pressable
                    className="flex-row items-center h-[50px]"
                    onPress={handleSelectAllEmployees}
                  >
                    <AppText className={cn("text-base text-black flex-1", employeesAllSelected && "font-medium")}>
                      Бүх ажилтан
                    </AppText>
                    <View className="w-6 h-6 items-center justify-center">
                      {employeesAllSelected && (
                        <AppIcon icon={Tick02Icon} size={24} color="#18AA0B" />
                      )}
                    </View>
                  </Pressable>
                  <Separator className="bg-darkgray/15" />
                </>
              }
              renderItem={({ option }) => {
                const emp = employees.find((e) => String(e.id) === option.value);
                if (!emp) return null;
                const position = emp.last_assignment?.job_position?.name;
                return (
                  <View className="flex-row items-center gap-2 flex-1">
                    <Avatar alt={employeeName(emp)} className="w-[52px] h-[52px]">
                      <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                      <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                        {employeeAvatarFallback(emp)}
                      </Avatar.Fallback>
                    </Avatar>
                    <View className="flex-1">
                      <AppText className="text-base font-medium text-black" numberOfLines={1}>
                        {employeeName(emp)}
                      </AppText>
                      {position && (
                        <AppText className="text-sm text-darkgray" numberOfLines={1}>
                          {position}
                        </AppText>
                      )}
                    </View>
                  </View>
                );
              }}
            />

            <AppTextField
              label="Гарчиг"
              isRequired
              isInvalid={titleError}
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (t.trim()) setTitleError(false);
              }}
              placeholder="Гарчиг оруулна уу"
            />

            <AppTextField
              label="Агуулга"
              isRequired
              isInvalid={contentError}
              value={content}
              onChangeText={(t) => {
                setContent(t);
                if (t.trim()) setContentError(false);
              }}
              isTextArea
              className="h-36"
              placeholder="Зарлал, мэдээллээ энд бичнэ үү"
            />
          </View>

          <Pressable
            className={`flex-row items-center justify-end gap-2 mt-4 ${attachments.length >= MAX_ATTACHMENTS ? "opacity-40" : ""}`}
            onPress={handlePickAttachments}
            disabled={isUploading || attachments.length >= MAX_ATTACHMENTS}
          >
            {isUploading ? (
              <Spinner color="#005FEE" size="sm" />
            ) : (
              <AppFieldIcon icon={FileAttachmentIcon} color="#222222" />
            )}
            <AppText className="text-base text-darkgray">
              {isUploading ? "Хуулж байна..." : "Файл хавсаргах"}
            </AppText>
          </Pressable>

          {attachments.length > 0 && (
            <View className="gap-3 mt-4">
              {attachments.map((file, index) => (
                <View key={index} className="flex-row items-center gap-3">
                  <View className="flex-1 flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3">
                    <AppFieldIcon icon={FileAttachmentIcon} color="#6A6A6A" />
                    <AppText className="text-sm flex-1" numberOfLines={1}>{file.name}</AppText>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveAttachment(index)}
                    className="w-12 h-12 items-center justify-center border border-gray/20 rounded-xl"
                  >
                    <AppIcon icon={MultiplicationSignIcon} color="#EF444480" size={24} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </KeyboardAwareScrollView>
      </View>

      <KeyboardStickyView
        offset={{ closed: 0, opened: insets.bottom - 12 }}
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
      >
        <View className="px-4 bg-background" style={{ paddingBottom: insets.bottom + 10, paddingTop: 16 }}>
          <AppButton
            label="Илгээх"
            onPress={handleSend}
            isDisabled={isUploading}
            isLoading={isSubmitting}
            className="bg-lightblue border-darkblue/15"
            labelClassName="text-darkerblue text-base font-medium"
          />
        </View>
      </KeyboardStickyView>
    </StyledSafeAreaView>
  );
}
