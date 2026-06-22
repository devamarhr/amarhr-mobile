import { AppButton } from "@/components/app-button";
import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { AppTextField } from "@/components/app-text-field";
import { AppToast } from "@/components/app-toast";
import { api, uploadFile } from "@/config/api";
import { pickAttachments, type PickedAsset } from "@/utils/pick-attachment";
import { BottomSheetScrollView, type BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
import {
  Alert01Icon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  FileAttachmentIcon,
  MultiplicationSignIcon,
  Tick02Icon,
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { Avatar, BottomSheet, cn, PressableFeedback, Separator, Spinner, useToast } from "heroui-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

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
  const [departmentSheetOpen, setDepartmentSheetOpen] = useState(false);

  const [employees, setEmployees] = useState<SubordinateEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeIds, setEmployeeIds] = useState<number[]>([]);
  const [employeeSheetOpen, setEmployeeSheetOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [attachments, setAttachments] = useState<{ name: string; path: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const departmentScrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const employeeScrollRef = useRef<BottomSheetScrollViewMethods>(null);

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

  const toggleDepartment = useCallback((id: number) => {
    setDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }, []);

  const toggleEmployee = useCallback((id: number) => {
    setEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAllEmployees = useCallback(() => {
    if (employeeIds.length === employees.length) {
      setEmployeeIds([]);
    } else {
      setEmployeeIds(employees.map((e) => e.id));
    }
  }, [employeeIds, employees]);

  const handleDepartmentOpenChange = useCallback((open: boolean) => {
    setDepartmentSheetOpen(open);
    if (open) departmentScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const handleEmployeeOpenChange = useCallback((open: boolean) => {
    if (open && employees.length === 0) return;
    setEmployeeSheetOpen(open);
    if (open) employeeScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [employees.length]);

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
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const showError = (message: string) => {
    toast.show({
      component: (props) => (
        <AppToast
          {...props}
          variant="danger"
          description={message}
          icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
        />
      ),
    });
  };

  const handleSend = async () => {
    if (employeeIds.length === 0) {
      showError("Ажилтан сонгоно уу");
      return;
    }
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) {
      showError("Гарчиг бичнэ үү");
      return;
    }
    if (!trimmedContent) {
      showError("Агуулгаа бичнэ үү");
      return;
    }

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
              icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
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
          bottomOffset={20}
        >
          <View className="gap-5">
            <View className="gap-2">
              <AppText className="text-sm text-darkgray">Алба хэлтэс</AppText>
              <PressableFeedback
                className="flex-row rounded-lg border border-gray/30 items-center px-3 h-11"
                onPress={() => handleDepartmentOpenChange(true)}
              >
                <AppText className="text-sm flex-1">{departmentLabel}</AppText>
                <HugeiconsIcon icon={ArrowDown01Icon} size={24} color="#222222" />
              </PressableFeedback>
            </View>

            <View className="gap-2">
              <AppText className="text-sm text-darkgray">Илгээх ажилтан</AppText>
              <PressableFeedback
                className={cn(
                  "flex-row rounded-lg border border-gray/30 items-center px-3 h-11",
                  !canPickEmployees && "opacity-50"
                )}
                isDisabled={!canPickEmployees}
                onPress={() => handleEmployeeOpenChange(true)}
              >
                <AppText className={cn("text-sm flex-1", employeeIds.length === 0 && "text-muted")}>
                  {employeesLoading ? "Уншиж байна..." : employeeLabel}
                </AppText>
                {employeesLoading ? (
                  <ActivityIndicator size="small" color="#222222" />
                ) : (
                  <HugeiconsIcon icon={ArrowDown01Icon} size={24} color="#222222" />
                )}
              </PressableFeedback>
            </View>

            <AppTextField
              label="Гарчиг"
              value={title}
              onChangeText={setTitle}
              placeholder="Гарчиг оруулна уу"
            />

            <AppTextField
              label="Агуулга"
              value={content}
              onChangeText={setContent}
              isTextArea
              className="h-36"
              placeholder="Зарлал, мэдээллээ энд бичнэ үү"
            />

            <Pressable
              className="flex-row items-center justify-end gap-2"
              onPress={handlePickAttachments}
              disabled={isUploading}
            >
              {isUploading ? (
                <Spinner color="#005FEE" size="sm" />
              ) : (
                <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={24} />
              )}
              <AppText className="text-sm text-darkgray">
                {isUploading ? "Хуулж байна..." : "Файл хавсаргах"}
              </AppText>
            </Pressable>

            {attachments.map((file, index) => (
              <View key={index} className="flex-row items-center gap-3">
                <View className="flex-1 flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3">
                  <HugeiconsIcon icon={FileAttachmentIcon} color="#6A6A6A" size={24} />
                  <AppText className="text-sm flex-1" numberOfLines={1}>{file.name}</AppText>
                </View>
                <Pressable
                  onPress={() => handleRemoveAttachment(index)}
                  className="w-12 h-12 items-center justify-center border border-gray/20 rounded-xl"
                >
                  <HugeiconsIcon icon={MultiplicationSignIcon} color="#EF444480" size={24} />
                </Pressable>
              </View>
            ))}
          </View>
        </KeyboardAwareScrollView>

        <View style={{ paddingBottom: insets.bottom + 10 }}>
          <AppButton
            label="Илгээх"
            onPress={handleSend}
            isDisabled={isUploading}
            isLoading={isSubmitting}
            className="bg-lightblue border-darkblue/15"
            labelClassName="text-darkerblue text-base font-medium"
          />
        </View>
      </View>

      <BottomSheet isOpen={departmentSheetOpen} onOpenChange={handleDepartmentOpenChange}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay className="bg-[#6C719F]/40" />
          <BottomSheet.Content
            snapPoints={["75%"]}
            topInset={insets.top}
            enableOverDrag={false}
            enableDynamicSizing={false}
            handleComponent={null}
            contentContainerClassName="h-full p-0 rounded-t-[10px] border border-transparent bg-overlay overflow-hidden"
          >
            <View className="flex-row px-4 py-5 justify-between">
              <View className="flex-1">
                <AppText className="text-base font-medium text-center">Илгээх алба хэлтэс</AppText>
              </View>
              <PressableFeedback onPress={() => handleDepartmentOpenChange(false)}>
                <HugeiconsIcon icon={MultiplicationSignIcon} color="#6A6A6A" size={24} />
              </PressableFeedback>
            </View>

            <BottomSheetScrollView
              ref={departmentScrollRef}
              contentContainerClassName="pt-2 px-4 pb-4"
              showsVerticalScrollIndicator={false}
            >
              {departments.map((dept, index) => {
                const isSelected = departmentIds.includes(dept.id);
                return (
                  <View key={dept.id}>
                    <Pressable
                      className="flex-row items-center py-3"
                      onPress={() => toggleDepartment(dept.id)}
                    >
                      <AppText className={cn("text-sm flex-1", isSelected && "font-medium")}>
                        {dept.name}
                      </AppText>
                      <View className="w-6 h-6 items-center justify-center">
                        {isSelected && (
                          <HugeiconsIcon icon={Tick02Icon} size={24} color="#18AA0B" />
                        )}
                      </View>
                    </Pressable>
                    {index < departments.length - 1 && (
                      <Separator className="bg-darkgray/15" />
                    )}
                  </View>
                );
              })}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      <BottomSheet isOpen={employeeSheetOpen} onOpenChange={handleEmployeeOpenChange}>
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
            <View className="flex-row px-4 py-5 justify-between">
              <View className="flex-1">
                <AppText className="text-base font-medium text-center">Илгээх ажилтан</AppText>
              </View>
              <PressableFeedback onPress={() => handleEmployeeOpenChange(false)}>
                <HugeiconsIcon icon={MultiplicationSignIcon} color="#6A6A6A" size={24} />
              </PressableFeedback>
            </View>

            <View className="px-4 pb-2">
              <Pressable
                className="flex-row items-center py-3"
                onPress={handleSelectAllEmployees}
              >
                <AppText className={cn("text-sm flex-1", employeesAllSelected && "font-medium")}>
                  Бүгд
                </AppText>
                <View className="w-6 h-6 items-center justify-center">
                  {employeesAllSelected && (
                    <HugeiconsIcon icon={Tick02Icon} size={24} color="#18AA0B" />
                  )}
                </View>
              </Pressable>
              <Separator className="bg-darkgray/15" />
            </View>

            <BottomSheetScrollView
              ref={employeeScrollRef}
              contentContainerClassName="px-4 pb-8"
              showsVerticalScrollIndicator={false}
            >
              {employees.map((emp, index) => {
                const isSelected = employeeIds.includes(emp.id);
                const position = emp.last_assignment?.job_position?.name;
                return (
                  <View key={emp.id}>
                    <Pressable
                      className="flex-row items-center py-3 gap-3"
                      onPress={() => toggleEmployee(emp.id)}
                    >
                      <Avatar alt={employeeName(emp)} className="w-10 h-10">
                        <Avatar.Image source={{ uri: emp.profile_image_url ?? "" }} />
                        <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                          {employeeAvatarFallback(emp)}
                        </Avatar.Fallback>
                      </Avatar>
                      <View className="flex-1">
                        <AppText className={cn("text-sm", isSelected && "font-medium")}>
                          {employeeName(emp)}
                        </AppText>
                        {position && (
                          <AppText className="text-sm text-darkgray mt-0.5">{position}</AppText>
                        )}
                      </View>
                      <View className="w-6 h-6 items-center justify-center">
                        {isSelected && (
                          <HugeiconsIcon icon={Tick02Icon} size={24} color="#18AA0B" />
                        )}
                      </View>
                    </Pressable>
                    {index < employees.length - 1 && (
                      <Separator className="bg-darkgray/15" />
                    )}
                  </View>
                );
              })}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </StyledSafeAreaView>
  );
}
