import { AppButton } from "@/components/app-button";
import { AppIcon } from "@/components/app-icon";
import { AppSelect, SelectOption } from "@/components/app-select";
import { AppText } from "@/components/app-text";
import { AppTextField } from "@/components/app-text-field";
import {
  avatarFallback,
  DeadlineInfo,
  fullName,
  monthKey,
  nameWithInitial,
  useSeniorContentPad,
} from "@/components/senior/shared";
import { api } from "@/config/api";
import { ScrollHandler } from "@/hooks/use-hide-tab-bar";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  MinusSignIcon,
  PlusSignIcon,
  Search01Icon,
  SquareLock02Icon,
  SquareUnlock02Icon,
  Task01Icon,
} from "@hugeicons-pro/core-stroke-standard";
import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";
import { Avatar, BottomSheet, Separator, useBottomSheetAwareHandlers } from "heroui-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SalaryPerfMonth {
  year: number;
  month: number;
  label: string;
}

interface SalaryPerfNote {
  id?: number;
  content: string;
  type?: string;
  creator_name?: string | null;
  created_at?: string | null;
}

interface SalaryPerfItem {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  job_position_name?: string | null;
  profile_image_url?: string | null;
  performance_percent: number;
  status: string;
  notes?: SalaryPerfNote[];
}

interface SalaryPerfResponse {
  salary_date: string | null;
  months: SalaryPerfMonth[];
  list: SalaryPerfItem[];
}

const PERF_STEP = 5;

function NoteField({
  value,
  onChangeText,
  isInvalid,
}: {
  value: string;
  onChangeText: (text: string) => void;
  isInvalid?: boolean;
}) {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  return (
    <AppTextField
      isTextArea
      className="h-25"
      placeholder="Тэмдэглэл бичих"
      value={value}
      onChangeText={onChangeText}
      onFocus={onFocus}
      onBlur={onBlur}
      isInvalid={isInvalid}
      errorMessage="Тэмдэглэл бичнэ үү"
    />
  );
}

