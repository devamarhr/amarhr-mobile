import { AppButton } from '@/components/app-button';
import { AppDatePicker } from '@/components/app-date-picker';
import { AppDialog } from '@/components/app-dialog';
import { AppHeader } from '@/components/app-header';
import { AppIcon } from "@/components/app-icon";
import { AppSelect } from '@/components/app-select';
import { AppText } from '@/components/app-text';
import { AppToast } from '@/components/app-toast';
import { api } from '@/config/api';
import {
  Alert01Icon,
  ArrowLeft02Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  MultiplicationSignIcon,
  SquareLock02Icon,
} from '@hugeicons-pro/core-stroke-standard';
import dayjs from 'dayjs';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Spinner, useToast } from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import ActionSheet, { ActionSheetRef } from 'react-native-actions-sheet';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

type SplitType = 'scheduled' | 'advance' | 'unused';

interface AnnualLeaveSplit {
  id: number;
  decree_id: number | null;
  type: SplitType;
  start_date: string | null;
  end_date: string | null;
  days: number;
  excluded_days: number;
}

interface AnnualLeaveData {
  available_days: number;
  remaining_days: number;
  cycle_start_date: string | null;
  cycle_end_date: string | null;
  max_splits: number;
  splits: AnnualLeaveSplit[];
}

const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  scheduled: 'Төлөвлөсөн ээлжийн амралт',
  advance: 'Урьдчилж авсан э/амралт',
  unused: 'Биеэр эдлээгүй хоногийн олговор авах',
};

function formatSplitRange(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  return `${dayjs(start, 'YYYY-MM-DD').format('YYYY/MM/DD')} - ${dayjs(end, 'YYYY-MM-DD').format('YYYY/MM/DD')}`;
}

// Ахлах доод ажилтныхаа э/амралтын дуусах огноог урьдчилан тооцно (read-only).
// Ажилтны timesheet-ийн ажлын өдрөөр (is_work_day) тооцогддог тул employee_id-г
// заавал дамжуулна — өөрийн /employee-request endpoint ашиглаж болохгүй.
async function calculateEndDate(
  employeeId: string,
  startDate: string,
  days: number,
): Promise<string> {
  const res = await api<{ end_date: string }>({
    path: `/senior/annual-leaves/${employeeId}/end-date?start_date=${startDate}&days=${days}`,
    method: 'GET',
  });
  return res.data.end_date;
}

interface AddSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: AnnualLeaveData;
  employeeId: string;
  onSaved: () => void;
  showError: (msg: string) => void;
  showSuccess: (msg: string) => void;
}

