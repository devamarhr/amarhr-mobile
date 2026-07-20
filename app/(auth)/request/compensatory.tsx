import { AppButton } from '@/components/app-button';
import { AppDatePicker } from '@/components/app-date-picker';
import { AppHeader } from '@/components/app-header';
import { AppIcon } from "@/components/app-icon";
import { AppText } from '@/components/app-text';
import { AppTextField } from '@/components/app-text-field';
import { AppToast } from '@/components/app-toast';
import { RequestHeaderInfo, type HeaderInfoItem } from '@/components/request-header-info';
import { api, uploadFile } from '@/config/api';
import { pickAttachments, type PickedAsset } from '@/utils/pick-attachment';
import {
  Alert01Icon,
  ArrowLeft02Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  FileAttachmentIcon,
  MultiplicationSignIcon,
} from '@hugeicons-pro/core-stroke-standard';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cn, Spinner, useToast } from 'heroui-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

const MAX_ATTACHMENTS = 3;

type CompensatoryMode = 'day' | 'hour';

interface FormData {
  compensatoryMode: CompensatoryMode;
  hourDate?: string;
  start?: string;
  end?: string;
  description: string;
}

interface CompensatoryCheckResponse {
  is_eligible: boolean;
  start: string;
  end: string;
  work_minutes: number;
  work_hours: number;
  total_compensatory: number;
  total_compensatory_rest: number;
  total_compensatory_available: number;
}

