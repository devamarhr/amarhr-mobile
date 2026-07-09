import { AppButton } from '@/components/app-button';
import { AppDatePicker } from '@/components/app-date-picker';
import { AppDialog } from '@/components/app-dialog';
import { AppHeader } from '@/components/app-header';
import { AppSelect } from '@/components/app-select';
import { AppText } from '@/components/app-text';
import { AppTextField } from '@/components/app-text-field';
import { AppToast } from '@/components/app-toast';
import { RequestHeaderInfo } from '@/components/request-header-info';
import { api, uploadFile } from '@/config/api';
import { pickAttachments } from '@/utils/pick-attachment';
import {
  Alert01Icon,
  ArrowLeft02Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  FileAttachmentIcon,
  MultiplicationSignIcon,
  SquareLock02Icon,
} from '@hugeicons-pro/core-stroke-standard';
import { AppIcon } from "@/components/app-icon";
import dayjs from 'dayjs';
import { useFocusEffect } from 'expo-router';
import {
  BottomSheet,
  Spinner,
  useBottomSheetAwareHandlers,
  useToast,
} from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

const MAX_ATTACHMENTS = 3;

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

interface Attachment {
  name: string;
  path: string;
}

const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  scheduled: 'Хуваарийн дагуух э/амралт',
  advance: 'Урьдчилж авсан э/амралт',
  unused: 'Биеэр эдлээгүй хоногийн олговор',
};

const SALARY_PERIOD_OPTIONS = [
  { value: 'advance', label: 'Урьдчилгаа цалин дээр' },
  { value: 'payroll', label: 'Сүүл цалин дээр' },
];

// Одоогийн сараас хойш 2 сар хүртэл сонгох боломжтой; value нь 'YYYY-M'
// хэлбэртэй тул оны зааг давахад year-ийг зөв илгээнэ
function buildMonthOptions() {
  return Array.from({ length: 3 }, (_, i) => {
    const d = dayjs().add(i, 'month');
    return { value: d.format('YYYY-M'), label: `${d.month() + 1}-р сар` };
  });
}

function formatRange(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  return `${dayjs(start, 'YYYY-MM-DD').format('YYYY/MM/DD')} - ${dayjs(end, 'YYYY-MM-DD').format('YYYY/MM/DD')}`;
}

async function calculateEndDate(startDate: string, days: number): Promise<string> {
  const res = await api<{ end_date: string }>({
    path: '/employee-request/calculate-end-date',
    method: 'POST',
    data: { start_date: startDate, days },
  });
  return res.data.end_date;
}

function useAttachments(showError: (msg: string) => void, notifyLimit: () => void) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const pick = async () => {
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      notifyLimit();
      return;
    }
    const assets = await pickAttachments(remaining);
    if (!assets.length) return;
    setIsUploading(true);
    for (const asset of assets.slice(0, remaining)) {
      try {
        const res = await uploadFile<{ path: string }>('/file-upload', asset.uri);
        if (res.status === 200) {
          setAttachments((prev) => [...prev, { name: asset.name, path: res.data.path }]);
        } else {
          showError(res.message || 'Алдаа гарлаа');
        }
      } catch (e) {
        console.error('Upload failed:', e);
      }
    }
    setIsUploading(false);
    if (assets.length > remaining) notifyLimit();
  };

  const remove = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = useCallback(() => {
    setAttachments([]);
    setIsUploading(false);
  }, []);

  return { attachments, isUploading, pick, remove, reset };
}

interface AttachmentSectionProps {
  attachments: Attachment[];
  isUploading: boolean;
  onPick: () => void;
  onRemove: (index: number) => void;
}

function AttachmentSection({ attachments, isUploading, onPick, onRemove }: AttachmentSectionProps) {
  return (
    <>
      {/* -mt-[5px] trims the parent gap-5 (20px) to the 15px the request screens use above "Файл хавсаргах". */}
      <Pressable
        className={`-mt-[5px] flex-row items-center justify-end gap-2 ${attachments.length >= MAX_ATTACHMENTS ? 'opacity-40' : ''}`}
        onPress={onPick}
        disabled={isUploading || attachments.length >= MAX_ATTACHMENTS}
      >
        {isUploading ? (
          <Spinner color="#005FEE" size="sm" />
        ) : (
          <AppIcon icon={FileAttachmentIcon} color="#6A6A6A" size={24} />
        )}
        <AppText className="text-base text-darkgray">
          {isUploading ? 'Хуулж байна...' : 'Файл хавсаргах'}
        </AppText>
      </Pressable>
      {attachments.map((file, index) => (
        <View key={index} className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3">
            <AppIcon icon={FileAttachmentIcon} color="#222222" size={24} />
            <AppText className="text-sm flex-1" numberOfLines={1}>
              {file.name}
            </AppText>
          </View>
          <Pressable
            onPress={() => onRemove(index)}
            className="w-12 h-12 items-center justify-center border border-gray/20 rounded-xl"
          >
            <AppIcon icon={MultiplicationSignIcon} color="#EF444480" size={24} />
          </Pressable>
        </View>
      ))}
    </>
  );
}