export function SeniorPerformance({
  onScroll,
  onDeadlineChange,
}: {
  onScroll?: ScrollHandler;
  onDeadlineChange?: (info: DeadlineInfo | null) => void;
}) {
  const contentPad = useSeniorContentPad();
  const insets = useSafeAreaInsets();
  const [months, setMonths] = useState<SalaryPerfMonth[]>([]);
  const [items, setItems] = useState<SalaryPerfItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<SelectOption | null>(null);
  const [salaryDate, setSalaryDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [noteFor, setNoteFor] = useState<SalaryPerfItem | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteInvalid, setNoteInvalid] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const isFetching = useRef(false);
  const loadedMonth = useRef<string | null>(null);

  const monthOptions = useMemo<SelectOption[]>(
    () =>
      months.map((m) => ({
        value: monthKey(m.year, m.month),
        label: `${m.year} / ${String(m.month).padStart(2, "0")}`,
      })),
    [months]
  );

  const selectedSummary = useMemo(
    () =>
      selectedMonth
        ? months.find((m) => monthKey(m.year, m.month) === selectedMonth.value) ?? null
        : null,
    [months, selectedMonth]
  );

  const month = selectedSummary?.month ?? dayjs().month() + 1;

  const isCurrentMonth = useMemo(
    () =>
      !!selectedMonth &&
      months.length > 0 &&
      selectedMonth.value === monthKey(months[0].year, months[0].month),
    [selectedMonth, months]
  );

  const deadlineUrgent = useMemo(
    () => !!salaryDate && dayjs(salaryDate).diff(dayjs().startOf("day"), "day") <= 7,
    [salaryDate]
  );

  // Surface the salary-evaluation deadline to the parent so it renders in the
  // screen header (top-right), per design — shown only for the current month.
  useEffect(() => {
    if (isCurrentMonth && salaryDate) {
      onDeadlineChange?.({
        label: `Үнэлж дуусах огноо ${dayjs(salaryDate).format("MM/DD")}`,
        urgent: deadlineUrgent,
      });
    } else {
      onDeadlineChange?.(null);
    }
  }, [isCurrentMonth, salaryDate, deadlineUrgent, onDeadlineChange]);

  // Clear the header deadline when this section unmounts (tab switched away).
  useEffect(() => () => onDeadlineChange?.(null), [onDeadlineChange]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => fullName(it).toLowerCase().includes(q));
  }, [items, search]);

  const fetchData = useCallback((month?: SalaryPerfMonth | null, isRefresh = false, silent = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    // silent → refetch in the background (e.g. after saving a note) without a
    // programmatic RefreshControl spinner, which can stick on iOS off the top.
    if (silent) {
      // no indicator
    } else if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const path =
      "/senior/salary-performance" +
      (month ? `?year=${month.year}&month=${month.month}` : "");

    api<SalaryPerfResponse>({ path, method: "GET" })
      .then((res) => {
        if (res.status === 200 && res.data) {
          const d = res.data;
          setItems(d.list ?? []);
          setSalaryDate(d.salary_date ?? null);
          if (d.months?.length) {
            setMonths(d.months);
            loadedMonth.current = month
              ? monthKey(month.year, month.month)
              : monthKey(d.months[0].year, d.months[0].month);
            setSelectedMonth((prev) =>
              prev ?? {
                value: monthKey(d.months[0].year, d.months[0].month),
                label: `${d.months[0].year} / ${String(d.months[0].month).padStart(2, "0")}`,
              }
            );
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        isFetching.current = false;
        setRefreshing(false);
        setLoading(false);
      });
  }, []);

  // Reload the currently selected month when the tab regains focus.
  const selectedSummaryRef = useRef<SalaryPerfMonth | null>(selectedSummary);
  selectedSummaryRef.current = selectedSummary;

  useFocusEffect(
    useCallback(() => {
      fetchData(selectedSummaryRef.current);
    }, [fetchData])
  );

  // Refetch when the user picks a different month from the selector.
  useEffect(() => {
    if (!selectedMonth || !selectedSummary) return;
    if (selectedMonth.value === loadedMonth.current) return;
    fetchData(selectedSummary);
  }, [selectedMonth, selectedSummary, fetchData]);

  const adjust = useCallback((id: number, delta: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.status === "draft"
          ? {
              ...it,
              performance_percent: Math.min(
                100,
                Math.max(0, it.performance_percent + delta)
              ),
            }
          : it
      )
    );
  }, []);

  const approve = useCallback((item: SalaryPerfItem) => {
    api({
      path: `/senior/salary-performance/${item.id}/approve`,
      method: "POST",
      data: { performance_percent: item.performance_percent },
    })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: "approved" } : it
            )
          );
        }
      })
      .catch(console.error);
  }, []);

  const cancel = useCallback((item: SalaryPerfItem) => {
    api({
      path: `/senior/salary-performance/${item.id}/cancel`,
      method: "POST",
    })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: "draft" } : it
            )
          );
        }
      })
      .catch(console.error);
  }, []);

  const openNote = useCallback((item: SalaryPerfItem) => {
    setNoteFor(item);
    setNoteDraft("");
    setNoteInvalid(false);
  }, []);

  const saveNote = useCallback(() => {
    if (!noteFor || savingNote) return;
    const content = noteDraft.trim();
    if (!content) {
      setNoteInvalid(true);
      return;
    }
    setNoteInvalid(false);
    setSavingNote(true);
    api({
      path: `/senior/salary-performance/${noteFor.id}/note`,
      method: "POST",
      data: { content },
    })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          Keyboard.dismiss();
          setNoteFor(null);
          fetchData(selectedSummaryRef.current, false, true);
        }
      })
      .catch(console.error)
      .finally(() => setSavingNote(false));
  }, [noteFor, noteDraft, savingNote, fetchData]);

  const renderItem = useCallback(
    ({ item }: { item: SalaryPerfItem }) => {
      const locked = item.status !== "draft";
      const hasNote = (item.notes?.length ?? 0) > 0;
      if (!isCurrentMonth) {
        return (
          <View className="flex-row items-center gap-2 h-16">
            <Avatar alt={fullName(item)} className="w-[52px] h-[52px]">
              <Avatar.Image source={{ uri: item.profile_image_url ?? "" }} />
              <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                {avatarFallback(item)}
              </Avatar.Fallback>
            </Avatar>
            <View className="flex-1">
              <AppText className="text-base font-normal text-black" numberOfLines={1}>
                {nameWithInitial(item)}
              </AppText>
              <AppText className="text-sm text-darkgray" numberOfLines={1}>
                {item.job_position_name}
              </AppText>
            </View>
            <AppText className="text-sm font-normal text-green">
              {item.performance_percent} %
            </AppText>
          </View>
        );
      }
      return (
        <View className="py-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Avatar alt={fullName(item)} className="w-[52px] h-[52px]">
              <Avatar.Image source={{ uri: item.profile_image_url ?? "" }} />
              <Avatar.Fallback classNames={{ text: "text-black text-xs" }}>
                {avatarFallback(item)}
              </Avatar.Fallback>
            </Avatar>
            <View className="flex-1">
              <AppText className="text-base font-medium text-black" numberOfLines={1}>
                {nameWithInitial(item)}
              </AppText>
              <AppText className="text-sm text-darkgray" numberOfLines={1}>
                {item.job_position_name}
              </AppText>
            </View>
          </View>

          <View className="flex-row items-center gap-[15px]">
            {locked ? (
              <View className="flex-1 h-11 items-center justify-center rounded-xl bg-green/10">
                <AppText className="text-base font-normal text-black">
                  {item.performance_percent} %
                </AppText>
              </View>
            ) : (
              <View className="flex-1 flex-row items-center h-11 rounded-xl bg-darkgray/5">
                <Pressable
                  className="w-12 h-full items-center justify-center"
                  hitSlop={4}
                  onPress={() => adjust(item.id, -PERF_STEP)}
                >
                  <AppIcon icon={MinusSignIcon} color="#222222" size={20} />
                </Pressable>
                <AppText className="flex-1 text-center text-base font-normal text-black">
                  {item.performance_percent} %
                </AppText>
                <Pressable
                  className="w-12 h-full items-center justify-center"
                  hitSlop={4}
                  onPress={() => adjust(item.id, PERF_STEP)}
                >
                  <AppIcon icon={PlusSignIcon} color="#222222" size={20} />
                </Pressable>
              </View>
            )}

            <Pressable
              className="w-11 h-11 rounded-full border border-darkgray/30 items-center justify-center"
              hitSlop={4}
              onPress={() => openNote(item)}
            >
              <AppIcon
                icon={Task01Icon}
                color={hasNote ? "#F0B400" : "#6A6A6A"}
                size={20}
              />
            </Pressable>

            {locked ? (
              <Pressable
                className="w-11 h-11 rounded-full border border-darkgray/30 items-center justify-center"
                hitSlop={4}
                onPress={() => cancel(item)}
              >
                <AppIcon icon={SquareLock02Icon} color="#18AA0B" size={20} />
              </Pressable>
            ) : (
              <Pressable
                className="w-11 h-11 rounded-full border border-darkgray/30 items-center justify-center"
                hitSlop={4}
                onPress={() => approve(item)}
              >
                <AppIcon icon={SquareUnlock02Icon} color="#222222" size={20} />
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [adjust, approve, cancel, openNote, isCurrentMonth]
  );

  return (
    <>
      <View className="flex-row items-center gap-3 mb-3">
        <View className="flex-[2]">
          <AppTextField
            placeholder="Ажилтнаар хайх"
            leftIcon={<AppIcon icon={Search01Icon} color="#222222" size={20} />}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View className="flex-1">
          <AppSelect
            title="Гүйцэтгэл"
            options={monthOptions}
            value={selectedMonth ?? undefined}
            onValueChange={(opt) => opt && setSelectedMonth(opt)}
            placeholder={`${String(month).padStart(2, "0")} сар`}
            renderValue={(opt) => (
              <AppText className="text-base">{opt.value.split("-")[1]} сар</AppText>
            )}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: contentPad }}
          ItemSeparatorComponent={
            isCurrentMonth ? () => <Separator className="bg-darkgray/12" /> : undefined
          }
          refreshing={refreshing}
          onRefresh={() => fetchData(selectedSummary, true)}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <AppText className="text-sm text-darkgray">Өгөгдөл байхгүй байна</AppText>
            </View>
          }
        />
      )}

      <BottomSheet
        isOpen={noteFor !== null}
        onOpenChange={(open) => {
          if (!open) {
            Keyboard.dismiss();
            setNoteFor(null);
            setNoteInvalid(false);
          }
        }}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay className="bg-scrim/40" />
          <BottomSheet.Content
            enableOverDrag={false}
            handleComponent={null}
            backgroundClassName="rounded-t-[10px]"
          >
            <BottomSheet.Title className="text-center text-lg font-medium text-black pb-5">
              Тэмдэглэл
            </BottomSheet.Title>
            <View className="gap-5" style={{ paddingBottom: insets.bottom + 12 }}>
              {noteFor?.notes?.length ? (
                <BottomSheetScrollView
                  className="max-h-48"
                  showsVerticalScrollIndicator={false}
                >
                  <View className="gap-2">
                    {noteFor.notes.map((note, i) => (
                      <View key={note.id ?? i} className="bg-darkgray/5 rounded-lg px-3 py-2">
                        <AppText className="text-sm">{note.content}</AppText>
                        <View className="flex-row items-center justify-between mt-1 gap-3">
                          {note.creator_name ? (
                            <AppText className="text-xs text-darkgray" numberOfLines={1}>
                              {note.creator_name}
                            </AppText>
                          ) : (
                            <View />
                          )}
                          {note.created_at ? (
                            <AppText className="text-xs text-darkgray">
                              {dayjs(note.created_at).format("YYYY/MM/DD HH:mm")}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                </BottomSheetScrollView>
              ) : null}
              <NoteField
                value={noteDraft}
                onChangeText={(text) => {
                  setNoteDraft(text);
                  if (noteInvalid && text.trim()) setNoteInvalid(false);
                }}
                isInvalid={noteInvalid}
              />
              <AppButton
                label="Хадгалах"
                onPress={saveNote}
                isLoading={savingNote}
                spinnerColor="#ffffff"
                className="mt-[10px] bg-blue border-0 rounded-full"
                labelClassName="text-white text-base font-semibold"
              />
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </>
  );
}
