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
  MultiplicationSignIcon,
  PlusSignIcon,
} from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useToast } from 'heroui-native';
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

interface Split {
  startDate?: string;
  days?: string;
  endDate?: string;
}

interface PlanForm {
  splits: Split[];
}

interface SplitRowProps {
  index: number;
  control: Control<PlanForm>;
  setValue: UseFormSetValue<PlanForm>;
  errors: FieldErrors<PlanForm>;
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
        <Pressable onPress={onRemove} className="w-7 h-11 items-center justify-center">
          <HugeiconsIcon icon={MultiplicationSignIcon} color="#EF4444" size={16} />
        </Pressable>
      </View>
      {hasOverlap && <AppText className="text-xs text-red">Өдөр давхцаж байна</AppText>}
    </View>
  );
}

export default function SeniorLeavePlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    year?: string;
    firstName?: string;
    lastName?: string;
    totalDays?: string;
    startDate?: string;
    endDate?: string;
    profileImageUrl?: string;
  }>();
  const { toast } = useToast();

  const employeeName = useMemo(() => {
    const initial = params.lastName?.[0];
    return initial ? `${initial}.${params.firstName ?? ''}` : params.firstName ?? '';
  }, [params.firstName, params.lastName]);

  const availability = useMemo<Availability | null>(() => {
    if (!params.totalDays || !params.startDate || !params.endDate) return null;
    return {
      start_date: params.startDate,
      end_date: params.endDate,
      available_days: Number(params.totalDays),
    };
  }, [params.totalDays, params.startDate, params.endDate]);

  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PlanForm>({
    defaultValues: {
      splits: [{ startDate: '', days: '', endDate: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'splits' });

  const splitsWatch = useWatch({ control, name: 'splits' }) ?? [];
  const usedDays = splitsWatch.reduce((sum, p) => sum + (Number(p?.days) || 0), 0);
  const remainingDays = (availability?.available_days ?? 0) - usedDays;

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

  const handleSave = async (data: PlanForm) => {
    if (!availability) return;

    if (data.splits.some((p) => !p.endDate)) {
      showError('Дуусах өдөр тооцоологдож дуусаагүй байна');
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
        employee_id: Number(params.id),
        year: params.year ? Number(params.year) : undefined,
        splits: data.splits.map((p) => ({
          start_date: p.startDate,
          end_date: p.endDate,
          days: Number(p.days),
        })),
      };
      const res = await api({
        path: '/senior/annual-leave-plans',
        method: 'POST',
        data: body,
      });
      if (res.status === 200) {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="success"
              description={res.message || 'Хадгалагдлаа'}
              icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
            />
          ),
        });
        router.back();
      } else {
        showError(res.message);
      }
    } catch (error) {
      console.error('Save error:', error);
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
            Ээлжийн амралт төлөвлөх
          </AppText>
          <View className="gap-2.5">
            <View className="flex-row gap-2">
              <AppText className="text-sm text-darkblue w-48">Ажилтан</AppText>
              <AppText className="text-sm font-medium text-darkerblue">{employeeName}</AppText>
            </View>
            {availability && (
              <View className="flex-row gap-2">
                <AppText className="text-sm text-darkblue w-48">Э/амралтын цикл</AppText>
                <AppText className="text-sm font-medium text-darkerblue">
                  {dayjs(availability.start_date, 'YYYY-MM-DD').format('YY/MM/DD')} -{' '}
                  {dayjs(availability.end_date, 'YYYY-MM-DD').format('YY/MM/DD')}
                </AppText>
              </View>
            )}
            <View className="flex-row gap-2">
              <AppText className="text-sm text-darkblue w-48">Боломжит хоног</AppText>
              <AppText className="text-sm font-medium text-darkerblue">
                {availability?.available_days ?? 0} хоног
              </AppText>
            </View>
            {availability && (
              <View className="flex-row gap-2">
                <AppText className="text-sm text-darkblue w-48">Үлдэгдэл хоног</AppText>
                <AppText className="text-sm font-medium text-darkerblue">
                  {Math.max(0, remainingDays)} хоног
                </AppText>
              </View>
            )}
          </View>
        </View>

        <KeyboardAwareScrollView
          style={{ flex: 1, paddingHorizontal: 16, backgroundColor: '#ffffff' }}
          showsVerticalScrollIndicator={false}
          bottomOffset={20}
        >
          <View className="gap-6 pb-10 pt-7.5">
            {!availability ? (
              <AppText className="text-sm text-darkgray text-center">
                Боломжит ээлжийн амралт байхгүй байна
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
                          setValue(`splits.${index}.startDate`, '');
                          setValue(`splits.${index}.days`, '');
                          setValue(`splits.${index}.endDate`, '');
                        }
                      }}
                    />
                  );
                })}

                {(() => {
                  const addDisabled = remainingDays <= 0;
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
                        Нэмэх
                      </AppText>
                    </Pressable>
                  );
                })()}
              </>
            )}
          </View>
        </KeyboardAwareScrollView>

        {availability && (
          <View className="px-4 bg-background" style={{ paddingBottom: insets.bottom + 10 }}>
            <AppButton
              label="Хадгалах"
              onPress={handleSubmit(handleSave)}
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