const formatMinutesAsHHMM = (minutes: number) => {
  const safe = Math.max(0, Math.floor(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function CompensatoryRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    headerInfo?: string;
  }>();
  const { toast } = useToast();

  const title = params.title ?? '';
  const headerInfo: HeaderInfoItem[] = useMemo(() => {
    try {
      return params.headerInfo ? JSON.parse(params.headerInfo) : [];
    } catch {
      return [];
    }
  }, [params.headerInfo]);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; path: string }[]>([]);

  const uploadAssets = async (assets: PickedAsset[]) => {
    if (!assets.length) return;
    setIsUploading(true);
    for (const asset of assets) {
      try {
        const res = await uploadFile<{ path: string }>('/file-upload', asset.uri);
        if (res.status === 200) {
          setAttachments((prev) => [...prev, { name: asset.name, path: res.data.path }]);
        } else {
          toast.show({
            component: (props) => (
              <AppToast
                {...props}
                variant="danger"
                description={res.message || 'Алдаа гарлаа'}
                icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
              />
            ),
          });
        }
      } catch (e) {
        console.error('Upload failed:', e);
      }
    }
    setIsUploading(false);
  };

  const notifyAttachmentLimit = () => {
    toast.show({
      component: (props) => (
        <AppToast
          {...props}
          variant="danger"
          description={`Нэг хүсэлтэд дээд тал нь ${MAX_ATTACHMENTS} хавсралт хавсаргах боломжтой`}
          icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
        />
      ),
    });
  };

  const handlePickAttachments = async () => {
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      notifyAttachmentLimit();
      return;
    }
    const assets = await pickAttachments(remaining);
    await uploadAssets(assets.slice(0, remaining));
    if (assets.length > remaining) notifyAttachmentLimit();
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      compensatoryMode: 'day',
      description: '',
    },
  });

  const compensatoryMode = watch('compensatoryMode');
  const watchHourDate = watch('hourDate');
  const watchStart = watch('start');
  const watchEnd = watch('end');
  const [compensatoryCheck, setCompensatoryCheck] = useState<CompensatoryCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const dateFormat = compensatoryMode === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm';

  const rangeError = useMemo<string | null>(() => {
    if (!watchStart || !watchEnd) return null;
    const s = dayjs(watchStart, dateFormat);
    const e = dayjs(watchEnd, dateFormat);
    if (!s.isValid() || !e.isValid()) return null;
    if (e.isBefore(s)) return 'Дуусах хугацаа эхлэх хугацаанаас өмнө байж болохгүй';
    return null;
  }, [watchStart, watchEnd, dateFormat]);

  const eligibilityError = useMemo<string | null>(() => {
    if (!compensatoryCheck || compensatoryCheck.is_eligible) return null;
    if (compensatoryCheck.work_minutes === 0) {
      return 'Таны сонгосон хугацаанд ажлын хуваарь байхгүй тул нөхөн амрах боломжгүй';
    }
    const requested = formatMinutesAsHHMM(compensatoryCheck.work_minutes);
    return `Таны нөхөж амрах хүсэлтийн цаг /${requested}/ хуримтлагдсан цагаас хэтэрсэн байна`;
  }, [compensatoryCheck]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!watchStart || !watchEnd || rangeError) {
        setCompensatoryCheck(null);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      const res = await api<CompensatoryCheckResponse>({
        path: '/employee-request/check-compensatory',
        method: 'POST',
        data: {
          compensatoryMode,
          start: watchStart,
          end: watchEnd,
        },
      });
      if (cancelled) return;
      setIsChecking(false);
      if (res.status === 200) {
        setCompensatoryCheck(res.data);
      } else {
        setCompensatoryCheck(null);
      }
    };

    const timer = setTimeout(run, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [compensatoryMode, watchStart, watchEnd, rangeError]);

  const handleModeChange = (mode: CompensatoryMode) => {
    setValue('compensatoryMode', mode);
    setValue('hourDate', undefined);
    setValue('start', undefined);
    setValue('end', undefined);
    setCompensatoryCheck(null);
  };

  const handleSend = async (data: FormData) => {
    setIsLoading(true);
    try {
      const body = {
        detail: {
          compensatoryMode: data.compensatoryMode,
          start: data.start,
          end: data.end,
          description: data.description,
        },
        employee_request_setting_id: params.id,
        attachments,
      };
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
              icon={<AppIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
            />
          ),
        });
        router.back();
      } else {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              description={res.message}
              icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
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
          backIcon={<AppIcon icon={ArrowLeft02Icon} color="#606884" size={24} />}
        />
        <View className="px-4 pb-7.5 gap-5">
          <AppText className="text-base font-medium text-darkerblue" numberOfLines={1}>{title}</AppText>
          <RequestHeaderInfo rows={headerInfo} />
        </View>

        <KeyboardAwareScrollView
          style={{ flex: 1, paddingHorizontal: 16, backgroundColor: '#ffffff' }}
          showsVerticalScrollIndicator={false}
          bottomOffset={20}
        >
          <View className="gap-[30px] pb-10 pt-7.5">
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => handleModeChange('day')}
                className={cn(
                  'flex-1 h-11 rounded-full border items-center justify-center',
                  compensatoryMode === 'day' ? 'border-darkgray' : 'border-darkgray/30'
                )}
              >
                <AppText
                  className={cn(
                    'text-sm',
                    compensatoryMode === 'day' ? 'font-medium text-black' : 'text-darkgray/50'
                  )}
                >
                  Өдрөөр
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => handleModeChange('hour')}
                className={cn(
                  'flex-1 h-11 rounded-full border items-center justify-center',
                  compensatoryMode === 'hour' ? 'border-darkgray' : 'border-darkgray/30'
                )}
              >
                <AppText
                  className={cn(
                    'text-sm',
                    compensatoryMode === 'hour' ? 'font-medium text-black' : 'text-darkgray/50'
                  )}
                >
                  Цагаар
                </AppText>
              </Pressable>
            </View>

            {compensatoryMode === 'day' ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="start"
                    rules={{ required: 'Эхлэх сонгоно уу' }}
                    render={({ field: { onChange, value } }) => (
                      <AppDatePicker
                        label="Эхлэх өдөр"
                        mode="date"
                        value={value ? dayjs(value, dateFormat).toDate() : undefined}
                        onValueChange={(date) => onChange(dayjs(date).format(dateFormat))}
                        placeholder="00/00"
                        format="MM/DD"
                        icon={<AppIcon icon={Calendar03Icon} color="#222" size={22} />}
                        isInvalid={!!errors.start}
                        errorMessage={errors.start?.message}
                      />
                    )}
                  />
                </View>
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="end"
                    rules={{ required: 'Дуусах сонгоно уу' }}
                    render={({ field: { onChange, value } }) => (
                      <AppDatePicker
                        label="Дуусах өдөр"
                        mode="date"
                        value={value ? dayjs(value, dateFormat).toDate() : undefined}
                        onValueChange={(date) => onChange(dayjs(date).format(dateFormat))}
                        placeholder="00/00"
                        format="MM/DD"
                        minimumDate={watchStart ? dayjs(watchStart, dateFormat).toDate() : undefined}
                        icon={<AppIcon icon={Calendar03Icon} color="#222" size={22} />}
                        isInvalid={!!errors.end}
                        errorMessage={errors.end?.message}
                        isDisabled={!watchStart}
                      />
                    )}
                  />
                </View>
              </View>
            ) : (
              <>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="hourDate"
                      rules={{ required: 'Өдөр сонгоно уу' }}
                      render={({ field: { onChange, value } }) => (
                        <AppDatePicker
                          label="Нөхөж амрах өдөр"
                          mode="date"
                          value={value ? dayjs(value, 'YYYY-MM-DD').toDate() : undefined}
                          onValueChange={(date) => {
                            const d = dayjs(date).format('YYYY-MM-DD');
                            onChange(d);
                            // Re-anchor any already-picked times to the new date.
                            if (watchStart) setValue('start', `${d} ${dayjs(watchStart, dateFormat).format('HH:mm')}`, { shouldValidate: true });
                            if (watchEnd) setValue('end', `${d} ${dayjs(watchEnd, dateFormat).format('HH:mm')}`, { shouldValidate: true });
                          }}
                          placeholder="00/00"
                          format="MM/DD"
                          icon={<AppIcon icon={Calendar03Icon} color="#222" size={22} />}
                          isInvalid={!!errors.hourDate}
                          errorMessage={errors.hourDate?.message}
                        />
                      )}
                    />
                  </View>
                  <View className="flex-1" />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="start"
                      rules={{ required: 'Эхлэх цаг сонгоно уу' }}
                      render={({ field: { onChange, value } }) => (
                        <AppDatePicker
                          label="Эхлэх цаг"
                          mode="time"
                          value={value ? dayjs(value, dateFormat).toDate() : undefined}
                          onValueChange={(date) => onChange(`${watchHourDate} ${dayjs(date).format('HH:mm')}`)}
                          placeholder="00:00"
                          format="HH:mm"
                          minuteInterval={5}
                          icon={<AppIcon icon={Clock01Icon} color="#222" size={22} />}
                          isInvalid={!!errors.start}
                          errorMessage={errors.start?.message}
                          isDisabled={!watchHourDate}
                        />
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="end"
                      rules={{ required: 'Дуусах цаг сонгоно уу' }}
                      render={({ field: { onChange, value } }) => (
                        <AppDatePicker
                          label="Дуусах цаг"
                          mode="time"
                          value={value ? dayjs(value, dateFormat).toDate() : undefined}
                          onValueChange={(date) => onChange(`${watchHourDate} ${dayjs(date).format('HH:mm')}`)}
                          placeholder="00:00"
                          format="HH:mm"
                          minuteInterval={5}
                          icon={<AppIcon icon={Clock01Icon} color="#222" size={22} />}
                          isInvalid={!!errors.end}
                          errorMessage={errors.end?.message}
                          isDisabled={!watchHourDate}
                        />
                      )}
                    />
                  </View>
                </View>
              </>
            )}

            {rangeError && (
              <AppText className="text-sm text-red">{rangeError}</AppText>
            )}

            {!rangeError && compensatoryCheck?.is_eligible && compensatoryCheck.work_minutes > 0 && (
              <View className="flex-row items-center gap-2">
                <AppText className="text-sm text-darkgray">Нөхөж амрах хүсэлтийн цаг</AppText>
                <AppText className="text-sm font-medium text-black">
                  {formatMinutesAsHHMM(compensatoryCheck.work_minutes)}
                </AppText>
              </View>
            )}

            {!rangeError && eligibilityError && (
              <AppText className="text-sm text-red">{eligibilityError}</AppText>
            )}

            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextField
                  label="Шалтгаан"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  isTextArea
                  className="h-22"
                  placeholder="Шалтгаанаа энд бичнэ үү"
                />
              )}
            />

            <Pressable
              className={`-mt-[15px] flex-row items-center justify-end gap-2 ${attachments.length >= MAX_ATTACHMENTS ? 'opacity-40' : ''}`}
              onPress={handlePickAttachments}
              disabled={isUploading || attachments.length >= MAX_ATTACHMENTS}
            >
              {isUploading ? (
                <Spinner color="#005FEE" size="sm" />
              ) : (
                <AppIcon icon={FileAttachmentIcon} color="#6A6A6A" size={24} />
              )}
              <AppText className="text-base text-darkgray">{isUploading ? 'Хуулж байна...' : 'Файл хавсаргах'}</AppText>
            </Pressable>

            {attachments.map((file, index) => (
              <View key={index} className="-mt-[15px] flex-row items-center gap-3">
                <View className="flex-1 flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3">
                  <AppIcon icon={FileAttachmentIcon} color="#222222" size={24} />
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
        </KeyboardAwareScrollView>

        <View className="px-4 bg-background" style={{ paddingBottom: insets.bottom + 10 }}>
          <AppButton
            label="Илгээх"
            onPress={handleSubmit(handleSend)}
            isDisabled={isUploading || isChecking || !!eligibilityError || !!rangeError}
            isLoading={isLoading}
            className="bg-lightblue border-darkblue/15"
            labelClassName="text-darkerblue text-base font-medium"
          />
        </View>
      </StyledSafeAreaView>
    </View>
  );
}