function SheetDescriptionField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  return (
    <AppTextField
      label="Шалтгаан"
      value={value}
      onChangeText={onChangeText}
      onFocus={onFocus}
      onBlur={onBlur}
      isTextArea
      className="h-25"
      placeholder="Шалтгаанаа энд бичнэ үү"
    />
  );
}

interface TypeSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: AnnualLeaveData;
  onSelect: (type: 'scheduled' | 'unused') => void;
}

function TypeSheet({ isOpen, onOpenChange, data, onSelect }: TypeSheetProps) {
  const insets = useSafeAreaInsets();
  const cycleRange =
    data.cycle_start_date && data.cycle_end_date
      ? `${dayjs(data.cycle_start_date, 'YYYY-MM-DD').format('YY/MM/DD')} - ${dayjs(data.cycle_end_date, 'YYYY-MM-DD').format('YY/MM/DD')}`
      : '';

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay className="bg-[#6C719F]/40" />
        <BottomSheet.Content enableOverDrag={false} handleComponent={null} backgroundClassName="rounded-t-[10px]">
          <BottomSheet.Title className="text-center text-lg font-medium text-black pb-5">
            Ээлжийн амралт нэмэх
          </BottomSheet.Title>
          <View style={{ paddingBottom: insets.bottom + 12 }}>
            <Pressable
              onPress={() => onSelect('scheduled')}
              className="flex-row items-center justify-between h-12.5 border-b border-darkgray/15"
            >
              <AppText className="text-base">Хуваарийн дагуу</AppText>
              <AppText className="text-sm text-darkgray">{cycleRange}</AppText>
            </Pressable>
            <Pressable
              onPress={() => onSelect('unused')}
              className="flex-row items-center justify-between h-12.5 border-b border-darkgray/15"
            >
              <AppText className="text-base">Биеэр эдлээгүй хоног</AppText>
              <AppText className="text-sm text-darkgray">{data.remaining_days} хоног</AppText>
            </Pressable>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

interface FormSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: AnnualLeaveData;
  onSaved: () => void;
  showError: (msg: string) => void;
  showSuccess: (msg: string) => void;
  notifyAttachmentLimit: () => void;
}

