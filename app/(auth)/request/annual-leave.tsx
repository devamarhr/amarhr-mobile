import { AppButton } from '@/components/app-button';
import { AppDatePicker } from '@/components/app-date-picker';
import { AppHeader } from '@/components/app-header';
import { AppSelect } from '@/components/app-select';
import { AppText } from '@/components/app-text';
import { AppTextField } from '@/components/app-text-field';
import { AppToast } from '@/components/app-toast';
import { api, uploadFile } from '@/config/api';
import {
  Alert01Icon,
  ArrowLeft02Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  FileAttachmentIcon,
  MultiplicationSignIcon,
  PlusSignIcon,
} from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { pickAttachments, type PickedAsset } from '@/utils/pick-attachment';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Spinner, useToast } from 'heroui-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Control,
  Controller,
  FieldErrors,
  UseFormSetValue,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface Availability {
  start_date: string;
  end_date: string;
  available_days: number;
}

async function calculateEndDate(startDate: string, days: number): Promise<string> {
  const res = await api<{ end_date: string }>({
    path: '/employee-request/calculate-end-date',
    method: 'POST',
    data: { start_date: startDate, days },
  });
  return res.data.end_date;
}

interface AnnualLeaveSplit {
  id: number;
  start_date: string;
  end_date: string;
  days: number;
}

interface Split {
  splitId?: number;
  startDate?: string;
  days?: string;
  endDate?: string;
}

interface AnnualLeaveForm {
  splits: Split[];
  description: string;
}

interface SplitRowProps {
  index: number;
  control: Control<AnnualLeaveForm>;
  setValue: UseFormSetValue<AnnualLeaveForm>;
  errors: FieldErrors<AnnualLeaveForm>;
  availability: Availability;
  maxDays: number;
  onRemove: () => void;
}

