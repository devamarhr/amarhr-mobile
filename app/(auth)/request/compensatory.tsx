import { AppButton } from '@/components/app-button';
import { AppDatePicker } from '@/components/app-date-picker';
import { AppHeader } from '@/components/app-header';
import { AppText } from '@/components/app-text';
import { AppTextField } from '@/components/app-text-field';
import { AppToast } from '@/components/app-toast';
import { api, uploadFile } from '@/config/api';
import { pickAttachments } from '@/utils/pick-attachment';
import {
  Alert01Icon,
  ArrowLeft02Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  FileAttachmentIcon,
  MultiplicationSignIcon,
} from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from '@hugeicons/react-native';
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

interface HeaderInfoItem {
  label: string;
  value: string;
}

type CompensatoryMode = 'day' | 'hour';

interface FormData {
  compensatoryMode: CompensatoryMode;
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

  const handlePickFile = async () => {
    const assets = await pickAttachments();
    if (!assets.length) return;

    setIsUploading(true);
    for (const asset of assets) {
      try {
        const res = await uploadFile<{ path: string }>('/file-upload', asset.uri);
        if (res.status === 200) {
          setAttachments((prev) => [...prev, { name: asset.name, path: res.data.path }]);
        }
      } catch (e) {
        console.error('Upload failed:', e);
      }
    }
    setIsUploading(false);
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
    if (compensatoryCheck.work_minutes === 0) return 'Ажлын цаг байхгүй байна';
    const requested = formatMinutesAsHHMM(compensatoryCheck.work_minutes);
    return `Таны хүсэлт гаргасан цаг ${requested} нь хуримтлагдсан цагаас хэтэрсэн байна`;
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
              icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
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
              icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
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

  const renderHeaderInfo = () => {
    if (headerInfo.length === 0) return null;
    return (
      <View className="gap-2.5">
        {headerInfo.map((item, index) => (
          <View key={index} className="flex-row gap-2">
            <AppText className={`text-sm text-darkblue ${headerInfo.length > 1 ? 'w-48' : ''}`}>{item.label}</AppText>
            <AppText className="text-sm font-medium text-darkerblue">{item.value}</AppText>
          </View>
        ))}
      </View>
    );
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
          <AppText className="text-base font-medium text-darkerblue" numberOfLines={1}>{title}</AppText>
          {renderHeaderInfo()}
        </View>

        <KeyboardAwareScrollView
          style={{ flex: 1, paddingHorizontal: 16, backgroundColor: '#ffffff' }}
          showsVerticalScrollIndicator={false}
          bottomOffset={20}
        >
          <View className="gap-6 pb-10 pt-7.5">
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

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="start"
                  rules={{ required: 'Эхлэх сонгоно уу' }}
                  render={({ field: { onChange, value } }) => (
                    <AppDatePicker
                      label={compensatoryMode === 'day' ? 'Эхлэх өдөр' : 'Эхлэх цаг'}
                      mode={compensatoryMode === 'day' ? 'date' : 'datetime'}
                      value={value ? dayjs(value, dateFormat).toDate() : undefined}
                      onValueChange={(date) => onChange(dayjs(date).format(dateFormat))}
                      placeholder={compensatoryMode === 'day' ? '00/00' : '00/00 00:00'}
                      format={compensatoryMode === 'day' ? 'MM/DD' : 'MM/DD HH:mm'}
                      minuteInterval={compensatoryMode === 'hour' ? 5 : undefined}
                      icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
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
                      label={compensatoryMode === 'day' ? 'Дуусах өдөр' : 'Дуусах цаг'}
                      mode={compensatoryMode === 'day' ? 'date' : 'datetime'}
                      value={value ? dayjs(value, dateFormat).toDate() : undefined}
                      onValueChange={(date) => onChange(dayjs(date).format(dateFormat))}
                      placeholder={compensatoryMode === 'day' ? '00/00' : '00/00 00:00'}
                      format={compensatoryMode === 'day' ? 'MM/DD' : 'MM/DD HH:mm'}
                      minuteInterval={compensatoryMode === 'hour' ? 5 : undefined}
                      minimumDate={watchStart ? dayjs(watchStart, dateFormat).toDate() : undefined}
                      icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
                      isInvalid={!!errors.end}
                      errorMessage={errors.end?.message}
                    />
                  )}
                />
              </View>
            </View>

            {rangeError && (
              <AppText className="text-sm text-red -mt-3">{rangeError}</AppText>
            )}

            {!rangeError && eligibilityError && (
              <AppText className="text-sm text-red -mt-3">{eligibilityError}</AppText>
            )}

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

            <Pressable className="flex-row items-center justify-end gap-2" onPress={handlePickFile} disabled={isUploading}>
              {isUploading ? (
                <Spinner color="#005FEE" size="sm" />
              ) : (
                <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={20} />
              )}
              <AppText className="text-sm text-darkgray">{isUploading ? 'Хуулж байна...' : 'Файл хавсаргах'}</AppText>
            </Pressable>

            {attachments.map((file, index) => (
              <View key={index} className="flex-row items-center gap-2">
                <View className="flex-1 flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3">
                  <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={20} />
                  <AppText className="text-sm flex-1" numberOfLines={1}>{file.name}</AppText>
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