function ScheduledSheet({
  isOpen,
  onOpenChange,
  data,
  onSaved,
  showError,
  showSuccess,
  notifyAttachmentLimit,
}: FormSheetProps) {
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { attachments, isUploading, pick, remove, reset } = useAttachments(
    showError,
    notifyAttachmentLimit,
  );

  useEffect(() => {
    if (isOpen) {
      setStartDate('');
      setDays('');
      setEndDate('');
      setDescription('');
      setIsSaving(false);
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    let cancelled = false;
    if (startDate && days) {
      calculateEndDate(startDate, Number(days))
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
  }, [startDate, days]);

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
    if (!description.trim()) {
      showError('Шалтгаанаа бичнэ үү');
      return;
    }
    setIsSaving(true);
    try {
      const res = await api({
        path: '/employee-request/annual-leave-splits',
        method: 'POST',
        data: {
          type: 'scheduled',
          start_date: startDate,
          days: Number(days),
          description,
          attachments,
        },
      });
      if (res.status === 200) {
        showSuccess(res.message);
        onSaved();
      } else {
        showError(res.message || 'Алдаа гарлаа');
      }
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      {/* disableFullWindowOverlay: native date-picker modal болон attachment dialog
          нь үндсэн window-д гардаг тул sheet-ийг мөн үндсэн window-д render хийнэ */}
      <BottomSheet.Portal disableFullWindowOverlay>
        <BottomSheet.Overlay className="bg-[#6C719F]/40" />
        <BottomSheet.Content enableOverDrag={false} handleComponent={null} backgroundClassName="rounded-t-[10px]">
          <BottomSheet.Title className="text-center text-lg font-medium text-black pb-5">
            Хуваарийн дагуу
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
                  renderValue={(option) => <AppText className="text-sm">{option.value}</AppText>}
                />
              </View>
              <View className="flex-1 gap-2">
                <AppText className="text-sm text-darkgray">Дуусах өдөр</AppText>
                <View className="flex-row items-center gap-1.5 bg-[#F2F2F2] rounded-lg h-11 px-2.5">
                  <AppIcon icon={Calendar03Icon} color="#6A6A6A" size={22} />
                  <AppText className="text-sm text-darkgray flex-1" numberOfLines={1}>
                    {endDate ? dayjs(endDate, 'YYYY-MM-DD').format('MM/DD') : '00/00'}
                  </AppText>
                </View>
              </View>
            </View>

            <SheetDescriptionField value={description} onChangeText={setDescription} />

            <AttachmentSection
              attachments={attachments}
              isUploading={isUploading}
              onPick={pick}
              onRemove={remove}
            />

            <AppButton
              label="Хадгалах"
              onPress={handleSave}
              isLoading={isSaving}
              isDisabled={isUploading}
              spinnerColor="#ffffff"
              className="mt-[10px] bg-blue border-0 rounded-full"
              labelClassName="text-white text-base font-semibold"
            />
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

function UnusedSheet({
  isOpen,
  onOpenChange,
  data,
  onSaved,
  showError,
  showSuccess,
  notifyAttachmentLimit,
}: FormSheetProps) {
  const insets = useSafeAreaInsets();
  const monthOptions = useMemo(buildMonthOptions, []);
  const [month, setMonth] = useState('');
  const [days, setDays] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { attachments, isUploading, pick, remove, reset } = useAttachments(
    showError,
    notifyAttachmentLimit,
  );

  useEffect(() => {
    if (isOpen) {
      setMonth(monthOptions[0].value);
      setDays('');
      setSalaryPeriod('');
      setDescription('');
      setIsSaving(false);
      reset();
    }
  }, [isOpen, reset, monthOptions]);

  const dayOptions = useMemo(
    () =>
      Array.from({ length: Math.max(1, data.remaining_days) }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1} хоног`,
      })),
    [data.remaining_days],
  );

  const handleSave = async () => {
    if (!month || !days || !salaryPeriod) {
      showError('Сар, хоног, цалингийн хуваарь сонгоно уу');
      return;
    }
    if (!description.trim()) {
      showError('Шалтгаанаа бичнэ үү');
      return;
    }
    setIsSaving(true);
    try {
      const [yearPart, monthPart] = month.split('-');
      const res = await api({
        path: '/employee-request/annual-leave-splits',
        method: 'POST',
        data: {
          type: 'unused',
          year: Number(yearPart),
          month: Number(monthPart),
          days: Number(days),
          salary_period: salaryPeriod,
          description,
          attachments,
        },
      });
      if (res.status === 200) {
        showSuccess(res.message);
        onSaved();
      } else {
        showError(res.message || 'Алдаа гарлаа');
      }
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal disableFullWindowOverlay>
        <BottomSheet.Overlay className="bg-[#6C719F]/40" />
        <BottomSheet.Content enableOverDrag={false} handleComponent={null} backgroundClassName="rounded-t-[10px]">
          <BottomSheet.Title className="text-center text-lg font-medium text-black pb-5">
            Биеэр эдлээгүй хоног
          </BottomSheet.Title>
          <View className="gap-5" style={{ paddingBottom: insets.bottom + 12 }}>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <AppSelect
                  label="Сар сонгох"
                  options={monthOptions}
                  value={monthOptions.find((o) => o.value === month)}
                  onValueChange={(opt) => setMonth(opt?.value ?? '')}
                  placeholder="Сонгох"
                  icon={<AppIcon icon={Calendar03Icon} color="#222" size={22} />}
                  renderValue={(option) => <AppText className="text-base">{option.label}</AppText>}
                />
              </View>
              <View className="flex-1">
                <AppSelect
                  label="Боломжит хоног"
                  options={dayOptions}
                  value={dayOptions.find((o) => o.value === days)}
                  onValueChange={(opt) => setDays(opt?.value ?? '')}
                  placeholder="Сонгох"
                  renderValue={(option) => <AppText className="text-base">{option.value}</AppText>}
                />
              </View>
            </View>

            <AppSelect
              label="Олговор авах цалингийн хуваарь"
              options={SALARY_PERIOD_OPTIONS}
              value={SALARY_PERIOD_OPTIONS.find((o) => o.value === salaryPeriod)}
              onValueChange={(opt) => setSalaryPeriod(opt?.value ?? '')}
              placeholder="Сонгох"
              renderValue={(option) => <AppText className="text-base">{option.label}</AppText>}
            />

            <SheetDescriptionField value={description} onChangeText={setDescription} />

            <AttachmentSection
              attachments={attachments}
              isUploading={isUploading}
              onPick={pick}
              onRemove={remove}
            />

            <AppButton
              label="Хадгалах"
              onPress={handleSave}
              isLoading={isSaving}
              isDisabled={isUploading}
              spinnerColor="#ffffff"
              className="mt-[10px] bg-blue border-0 rounded-full"
              labelClassName="text-white text-base font-semibold"
            />
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

export default function AnnualLeaveRequestScreen() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const title = 'Ээлжийн амралт';

  const [data, setData] = useState<AnnualLeaveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmSplit, setConfirmSplit] = useState<AnnualLeaveSplit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [unusedOpen, setUnusedOpen] = useState(false);

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

  const notifyAttachmentLimit = useCallback(() => {
    showError(`Нэг хүсэлтэд дээд тал нь ${MAX_ATTACHMENTS} хавсралт хавсаргах боломжтой`);
  }, [showError]);

  const fetchData = useCallback(async () => {
    try {
      const res = await api<AnnualLeaveData>({
        path: '/employee-request/annual-leave-splits',
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
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      fetchData().finally(() => setIsLoading(false));
    }, [fetchData]),
  );

  const handleConfirmDelete = async () => {
    if (!confirmSplit) return;
    setIsDeleting(true);
    try {
      const res = await api({
        path: `/employee-request/annual-leave-splits/${confirmSplit.id}`,
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

  const handleSelectType = (type: 'scheduled' | 'unused') => {
    setTypeSheetOpen(false);
    setTimeout(() => {
      if (type === 'scheduled') setScheduledOpen(true);
      else setUnusedOpen(true);
    }, 300);
  };

  const handleSaved = () => {
    Keyboard.dismiss();
    setScheduledOpen(false);
    setUnusedOpen(false);
    fetchData();
  };

  const hasCycle = !!data?.cycle_start_date && !!data?.cycle_end_date;
  const reachedSplitLimit = !!data && data.splits.length >= data.max_splits;

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
          <AppText className="text-base font-medium text-darkerblue" numberOfLines={1}>
            {title}
          </AppText>
          {data && (
            <RequestHeaderInfo
              rows={[
                ...(hasCycle
                  ? [{
                      label: 'Э/амралтын цикл',
                      value: `${dayjs(data.cycle_start_date, 'YYYY-MM-DD').format('YY/MM/DD')} - ${dayjs(data.cycle_end_date, 'YYYY-MM-DD').format('YY/MM/DD')}`,
                    }]
                  : []),
                { label: 'Боломжит хоног', value: `${data.available_days} хоног` },
                { label: 'Үлдэгдэл хоног', value: `${data.remaining_days} хоног` },
                { label: 'Хувааж авах боломж', value: `${data.max_splits} удаа` },
              ]}
            />
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
                Танд боломжит ээлжийн амралт байхгүй байна
              </AppText>
            ) : !data?.splits.length ? (
              <AppText className="text-sm text-darkgray text-center">
                Танд ээлжийн амралтын хуваарь байхгүй байна
              </AppText>
            ) : (
              data.splits.map((split, index) => (
                <View key={split.id} className="gap-2.5">
                  <AppText className="text-sm text-darkgray">
                    #{index + 1} {SPLIT_TYPE_LABELS[split.type]}
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
                          : formatRange(split.start_date, split.end_date)}
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
              ))
            )}
          </View>
        </ScrollView>

        <View className="px-4 bg-background pt-2.5" style={{ paddingBottom: insets.bottom + 10 }}>
          <AppButton
            label="Нэмэх"
            onPress={() => setTypeSheetOpen(true)}
            isDisabled={isLoading || !hasCycle || reachedSplitLimit}
            className="bg-white border-darkblue/15 rounded-full"
            labelClassName="text-[#008E47] text-base font-semibold"
          />
        </View>
      </StyledSafeAreaView>

      {data && (
        <>
          <TypeSheet
            isOpen={typeSheetOpen}
            onOpenChange={setTypeSheetOpen}
            data={data}
            onSelect={handleSelectType}
          />
          <ScheduledSheet
            isOpen={scheduledOpen}
            onOpenChange={(open) => {
              if (!open) Keyboard.dismiss();
              setScheduledOpen(open);
            }}
            data={data}
            onSaved={handleSaved}
            showError={showError}
            showSuccess={showSuccess}
            notifyAttachmentLimit={notifyAttachmentLimit}
          />
          <UnusedSheet
            isOpen={unusedOpen}
            onOpenChange={(open) => {
              if (!open) Keyboard.dismiss();
              setUnusedOpen(open);
            }}
            data={data}
            onSaved={handleSaved}
            showError={showError}
            showSuccess={showSuccess}
            notifyAttachmentLimit={notifyAttachmentLimit}
          />
        </>
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
              ? `Та "${confirmSplit.days} хоног" олговрын хуваарийг устгахдаа итгэлтэй байна уу?`
              : `Та "${formatRange(confirmSplit?.start_date ?? null, confirmSplit?.end_date ?? null)}" амралтын хуваарийг устгахдаа итгэлтэй байна уу?`}
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