function SplitRow({
  index,
  control,
  setValue,
  errors,
  availability,
  maxDays,
  onRemove,
}: SplitRowProps) {
  const startDate = useWatch({ control, name: `splits.${index}.startDate` });
  const days = useWatch({ control, name: `splits.${index}.days` });
  const endDate = useWatch({ control, name: `splits.${index}.endDate` });
  const allSplits = useWatch({ control, name: 'splits' }) ?? [];

  const hasOverlap = useMemo(() => {
    if (!startDate || !endDate) return false;
    const s = dayjs(startDate, 'YYYY-MM-DD');
    const e = dayjs(endDate, 'YYYY-MM-DD');
    return allSplits.some((p, i) => {
      if (i === index || !p?.startDate || !p?.endDate) return false;
      const ps = dayjs(p.startDate, 'YYYY-MM-DD');
      const pe = dayjs(p.endDate, 'YYYY-MM-DD');
      return !s.isAfter(pe) && !ps.isAfter(e);
    });
  }, [startDate, endDate, allSplits, index]);

  useEffect(() => {
    let cancelled = false;
    if (startDate && days) {
      calculateEndDate(startDate, Number(days)).then((end) => {
        if (!cancelled) setValue(`splits.${index}.endDate`, end);
      });
    } else {
      setValue(`splits.${index}.endDate`, '');
    }
    return () => {
      cancelled = true;
    };
  }, [startDate, days, index, setValue]);

  const dayOptions = useMemo(() => {
    const cap = Math.max(maxDays, days ? Number(days) : 1);
    return Array.from({ length: cap }, (_, i) => ({ value: String(i + 1), label: `${i + 1} хоног` }));
  }, [maxDays, days]);

  const minDate = useMemo(
    () => dayjs(availability.start_date, 'YYYY-MM-DD').toDate(),
    [availability.start_date],
  );
  const maxDate = useMemo(
    () => dayjs(availability.end_date, 'YYYY-MM-DD').toDate(),
    [availability.end_date],
  );

  const rowErrors = errors?.splits?.[index];

  return (
    <View className="gap-1">
      <View className="flex-row gap-2 items-end">
        <View className="flex-1">
          <Controller
            control={control}
            name={`splits.${index}.startDate`}
            rules={{ required: 'Эхлэх өдөр сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Эхлэх"
                mode="date"
                value={value ? dayjs(value, 'YYYY-MM-DD').toDate() : undefined}
                onValueChange={(date) => onChange(dayjs(date).format('YYYY-MM-DD'))}
                placeholder="00/00"
                format="MM/DD"
                minimumDate={minDate}
                maximumDate={maxDate}
                icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
                isInvalid={!!rowErrors?.startDate || hasOverlap}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name={`splits.${index}.days`}
            rules={{ required: 'Хоног сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppSelect
                label="Хоног"
                options={dayOptions}
                value={dayOptions.find((o) => o.value === value)}
                onValueChange={(opt) => onChange(opt?.value ?? '')}
                placeholder="Сонгох"
                isInvalid={!!rowErrors?.days || hasOverlap}
              />
            )}
          />
        </View>
        <View className="gap-2">
          <AppText className="text-sm font-normal text-darkgray text-center">Дуусах</AppText>
          <View className="h-11 justify-center items-center">
            <AppText className={`text-sm ${endDate ? '' : 'text-muted'}`}>
              {endDate ? dayjs(endDate, 'YYYY-MM-DD').format('MM/DD') : '--/--'}
            </AppText>
          </View>
        </View>
        <Pressable
          onPress={onRemove}
          className="w-7 h-11 items-center justify-center"
        >
          <HugeiconsIcon icon={MultiplicationSignIcon} color="#EF4444" size={16} />
        </Pressable>
      </View>
      {hasOverlap && (
        <AppText className="text-xs text-red">Өдөр давхцаж байна</AppText>
      )}
    </View>
  );
}

export default function AnnualLeaveRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    maxDays?: string;
    availableStartDate?: string;
    availableEndDate?: string;
    maxLeaveSplits?: string;
    annualLeaveSplits?: string;
  }>();
  const { toast } = useToast();
  const title = params.title ?? '';

  const availability = useMemo<Availability | null>(() => {
    if (!params.maxDays || !params.availableStartDate || !params.availableEndDate) return null;
    return {
      start_date: params.availableStartDate,
      end_date: params.availableEndDate,
      available_days: Number(params.maxDays),
    };
  }, [params.maxDays, params.availableStartDate, params.availableEndDate]);

  const maxLeaveSplits = params.maxLeaveSplits ? Number(params.maxLeaveSplits) : undefined;

  const initialSplits = useMemo<Split[]>(() => {
    const empty: Split[] = [{ startDate: '', days: '', endDate: '' }];
    if (!params.annualLeaveSplits) return empty;
    try {
      const splits = JSON.parse(params.annualLeaveSplits) as AnnualLeaveSplit[];
      if (!splits.length) return empty;
      return splits.map((s) => ({
        splitId: s.id,
        startDate: s.start_date,
        days: String(s.days),
        endDate: s.end_date,
      }));
    } catch {
      return empty;
    }
  }, [params.annualLeaveSplits]);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; path: string }[]>([]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AnnualLeaveForm>({
    defaultValues: {
      splits: initialSplits,
      description: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'splits' });

  const splitsWatch = useWatch({ control, name: 'splits' }) ?? [];
  const usedDays = splitsWatch.reduce((sum, p) => sum + (Number(p?.days) || 0), 0);
  const remainingDays = (availability?.available_days ?? 0) - usedDays;

  const uploadAssets = async (assets: PickedAsset[]) => {
    if (!assets.length) return;
    setIsUploading(true);
    for (const asset of assets) {
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
  };

  const handlePickAttachments = async () => {
    const assets = await pickAttachments();
    await uploadAssets(assets);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const showError = (msg: string) => {
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
  };

  const handleSend = async (data: AnnualLeaveForm) => {
    if (!availability) return;

    if (data.splits.some((p) => !p.endDate)) {
      showError('Дуусах өдөр тооцоологдож дуусаагүй байна');
      return;
    }

    if (maxLeaveSplits != null && data.splits.length > maxLeaveSplits) {
      showError(`Ээлжийн амралтыг хамгийн ихдээ ${maxLeaveSplits} удаа хувааж болно`);
      return;
    }

    const totalDays = data.splits.reduce((sum, p) => sum + (Number(p.days) || 0), 0);
    if (totalDays > availability.available_days) {
      showError(`Сонгосон хоног боломжит ${availability.available_days} хоногоос хэтэрсэн байна`);
      return;
    }

    const sorted = [...data.splits].sort((a, b) =>
      dayjs(a.startDate, 'YYYY-MM-DD').diff(dayjs(b.startDate, 'YYYY-MM-DD')),
    );
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = dayjs(sorted[i - 1].endDate, 'YYYY-MM-DD');
      const curStart = dayjs(sorted[i].startDate, 'YYYY-MM-DD');
      if (!curStart.isAfter(prevEnd)) {
        showError('Өдөр давхцаж байна');
        return;
      }
    }

    const minDate = dayjs(availability.start_date, 'YYYY-MM-DD');
    const maxDate = dayjs(availability.end_date, 'YYYY-MM-DD');
    for (const p of data.splits) {
      const s = dayjs(p.startDate, 'YYYY-MM-DD');
      const e = dayjs(p.endDate, 'YYYY-MM-DD');
      if (s.isBefore(minDate) || e.isAfter(maxDate)) {
        showError('Боломжит хугацааны гадна сонголт байна');
        return;
      }
    }

    setIsLoading(true);
    try {
      const body = {
        detail: {
          splits: data.splits.map((p) => ({
            ...(p.splitId != null && { id: p.splitId }),
            start_date: p.startDate,
            days: Number(p.days),
            end_date: p.endDate,
          })),
          description: data.description,
        },
        employee_request_setting_id: params.id,
        attachments,
      };
      console.log(body);
      const res = await api({
        path: '/employee-request',
        method: 'POST',
        data: body,
      });
      if (res.status === 200) {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="success"
              description={res.message}
              icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
            />
          ),
        });
        router.back();
      } else {
        showError(res.message);
      }
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
            {title}
          </AppText>
          {availability && (
            <View className="gap-2.5">
              <View className="flex-row gap-2">
                <AppText className="text-sm text-darkblue w-48">Боломжит хоног</AppText>
                <AppText className="text-sm font-medium text-darkerblue">
                  {availability.available_days} хоног
                </AppText>
              </View>
              <View className="flex-row gap-2">
                <AppText className="text-sm text-darkblue w-48">Сонгох боломжит</AppText>
                <AppText className="text-sm font-medium text-darkerblue">
                  {dayjs(availability.start_date, 'YYYY-MM-DD').format('YY/MM/DD')} -{' '}
                  {dayjs(availability.end_date, 'YYYY-MM-DD').format('YY/MM/DD')}
                </AppText>
              </View>
              <View className="flex-row gap-2">
                <AppText className="text-sm text-darkblue w-48">Үлдсэн</AppText>
                <AppText className="text-sm font-medium text-darkerblue">
                  {Math.max(0, remainingDays)} хоног
                </AppText>
              </View>
              {maxLeaveSplits != null && (
                <View className="flex-row gap-2">
                  <AppText className="text-sm text-darkblue w-48">Хуваах боломжит</AppText>
                  <AppText className="text-sm font-medium text-darkerblue">
                    {maxLeaveSplits} удаа
                  </AppText>
                </View>
              )}
            </View>
          )}
        </View>

        <KeyboardAwareScrollView
          style={{ flex: 1, paddingHorizontal: 16, backgroundColor: '#ffffff' }}
          showsVerticalScrollIndicator={false}
          bottomOffset={20}
        >
          <View className="gap-6 pb-10 pt-7.5">
            {!availability ? (
              <AppText className="text-sm text-darkgray text-center">
                Танд боломжит ээлжийн амралт байхгүй байна
              </AppText>
            ) : (
              <>
                {fields.map((field, index) => {
                  const otherDays = splitsWatch.reduce(
                    (sum, p, i) => (i === index ? sum : sum + (Number(p?.days) || 0)),
                    0,
                  );
                  const rowMax = Math.max(1, availability.available_days - otherDays);
                  return (
                    <SplitRow
                      key={field.id}
                      index={index}
                      control={control}
                      setValue={setValue}
                      errors={errors}
                      availability={availability}
                      maxDays={rowMax}
                      onRemove={() => {
                        if (fields.length > 1) {
                          remove(index);
                        } else {
                          setValue(`splits.${index}.splitId`, undefined);
                          setValue(`splits.${index}.startDate`, '');
                          setValue(`splits.${index}.days`, '');
                          setValue(`splits.${index}.endDate`, '');
                        }
                      }}
                    />
                  );
                })}

                {(() => {
                  const reachedSplitLimit =
                    maxLeaveSplits != null && fields.length >= maxLeaveSplits;
                  const addDisabled = remainingDays <= 0 || reachedSplitLimit;
                  return (
                    <Pressable
                      onPress={() => append({ startDate: '', days: '', endDate: '' })}
                      disabled={addDisabled}
                      className="flex-row items-center justify-center gap-2 h-11 rounded-full border border-darkgray/30 disabled:opacity-50"
                    >
                      <HugeiconsIcon
                        icon={PlusSignIcon}
                        color={addDisabled ? '#9CA3AF' : '#222222'}
                        size={20}
                      />
                      <AppText
                        className={`text-sm font-medium ${
                          addDisabled ? 'text-darkgray/50' : 'text-black'
                        }`}
                      >
                        {reachedSplitLimit ? `Дээд хязгаар ${maxLeaveSplits} удаа` : 'Нэмэх'}
                      </AppText>
                    </Pressable>
                  );
                })()}

                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AppTextField
                      label="Тайлбар"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      isTextArea
                      className="h-22"
                      placeholder="Тайлбараа энд бичнэ үү"
                    />
                  )}
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
                    {isUploading ? 'Хуулж байна...' : 'Файл хавсаргах'}
                  </AppText>
                </Pressable>
              </>
            )}

            {attachments.map((file, index) => (
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
        </KeyboardAwareScrollView>

        {availability && (
          <View className="px-4 bg-background" style={{ paddingBottom: insets.bottom + 10 }}>
            <AppButton
              label="Илгээх"
              onPress={handleSubmit(handleSend)}
              isDisabled={isUploading}
              isLoading={isLoading}
              className="bg-lightblue border-darkblue/15"
              labelClassName="text-darkerblue text-base font-medium"
            />
          </View>
        )}
      </StyledSafeAreaView>
    </View>
  );
}
