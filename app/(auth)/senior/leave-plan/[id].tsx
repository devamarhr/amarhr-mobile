import { AppButton } from '@/components/app-button';
import { AppDatePicker } from '@/components/app-date-picker';
import { AppHeader } from '@/components/app-header';
import { AppSelect } from '@/components/app-select';
import { AppText } from '@/components/app-text';
import { AppToast } from '@/components/app-toast';
import { api } from '@/config/api';
import {
  Alert01Icon,
  ArrowLeft02Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  SquareLock02Icon,
} from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import dayjs from 'dayjs';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BottomSheet, Spinner, useToast } from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
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
  scheduled: 'Хуваарийн дагуух э/амралт',
  advance: 'Урьдчилж авсан э/амралт',
  unused: 'Биеэр эдлээгүй хоногийн олговор',
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
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStartDate('');
      setDays('');
      setEndDate('');
      setIsSaving(false);
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
      showError('Эхлэх өдөр, хоногоо сонгоно уу');
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
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      {/* disableFullWindowOverlay: native date-picker modal үндсэн window-д
          гардаг тул sheet-ийг мөн үндсэн window-д render хийнэ */}
      <BottomSheet.Portal disableFullWindowOverlay>
        <BottomSheet.Overlay className="bg-[#6C719F]/40" />
        <BottomSheet.Content enableOverDrag={false} handleComponent={null}>
          <BottomSheet.Title className="text-center text-lg font-medium text-black pt-3 mb-6">
            Ээлжийн амралт нэмэх
          </BottomSheet.Title>
          <View className="gap-5" style={{ paddingBottom: insets.bottom + 12 }}>
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
                  icon={<HugeiconsIcon icon={Calendar03Icon} color="#222" size={22} />}
                />
              </View>
              <View className="flex-1">
                <AppSelect
                  label="Амрах хоног"
                  options={dayOptions}
                  value={dayOptions.find((o) => o.value === days)}
                  onValueChange={(opt) => setDays(opt?.value ?? '')}
                  placeholder="Сонгох"
                  renderValue={(option) => <AppText className="text-base">{option.value}</AppText>}
                />
              </View>
              <View className="flex-1 gap-2">
                <AppText className="text-sm text-darkgray">Дуусах өдөр</AppText>
                <View className="flex-row items-center gap-1.5 bg-[#F2F2F2] rounded-lg h-11 px-2.5">
                  <HugeiconsIcon icon={Calendar03Icon} color="#6A6A6A" size={22} />
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
              className="bg-blue border-0 rounded-full"
              labelClassName="text-white text-base font-semibold"
            />
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
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

  const showError = useCallback(
    (msg: string) => {
      toast.show({
        component: (props) => (
          <AppToast
            {...props}
            variant="danger"
            description={msg}
            icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
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
            icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
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
          backIcon={<HugeiconsIcon icon={ArrowLeft02Icon} color="#606884" size={24} />}
        />
        <View className="px-4 pb-7.5 gap-5">
          <AppText className="text-base font-medium text-darkerblue" numberOfLines={1}>
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
              data.splits.map((split, index) => (
                <View key={split.id} className="gap-2.5">
                  <AppText className="text-sm text-darkgray">
                    #{index + 1} {SPLIT_TYPE_LABELS[split.type]}
                  </AppText>
                  <View className="flex-row items-center gap-2 border border-gray/30 rounded-lg h-11 px-2.5">
                    <HugeiconsIcon icon={Calendar03Icon} color="#222222" size={24} />
                    <AppText
                      className={`text-base flex-1 ${split.type === 'unused' ? 'opacity-70' : ''}`}
                      numberOfLines={1}
                    >
                      {split.type === 'unused'
                        ? `${split.days} хоног`
                        : formatSplitRange(split.start_date, split.end_date)}
                    </AppText>
                    {split.decree_id != null && (
                      <HugeiconsIcon icon={SquareLock02Icon} color="#6A6A6A" size={20} />
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View className="px-4 bg-background pt-2.5" style={{ paddingBottom: insets.bottom + 10 }}>
          <AppButton
            label="Нэмэх"
            onPress={() => setAddOpen(true)}
            isDisabled={isLoading || !canPlan}
            className="bg-white border-darkblue/15 rounded-full"
            labelClassName="text-[#008E47] text-base font-semibold"
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
    </View>
  );
}
