import { AppButton } from '@/components/app-button';
import { AppDatePicker } from '@/components/app-date-picker';
import { AppHeader } from '@/components/app-header';
import { AppSelect } from '@/components/app-select';
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
  LoginCircle02Icon, LogoutCircle02Icon,
  MultiplicationSignIcon
} from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Spinner, useToast } from 'heroui-native';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

type FormType = 'dateRange' | 'timeRange' | 'textOnly' | 'timeCorrection' | 'annualLeave' | 'overtime';

interface HeaderInfoItem {
  label: string;
  value: string;
}

interface ShiftEntry {
  arrivalTime?: string;
  leaveTime?: string;
}

interface FormData {
  startDate?: string;
  days?: string;
  hours?: string;
  startTime?: string;
  shift: ShiftEntry;
  description: string;
}

function parseDateTimeToString(s?: string): string | undefined {
  if (!s) return undefined;
  const d = dayjs(s, 'YYYY-MM-DD HH:mm');
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : undefined;
}

export default function RequestCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    type: string;
    headerInfo?: string;
    maxDays?: string;
    maxHours?: string;
    shift?: string;
    shiftId?: string;
    cdate?: string;
  }>();
  const { toast } = useToast();

  const title = params.title ?? '';
  const type = (params.type as FormType) ?? 'textOnly';
  const headerInfo: HeaderInfoItem[] = useMemo(() => {
    try {
      return params.headerInfo ? JSON.parse(params.headerInfo) : [];
    } catch {
      return [];
    }
  }, [params.headerInfo]);

  const initialShift: ShiftEntry = useMemo(() => {
    try {
      if (params.shift) {
        const parsed = JSON.parse(params.shift) as { arrived?: string; left?: string };
        return {
          arrivalTime: parseDateTimeToString(parsed.arrived),
          leaveTime: parseDateTimeToString(parsed.left),
        };
      }
    } catch {}
    return { arrivalTime: undefined, leaveTime: undefined };
  }, [params.shift]);

  const maxDays = params.maxDays ? parseInt(params.maxDays, 10) : 0;
  const maxHours = params.maxHours ? parseInt(params.maxHours, 10) : 0;
  const dayOptions = useMemo(() =>
    Array.from({ length: maxDays }, (_, i) => ({ value: String(i + 1), label: `${i + 1} хоног` })),
    [maxDays]
  );
  const hourOptions = useMemo(() =>
    Array.from({ length: maxHours }, (_, i) => ({ value: String(i + 1), label: `${i + 1} цаг` })),
    [maxHours]
  );
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
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      description: '',
      shift: initialShift,
    },
  });

  const handleSend = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { shift, description, ...rest } = data;
      let detail: Record<string, unknown> = { ...rest, description };
      if (type === 'timeCorrection') {
        const withSeconds = (t?: string) => (t ? `${t}:00` : undefined);
        detail = {
          id: params.shiftId ? Number(params.shiftId) : undefined,
          startTime: withSeconds(shift.arrivalTime),
          endTime: withSeconds(shift.leaveTime),
          description,
        };
      }
      const body = {
        detail,
        employee_request_setting_id: params.id,
        attachments,
      };
      console.log(body);
      const res = await api({
        path: '/employee-request',
        method: 'POST',
        data: body,
      });
      if(res.status === 200){
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
      }else{
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              // title="Алдаа"
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

  const renderDateRangeFields = () => (
    <>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="startDate"
            rules={{ required: 'Эхлэх өдөр сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Эхлэх өдөр"
                mode="date"
                value={value ? dayjs(value, 'YYYY-MM-DD').toDate() : undefined}
                onValueChange={(date) => onChange(dayjs(date).format('YYYY-MM-DD'))}
                placeholder="00/00"
                format="MM/DD"
                icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.startDate}
                errorMessage={errors.startDate?.message}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="days"
            rules={{ required: 'Хоног сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppSelect
                label="Хоног"
                options={dayOptions}
                value={dayOptions.find(o => o.value === value)}
                onValueChange={(opt) => onChange(opt?.value ?? '')}
                placeholder="Сонгох"
                isInvalid={!!errors.days}
                errorMessage={errors.days?.message}
              />
            )}
          />
        </View>
      </View>
    </>
  );

  const renderTimeRangeFields = () => (
    <>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="startTime"
            rules={{ required: 'Эхлэх цаг сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Эхлэх цаг"
                mode="datetime"
                value={value ? dayjs(value, 'YYYY-MM-DD HH:mm').toDate() : undefined}
                onValueChange={(date) => onChange(dayjs(date).format('YYYY-MM-DD HH:mm'))}
                placeholder="00/00 00:00"
                format="MM/DD HH:mm"
                minuteInterval={5}
                icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.startTime}
                errorMessage={errors.startTime?.message}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="hours"
            rules={{ required: 'Цаг сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppSelect
                label="Хугацаа"
                options={hourOptions}
                value={hourOptions.find(o => o.value === value)}
                onValueChange={(opt) => onChange(opt?.value ?? '')}
                placeholder="Сонгох"
                isInvalid={!!errors.hours}
                errorMessage={errors.hours?.message}
              />
            )}
          />
        </View>
      </View>
    </>
  );

  const renderOvertimeFields = () => (
    <>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="startTime"
            rules={{ required: 'Эхлэх цаг сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Эхлэх цаг"
                mode="datetime"
                value={value ? dayjs(value, 'YYYY-MM-DD HH:mm').toDate() : undefined}
                onValueChange={(date) => onChange(dayjs(date).format('YYYY-MM-DD HH:mm'))}
                placeholder="00/00 00:00"
                format="MM/DD HH:mm"
                minuteInterval={5}
                icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.startTime}
                errorMessage={errors.startTime?.message}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="hours"
            rules={{
              required: 'Цаг оруулна уу',
              validate: (v) => {
                const n = Number(v);
                if (!Number.isInteger(n) || n <= 0) return 'Бүхэл тоо оруулна уу';
                if (maxHours && n > maxHours) return `Дээд тал нь ${maxHours} цаг`;
                return true;
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextField
                label="Ажиллах цаг"
                value={value ?? ''}
                onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
                onBlur={onBlur}
                keyboardType="number-pad"
                placeholder="Цаг"
                isInvalid={!!errors.hours}
                errorMessage={errors.hours?.message}
              />
            )}
          />
        </View>
      </View>
    </>
  );

  const renderTimeCorrectionFields = () => {
    const arrivalError = errors.shift?.arrivalTime;
    const leaveError = errors.shift?.leaveTime;
    const arrivalDisabled = !initialShift.arrivalTime;
    const leaveDisabled = !initialShift.leaveTime;
    const watchedArrival = watch('shift.arrivalTime');
    const minLeaveDate = watchedArrival
      ? dayjs(watchedArrival, 'YYYY-MM-DD HH:mm').toDate()
      : undefined;
    return (
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="shift.arrivalTime"
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Ирсэн цаг"
                mode="time"
                value={value ? dayjs(value, 'YYYY-MM-DD HH:mm').toDate() : undefined}
                onValueChange={(date) => {
                  const time = dayjs(date).format('HH:mm');
                  onChange(`${params.cdate} ${time}`);
                }}
                placeholder="--:--"
                format="HH:mm"
                minuteInterval={5}
                icon={<HugeiconsIcon icon={LoginCircle02Icon} color="#005FEE" size={22} />}
                isInvalid={!!arrivalError}
                errorMessage={arrivalError?.message}
                isDisabled={arrivalDisabled}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="shift.leaveTime"
            rules={{
              validate: (v) => {
                if (!v || !watchedArrival) return true;
                const start = dayjs(watchedArrival, 'YYYY-MM-DD HH:mm');
                const end = dayjs(v, 'YYYY-MM-DD HH:mm');
                return end.isAfter(start) || 'Тарсан цаг ирсэн цагаас хойно байх ёстой';
              },
            }}
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Тарсан цаг"
                mode="datetime"
                value={value ? dayjs(value, 'YYYY-MM-DD HH:mm').toDate() : undefined}
                onValueChange={(date) => onChange(dayjs(date).format('YYYY-MM-DD HH:mm'))}
                placeholder="00/00 00:00"
                format="MM/DD HH:mm"
                minuteInterval={5}
                minimumDate={minLeaveDate}
                icon={<HugeiconsIcon icon={LogoutCircle02Icon} color="#005FEE" size={22} />}
                isInvalid={!!leaveError}
                errorMessage={leaveError?.message}
                isDisabled={leaveDisabled}
              />
            )}
          />
        </View>
      </View>
    );
  };

  const renderFormFields = () => {
    switch (type) {
      case 'dateRange':
        return renderDateRangeFields();
      case 'timeRange':
        return renderTimeRangeFields();
      case 'overtime':
        return renderOvertimeFields();
      case 'timeCorrection':
        return renderTimeCorrectionFields();
      case 'textOnly':
      default:
        return null;
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
          <AppText className="text-base font-medium text-darkerblue" numberOfLines={1}>{title}</AppText>
          {renderHeaderInfo()}
        </View>

        <KeyboardAwareScrollView
          style={{flex:1,paddingHorizontal: 16,backgroundColor: "#ffffff"}}
          showsVerticalScrollIndicator={false}
          bottomOffset={20}
        >
          <View className="gap-6 pb-10 pt-7.5">
            {renderFormFields()}

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
                  className={type === 'textOnly' ? 'h-40' : 'h-22'}
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
            isDisabled={isUploading}
            isLoading={isLoading}
            className="bg-lightblue border-darkblue/15"
            labelClassName="text-darkerblue text-base font-medium"
          />
        </View>
      </StyledSafeAreaView>
    </View>
  );
}