function AddSheet({
  isOpen,
  onOpenChange,
  data,
  employeeId,
  onSaved,
  showError,
  showSuccess,
}: AddSheetProps) {
  const sheetRef = useRef<ActionSheetRef>(null);
  useEffect(() => {
    if (isOpen) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [isOpen]);
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Хоосон талбарт toast-ын оронд улаан border харуулна (талбар бөглөгдмөгц арилна).
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStartDate('');
      setDays('');
      setEndDate('');
      setIsSaving(false);
      setShowErrors(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;
    if (startDate && days) {
      calculateEndDate(employeeId, startDate, Number(days))
        .then((end) => {
          if (!cancelled) setEndDate(end);
        })
        .catch(console.error);
    } else {
      setEndDate('');
    }
    return () => {
      cancelled = true;
    };
  }, [employeeId, startDate, days]);

  const dayOptions = useMemo(
    () =>
      Array.from({ length: Math.max(1, data.remaining_days) }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1} хоног`,
      })),
    [data.remaining_days],
  );

  const minDate = useMemo(
    () =>
      data.cycle_start_date ? dayjs(data.cycle_start_date, 'YYYY-MM-DD').toDate() : undefined,
    [data.cycle_start_date],
  );
  const maxDate = useMemo(
    () => (data.cycle_end_date ? dayjs(data.cycle_end_date, 'YYYY-MM-DD').toDate() : undefined),
    [data.cycle_end_date],
  );

  const handleSave = async () => {
    if (!startDate || !days) {
      setShowErrors(true);
      return;
    }
    if (!endDate) {
      showError('Дуусах өдөр тооцоологдож дуусаагүй байна');
      return;
    }

    // Одоо байгаа огноотой split-үүдтэй давхцаж болохгүй
    const s = dayjs(startDate, 'YYYY-MM-DD');
    const e = dayjs(endDate, 'YYYY-MM-DD');
    const overlaps = data.splits.some((split) => {
      if (!split.start_date || !split.end_date) return false;
      const ps = dayjs(split.start_date, 'YYYY-MM-DD');
      const pe = dayjs(split.end_date, 'YYYY-MM-DD');
      return !s.isAfter(pe) && !ps.isAfter(e);
    });
    if (overlaps) {
      showError('Өмнө төлөвлөсөн амралттай давхцаж байна');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api({
        path: `/senior/annual-leaves/${employeeId}`,
        method: 'POST',
        data: { start_date: startDate, days: Number(days) },
      });
      if (res.status === 200) {
        showSuccess(res.message || 'Хадгалагдлаа');
        onSaved();
      } else {
        showError(res.message || 'Алдаа гарлаа');
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ActionSheet
      ref={sheetRef}
      isModal={false}
      gestureEnabled
      indicatorStyle={{ width: 0, height: 0, marginVertical: 0 }}
      containerStyle={{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
      onClose={() => onOpenChange(false)}
    >
        <View className="px-4 py-5">
          <AppText className="text-lg font-medium text-center">Ээлжийн амралт нэмэх</AppText>
        </View>
        <View className="px-4">
          <View className="gap-5">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <AppDatePicker
                  label="Эхлэх өдөр"
                  mode="date"
                  value={startDate ? dayjs(startDate, 'YYYY-MM-DD').toDate() : undefined}
                  onValueChange={(date) => setStartDate(dayjs(date).format('YYYY-MM-DD'))}
                  placeholder="00/00"
                  format="MM/DD"
                  minimumDate={minDate}
                  maximumDate={maxDate}
                  isInvalid={showErrors && !startDate}
                  icon={<AppIcon icon={Calendar03Icon} color="#222" size={22} />}
                />
              </View>
              <View className="flex-1">
                <AppSelect
                  label="Амрах хоног"
                  options={dayOptions}
                  value={dayOptions.find((o) => o.value === days)}
                  onValueChange={(opt) => setDays(opt?.value ?? '')}
                  placeholder="Сонгох"
                  isInvalid={showErrors && !days}
                  renderValue={(option) => <AppText className="text-base">{option.value}</AppText>}
                />
              </View>
              <View className="flex-1 gap-2">
                <AppText className="text-sm text-darkgray">Дуусах өдөр</AppText>
                <View className="flex-row items-center gap-1.5 bg-lightgray rounded-lg h-11 px-2.5">
                  <AppIcon icon={Calendar03Icon} color="#6A6A6A" size={22} />
                  <AppText className="text-base text-darkgray flex-1" numberOfLines={1}>
                    {endDate ? dayjs(endDate, 'YYYY-MM-DD').format('MM/DD') : '00/00'}
                  </AppText>
                </View>
              </View>
            </View>

            <AppButton
              label="Хадгалах"
              onPress={handleSave}
              isLoading={isSaving}
              spinnerColor="#ffffff"
              className="mt-[10px] bg-blue border-0 rounded-full"
              labelClassName="text-white text-base font-semibold"
            />
          </View>
        </View>
    </ActionSheet>
  );
}

export default function SeniorLeavePlanScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    firstName?: string;
    lastName?: string;
  }>();
  const { toast } = useToast();

  const employeeName = useMemo(() => {
    const initial = params.lastName?.[0];
    return initial ? `${initial}.${params.firstName ?? ''}` : params.firstName ?? '';
  }, [params.firstName, params.lastName]);

  const [data, setData] = useState<AnnualLeaveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmSplit, setConfirmSplit] = useState<AnnualLeaveSplit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showError = useCallback(
    (msg: string) => {
      toast.show({
        component: (props) => (
          <AppToast
            {...props}
            variant="danger"
            description={msg}
            icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
          />
        ),
      });
    },
    [toast],
  );

  const showSuccess = useCallback(
    (msg: string) => {
      toast.show({
        component: (props) => (
          <AppToast
            {...props}
            variant="success"
            description={msg}
            icon={<AppIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
          />
        ),
      });
    },
    [toast],
  );

  const fetchData = useCallback(async () => {
    try {
      const res = await api<AnnualLeaveData>({
        path: `/senior/annual-leaves/${params.id}`,
        method: 'GET',
      });
      if (res.status === 200 && Array.isArray(res.data?.splits)) {
        setData(res.data);
      } else {
        showError(res.message || 'Алдаа гарлаа');
      }
    } catch (e) {
      console.error(e);
    }
  }, [params.id, showError]);

  useFocusEffect(
    useCallback(() => {
      fetchData().finally(() => setIsLoading(false));
    }, [fetchData]),
  );

  const handleSaved = () => {
    setAddOpen(false);
    fetchData();
  };

  const handleConfirmDelete = async () => {
    if (!confirmSplit) return;
    setIsDeleting(true);
    try {
      const res = await api({
        path: `/senior/annual-leaves/${params.id}/splits/${confirmSplit.id}`,
        method: 'DELETE',
      });
      if (res.status === 200) {
        setConfirmSplit(null);
        showSuccess(res.message);
        await fetchData();
      } else {
        setConfirmSplit(null);
        showError(res.message || 'Алдаа гарлаа');
      }
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasCycle = !!data?.cycle_start_date && !!data?.cycle_end_date;
  const reachedSplitLimit = !!data && data.splits.length >= data.max_splits;
  const canPlan = hasCycle && !reachedSplitLimit && (data?.remaining_days ?? 0) > 0;

  return (
    <View className="flex-1 bg-lightblue">
      <StyledSafeAreaView className="flex-1" edges={['top']}>
        <AppHeader
          backTitle="Буцах"
          backTitleClassName="text-sm font-medium text-darkblue"
          className="px-4"
          showBack
          backIcon={<AppIcon icon={ArrowLeft02Icon} color="#606884" size={24} />}
        />
        <View className="px-4 pb-7.5 gap-5">
          <AppText className="text-base font-semibold text-darkerblue" numberOfLines={1}>
            Ээлжийн амралт төлөвлөх
          </AppText>
          {data && (
            <View className="gap-2.5">
              <View className="flex-row gap-2">
                <AppText className="text-sm text-darkblue w-[180px]">Ажилтан</AppText>
                <AppText className="text-sm font-medium text-darkerblue flex-1" numberOfLines={1}>
                  {employeeName}
                </AppText>
              </View>
              {hasCycle && (
                <View className="flex-row gap-2">
                  <AppText className="text-sm text-darkblue w-[180px]">Э/амралтын цикл</AppText>
                  <AppText className="text-sm font-medium text-darkerblue flex-1" numberOfLines={1}>
                    {dayjs(data.cycle_start_date, 'YYYY-MM-DD').format('YY/MM/DD')} -{' '}
                    {dayjs(data.cycle_end_date, 'YYYY-MM-DD').format('YY/MM/DD')}
                  </AppText>
                </View>
              )}
              <View className="flex-row gap-2">
                <AppText className="text-sm text-darkblue w-[180px]">Хувааж авах боломж</AppText>
                <AppText className="text-sm font-medium text-darkerblue flex-1" numberOfLines={1}>
                  {data.max_splits} удаа
                </AppText>
              </View>
              <View className="flex-row gap-2">
                <AppText className="text-sm text-darkblue w-[180px]">Боломжит хоног</AppText>
                <AppText className="text-sm font-medium text-darkerblue flex-1" numberOfLines={1}>
                  {data.available_days} хоног
                </AppText>
              </View>
              <View className="flex-row gap-2">
                <AppText className="text-sm text-darkblue w-[180px]">Үлдэгдэл хоног</AppText>
                <AppText className="text-sm font-medium text-darkerblue flex-1" numberOfLines={1}>
                  {data.remaining_days} хоног
                </AppText>
              </View>
            </View>
          )}
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 16, backgroundColor: '#ffffff' }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-5 pb-10 pt-7.5">
            {isLoading ? (
              <View className="items-center py-10">
                <Spinner color="#005FEE" size="sm" />
              </View>
            ) : !hasCycle ? (
              <AppText className="text-sm text-darkgray text-center">
                Боломжит ээлжийн амралт байхгүй байна
              </AppText>
            ) : !data?.splits.length ? (
              <AppText className="text-sm text-darkgray text-center">
                Ээлжийн амралтын хуваарь байхгүй байна
              </AppText>
            ) : (
              data.splits.map((split, index) => {
                // Төлөвлөсөн э/амралтыг өөр хооронд нь #1, #2 гэж дугаарлаад ард нь
                // харуулна. Биеэр эдлээгүй хоногийн олговорт дугаар харуулахгүй.
                const scheduledNo =
                  split.type === 'scheduled'
                    ? data.splits.slice(0, index + 1).filter((s) => s.type === 'scheduled').length
                    : 0;
                return (
                <View key={split.id} className="gap-2.5">
                  <AppText className="text-sm text-darkgray">
                    {SPLIT_TYPE_LABELS[split.type]}
                    {scheduledNo > 0 ? ` #${scheduledNo}` : ''}
                  </AppText>
                  <View className="flex-row gap-3 items-center">
                    <View className="flex-1 flex-row items-center gap-2 border border-gray/30 rounded-lg h-11 px-2.5">
                      <AppIcon icon={Calendar03Icon} color="#222222" size={24} />
                      <AppText
                        className={`text-base flex-1 ${split.type === 'unused' ? 'opacity-70' : ''}`}
                        numberOfLines={1}
                      >
                        {split.type === 'unused'
                          ? `${split.days} хоног`
                          : formatSplitRange(split.start_date, split.end_date)}
                      </AppText>
                    </View>
                    <Pressable
                      onPress={() => setConfirmSplit(split)}
                      disabled={split.decree_id != null}
                      className="w-11 h-11 items-center justify-center border border-gray/30 rounded-lg"
                    >
                      {split.decree_id != null ? (
                        <AppIcon icon={SquareLock02Icon} color="#6A6A6A" size={22} />
                      ) : (
                        <AppIcon icon={MultiplicationSignIcon} color="#EF444480" size={24} />
                      )}
                    </Pressable>
                  </View>
                </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <View className="px-4 bg-background pt-2.5" style={{ paddingBottom: insets.bottom + 10 }}>
          <AppButton
            label="Нэмэх"
            onPress={() => setAddOpen(true)}
            isDisabled={isLoading || !canPlan}
            className="bg-white border-darkblue/15 rounded-full"
            labelClassName="text-emerald text-base font-semibold"
          />
        </View>
      </StyledSafeAreaView>

      {data && (
        <AddSheet
          isOpen={addOpen}
          onOpenChange={setAddOpen}
          data={data}
          employeeId={params.id}
          onSaved={handleSaved}
          showError={showError}
          showSuccess={showSuccess}
        />
      )}

      <AppDialog
        isOpen={confirmSplit != null}
        onOpenChange={(open) => {
          if (!open) setConfirmSplit(null);
        }}
      >
        <View className="mb-5 gap-1.5">
          <AppDialog.Title>Хуваарь устгах</AppDialog.Title>
          <AppDialog.Description>
            {confirmSplit?.type === 'unused'
              ? `Биеэр эдлээгүй ${confirmSplit.days} хоногийн олговрыг устгахдаа итгэлтэй байна уу?`
              : `"${formatSplitRange(confirmSplit?.start_date ?? null, confirmSplit?.end_date ?? null)}" төлөвлөсөн ээлжийн амралтыг устгахдаа итгэлтэй байна уу?`}
          </AppDialog.Description>
        </View>
        <View className="flex-row gap-3">
          <AppDialog.Button
            label="Үгүй"
            className="flex-1"
            onPress={() => setConfirmSplit(null)}
          />
          <AppDialog.Button
            label="Тийм"
            className="flex-1"
            isLoading={isDeleting}
            onPress={handleConfirmDelete}
          />
        </View>
      </AppDialog>
    </View>
  );
}
