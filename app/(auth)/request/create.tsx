import { View, ScrollView, Pressable } from 'react-native';
import { cn, Label } from 'heroui-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';
import { AppHeader } from '@/components/app-header';
import { AppText } from '@/components/app-text';
import { AppTextField } from '@/components/app-text-field';
import { AppButton } from '@/components/app-button';
import { AppDatePicker } from '@/components/app-date-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Calendar03Icon,
  Clock01Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  FileAttachmentIcon,
  MultiplicationSignIcon, LoginCircle02Icon, LogoutCircle02Icon,
} from '@hugeicons-pro/core-stroke-standard';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const StyledSafeAreaView = withUniwind(SafeAreaView);

type FormType = 'dateRange' | 'timeRange' | 'compensatory' | 'textOnly' | 'timeCorrection';

interface HeaderInfoItem {
  label: string;
  value: string;
}

interface FormData {
  startDate?: Date;
  endDate?: Date;
  singleDate?: Date;
  startTime?: Date;
  endTime?: Date;
  arrivalTime?: Date;
  departureTime?: Date;
  overtimeStartTime?: Date;
  overtimeEndTime?: Date;
  description: string;
  compensatoryMode: 'day' | 'hour';
}

function parseTimeToDate(timeStr?: string): Date | undefined {
  if (!timeStr) return undefined;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return undefined;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export default function RequestCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    title: string;
    type: string;
    headerInfo?: string;
    textAreaLabel?: string;
    textAreaPlaceholder?: string;
    dateLabel?: string;
    arrived?: string;
    left?: string;
    overtimeStart?: string;
    overtimeEnd?: string;
  }>();

  const title = params.title ?? '';
  const type = (params.type as FormType) ?? 'textOnly';
  const headerInfo: HeaderInfoItem[] = useMemo(() => {
    try {
      return params.headerInfo ? JSON.parse(params.headerInfo) : [];
    } catch {
      return [];
    }
  }, [params.headerInfo]);
  const textAreaLabel = params.textAreaLabel;
  const textAreaPlaceholder = params.textAreaPlaceholder;
  const dateLabel = params.dateLabel;

  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; tmpPath: string }[]>([]);

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (result.canceled) return;

    for (const asset of result.assets) {
      // TODO: replace with real API upload
      const tmpPath = `/tmp/uploads/${Date.now()}_${asset.name}`;
      setAttachments((prev) => [...prev, { name: asset.name, tmpPath }]);
    }
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
      compensatoryMode: 'day',
      arrivalTime: parseTimeToDate(params.arrived),
      departureTime: parseTimeToDate(params.left),
      overtimeStartTime: parseTimeToDate(params.overtimeStart),
      overtimeEndTime: parseTimeToDate(params.overtimeEnd),
    },
  });

  const compensatoryMode = watch('compensatoryMode');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return null;
    const diff = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    return diff > 0 ? diff : null;
  }, [startDate, endDate]);

  const handleSend = async (data: FormData) => {
    setIsLoading(true);
    try {
      // TODO: send to API
      console.log(JSON.stringify({ type, title, ...data, attachments }));
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.back();
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
                value={value}
                onValueChange={onChange}
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
            name="endDate"
            rules={{ required: 'Дуусах өдөр сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Дуусах өдөр"
                mode="date"
                value={value}
                onValueChange={onChange}
                placeholder="00/00"
                format="MM/DD"
                icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.endDate}
                errorMessage={errors.endDate?.message}
              />
            )}
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
            <AppText className="text-sm text-darkgray">Нийт ажлын хоног</AppText>
            <View className="flex-1 bg-gray/10 rounded-lg h-11 px-3 justify-center">
              <AppText className="text-sm">{totalDays ?? '-'} хоног</AppText>
            </View>
        </View>
        <View className="flex-1"></View>
      </View>
    </>
  );

  const renderTimeRangeFields = () => (
    <>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="singleDate"
            rules={{ required: 'Өдөр сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label={dateLabel ?? 'Өдөр'}
                mode="date"
                value={value}
                onValueChange={onChange}
                placeholder="00/00"
                format="MM/DD"
                icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.singleDate}
                errorMessage={errors.singleDate?.message}
              />
            )}
          />
        </View>
        <View className="flex-1"></View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="startTime"
            rules={{ required: 'Эхлэх цаг сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Эхлэх цаг"
                mode="time"
                value={value}
                onValueChange={onChange}
                placeholder="00:00"
                icon={<HugeiconsIcon icon={Clock01Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.startTime}
                errorMessage={errors.startTime?.message}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="endTime"
            rules={{ required: 'Дуусах цаг сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Дуусах цаг"
                mode="time"
                value={value}
                onValueChange={onChange}
                placeholder="00:00"
                icon={<HugeiconsIcon icon={Clock01Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.endTime}
                errorMessage={errors.endTime?.message}
              />
            )}
          />
        </View>
      </View>
    </>
  );

  const renderTimeCorrectionFields = () => (
    <>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="arrivalTime"
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Ирсэн цаг"
                mode="time"
                value={value}
                onValueChange={onChange}
                placeholder="--:--"
                icon={<HugeiconsIcon icon={LoginCircle02Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.arrivalTime}
                errorMessage={errors.arrivalTime?.message}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="departureTime"
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Тарсан цаг"
                mode="time"
                value={value}
                onValueChange={onChange}
                placeholder="--:--"
                icon={<HugeiconsIcon icon={LogoutCircle02Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.departureTime}
                errorMessage={errors.departureTime?.message}
              />
            )}
          />
        </View>
      </View>

      {(params.overtimeStart || params.overtimeEnd) && <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="overtimeStartTime"
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Ирсэн цаг / Илүү цаг"
                mode="time"
                value={value}
                onValueChange={onChange}
                placeholder="--:--"
                icon={<HugeiconsIcon icon={Clock01Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.overtimeStartTime}
                errorMessage={errors.overtimeStartTime?.message}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="overtimeEndTime"
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Тарсан цаг / Илүү цаг"
                mode="time"
                value={value}
                onValueChange={onChange}
                placeholder="--:--"
                icon={<HugeiconsIcon icon={Clock01Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.overtimeEndTime}
                errorMessage={errors.overtimeEndTime?.message}
              />
            )}
          />
        </View>
      </View>}
    </>
  );

  const renderCompensatoryFields = () => (
    <>
      <Controller
        control={control}
        name="compensatoryMode"
        render={({ field: { onChange, value } }) => (
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => onChange('day')}
              className={cn(
                'flex-1 h-11 rounded-full border items-center justify-center',
                value === 'day' ? 'border-darkgray' : 'border-darkgray/30'
              )}
            >
              <AppText
                className={cn(
                  'text-sm',
                  value === 'day' ? 'font-medium text-black' : 'text-darkgray/50'
                )}
              >
                Өдрөөр
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => onChange('hour')}
              className={cn(
                'flex-1 h-11 rounded-full border items-center justify-center',
                value === 'hour' ? 'border-darkgray' : 'border-darkgray/30'
              )}
            >
              <AppText
                className={cn(
                  'text-sm',
                  value === 'hour' ? 'font-medium text-black' : 'text-darkgray/50'
                )}
              >
                Цагаар
              </AppText>
            </Pressable>
          </View>
        )}
      />

      {compensatoryMode === 'day' ? (
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
                  value={value}
                  onValueChange={onChange}
                  placeholder="MM/DD"
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
              name="endDate"
              rules={{ required: 'Дуусах өдөр сонгоно уу' }}
              render={({ field: { onChange, value } }) => (
                <AppDatePicker
                  label="Дуусах өдөр"
                  mode="date"
                  value={value}
                  onValueChange={onChange}
                  placeholder="MM/DD"
                  format="MM/DD"
                  icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
                  isInvalid={!!errors.endDate}
                  errorMessage={errors.endDate?.message}
                />
              )}
            />
          </View>
        </View>
      ) : (
        <>
          <Controller
            control={control}
            name="singleDate"
            rules={{ required: 'Нөхөж амрах өдөр сонгоно уу' }}
            render={({ field: { onChange, value } }) => (
              <AppDatePicker
                label="Нөхөж амрах өдөр"
                mode="date"
                value={value}
                onValueChange={onChange}
                placeholder="MM/DD"
                format="MM/DD"
                icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
                isInvalid={!!errors.singleDate}
                errorMessage={errors.singleDate?.message}
              />
            )}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={control}
                name="startTime"
                rules={{ required: 'Эхлэх цаг сонгоно уу' }}
                render={({ field: { onChange, value } }) => (
                  <AppDatePicker
                    label="Эхлэх цаг"
                    mode="time"
                    value={value}
                    onValueChange={onChange}
                    placeholder="00:00"
                    icon={<HugeiconsIcon icon={Clock01Icon} color="#005FEE" size={22} />}
                    isInvalid={!!errors.startTime}
                    errorMessage={errors.startTime?.message}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="endTime"
                rules={{ required: 'Дуусах цаг сонгоно уу' }}
                render={({ field: { onChange, value } }) => (
                  <AppDatePicker
                    label="Дуусах цаг"
                    mode="time"
                    value={value}
                    onValueChange={onChange}
                    placeholder="00:00"
                    icon={<HugeiconsIcon icon={Clock01Icon} color="#005FEE" size={22} />}
                    isInvalid={!!errors.endTime}
                    errorMessage={errors.endTime?.message}
                  />
                )}
              />
            </View>
          </View>
        </>
      )}
    </>
  );

  const renderFormFields = () => {
    switch (type) {
      case 'dateRange':
        return renderDateRangeFields();
      case 'timeRange':
        return renderTimeRangeFields();
      case 'timeCorrection':
        return renderTimeCorrectionFields();
      case 'compensatory':
        return renderCompensatoryFields();
      case 'textOnly':
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-lightblue">
      <StyledSafeAreaView className="flex-1" edges={['top']}>
        <AppHeader
          title=""
          className="px-4"
          showBack
          backIcon={
            <View className="flex-row gap-2 items-center">
              <HugeiconsIcon icon={ArrowLeft02Icon} color="#606884" size={24} />
              <AppText className="text-sm font-medium text-darkblue">Буцах</AppText>
            </View>
          }
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
                  label={textAreaLabel ?? 'Тайлбар'}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  isTextArea
                  className={type === 'textOnly' ? 'h-40' : 'h-22'}
                  placeholder={textAreaPlaceholder ?? 'Тайлбараа энд бичнэ үү'}
                />
              )}
            />

            <Pressable className="flex-row items-center justify-end gap-2" onPress={handlePickFile}>
              <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={20} />
              <AppText className="text-sm text-darkgray">Файл хавсаргах</AppText>
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
            isLoading={isLoading}
            className="bg-lightblue border-darkblue/15"
            labelClassName="text-darkerblue text-base font-medium"
          />
        </View>
      </StyledSafeAreaView>
    </View>
  );
}