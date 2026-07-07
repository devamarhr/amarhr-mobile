import { AppButton } from '@/components/app-button';
import { AppCheckbox } from '@/components/app-checkbox';
import { AppDatePicker } from '@/components/app-date-picker';
import { AppHeader } from '@/components/app-header';
import { AppSelect } from '@/components/app-select';
import { AppText } from '@/components/app-text';
import { AppTextField } from '@/components/app-text-field';
import { AppToast } from '@/components/app-toast';
import { api, uploadFile } from '@/config/api';
import { pickAttachments, type PickedAsset } from '@/utils/pick-attachment';
import { Login03Icon, Logout03Icon } from '@hugeicons-pro/core-stroke-rounded';
import {
  Alert01Icon,
  ArrowLeft02Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  FileAttachmentIcon,
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

const MAX_ATTACHMENTS = 3;

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
  days?: number;
  hours?: number;
  startTime?: string;
  shift: ShiftEntry;
  description: string;
}

function parseDateTimeToString(s?: string): string | undefined {
  if (!s) return undefined;
  const d = dayjs(s, 'YYYY-MM-DD HH:mm');
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : undefined;
}

// Render a header value, dimming any "--:--" placeholder (e.g. an unrecorded
// clock-out in "09:42 - --:--") to match the design.
function renderHeaderValue(value: string) {
  return value.split(/(--:--)/g).map((part, i) =>
    part === '--:--' ? (
      <AppText key={i} className="text-sm text-darkerblue/50">{part}</AppText>
    ) : (
      part
    ),
  );
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
    settingType?: string;
    settingKey?: string;
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
  const [crossesDay, setCrossesDay] = useState(false);

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
                icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
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
          icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
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
      description: '',
      shift: initialShift,
    },
  });

  // "Хоног дамжина": checked -> pick a full date+time (crosses midnight),
  // unchecked -> time only, anchored to the shift's day.
  const handleCrossesDayChange = (checked: boolean) => {
    setCrossesDay(checked);
    if (!checked) {
      const current = watch('shift.leaveTime');
      if (current) {
        const time = dayjs(current, 'YYYY-MM-DD HH:mm').format('HH:mm');
        setValue('shift.leaveTime', `${params.cdate} ${time}`, { shouldValidate: true });
      }
    }
  };

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
      } else if (type === 'timeRange' || type === 'overtime') {
        // startDate (YYYY-MM-DD) + startTime (HH:mm) -> combined datetime for the backend.
        detail = {
          startTime: rest.startDate && rest.startTime ? `${rest.startDate} ${rest.startTime}` : undefined,
          hours: rest.hours,
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
            <AppText className={`text-sm text-darkblue ${headerInfo.length > 1 ? (type === 'timeCorrection' ? 'w-[150px]' : 'w-52') : ''}`}>{item.label}</AppText>
            <AppText className="text-sm font-medium text-darkerblue flex-1" numberOfLines={1}>{renderHeaderValue(item.value)}</AppText>
          </View>
        ))}
      </View>
    );
  };

  const renderDateRangeFields = () => {
    const startDate = watch('startDate');
    const days = watch('days');
    const startDateSelected = !!startDate;
    const isRemote = params.settingType === 'remote';
    // Дуусах өдөр is derived from the start date + requested days (read-only display).
    const endDate =
      startDate && days && days > 0
        ? dayjs(startDate, 'YYYY-MM-DD').add(days - 1, 'day').toDate()
        : undefined;
    return (
      <View className="gap-6">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="startDate"
              rules={{ required: 'Эхлэх өдөр сонгоно уу' }}
              render={({ field: { onChange, value } }) => (
                <AppDatePicker
                  label={isRemote ? 'Ажиллах өдөр' : 'Эхлэх өдөр'}
                  mode="date"
                  value={value ? dayjs(value, 'YYYY-MM-DD').toDate() : undefined}
                  onValueChange={(date) => onChange(dayjs(date).format('YYYY-MM-DD'))}
                  placeholder="00/00"
                  format="MM/DD"
                  icon={<HugeiconsIcon icon={Calendar03Icon} color="#222" size={22} />}
                  isInvalid={!!errors.startDate}
                  errorMessage={errors.startDate?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <AppDatePicker
              label="Дуусах өдөр"
              mode="date"
              value={endDate}
              placeholder="00/00"
              format="MM/DD"
              icon={<HugeiconsIcon icon={Calendar03Icon} color="#222" size={22} />}
              isDisabled
              triggerClassName="bg-[#f2f2f2] border-transparent disabled:opacity-100"
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="days"
              rules={{ required: 'Хоног сонгоно уу' }}
              render={({ field: { onChange, value } }) => (
                <AppSelect
                  label={isRemote ? 'Ажиллах хоног' : 'Хүсэх хоног'}
                  options={dayOptions}
                  value={value != null ? dayOptions.find(o => o.value === String(value)) : undefined}
                  onValueChange={(opt) => onChange(opt ? parseInt(opt.value, 10) : undefined)}
                  placeholder="Сонгох"
                  renderValue={(option) => <AppText className="text-sm">{option.value}</AppText>}
                  isInvalid={!!errors.days}
                  errorMessage={errors.days?.message}
                  isDisabled={!startDateSelected || dayOptions.length === 0}
                />
              )}
            />
          </View>
          <View className="flex-1" />
        </View>
      </View>
    );
  };

  const renderTimeRangeFields = () => {
    const dateSelected = !!watch('startDate');
    const isRemote = params.settingType === 'remote';
    return (
      <View className="gap-6">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="startDate"
              rules={{ required: 'Огноо сонгоно уу' }}
              render={({ field: { onChange, value } }) => (
                <AppDatePicker
                  label={isRemote ? 'Ажиллах өдөр' : 'Огноо'}
                  mode="date"
                  value={value ? dayjs(value, 'YYYY-MM-DD').toDate() : undefined}
                  onValueChange={(date) => onChange(dayjs(date).format('YYYY-MM-DD'))}
                  placeholder="00/00"
                  format="MM/DD"
                  icon={<HugeiconsIcon icon={Calendar03Icon} color="#222" size={22} />}
                  isInvalid={!!errors.startDate}
                  errorMessage={errors.startDate?.message}
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
              name="startTime"
              rules={{ required: 'Эхлэх цаг сонгоно уу' }}
              render={({ field: { onChange, value } }) => (
                <AppDatePicker
                  label="Эхлэх цаг"
                  mode="time"
                  value={value ? dayjs(value, 'HH:mm').toDate() : undefined}
                  onValueChange={(date) => onChange(dayjs(date).format('HH:mm'))}
                  placeholder="00:00"
                  format="HH:mm"
                  minuteInterval={5}
                  icon={<HugeiconsIcon icon={Clock01Icon} color="#222" size={22} />}
                  isInvalid={!!errors.startTime}
                  errorMessage={errors.startTime?.message}
                  isDisabled={!dateSelected}
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
                  label={isRemote ? 'Ажиллах цаг' : 'Чөлөө хүсэх цаг'}
                  options={hourOptions}
                  value={value != null ? hourOptions.find(o => o.value === String(value)) : undefined}
                  onValueChange={(opt) => onChange(opt ? parseInt(opt.value, 10) : undefined)}
                  placeholder="Сонгох"
                  renderValue={(option) => <AppText className="text-sm">{option.value}</AppText>}
                  isInvalid={!!errors.hours}
                  errorMessage={errors.hours?.message}
                  isDisabled={!dateSelected || hourOptions.length === 0}
                />
              )}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderOvertimeFields = () => {
    const dateSelected = !!watch('startDate');
    // Overtime duration is picked as HH:mm in 30-min steps; cap at the API max hours (default 24h).
    const cap = Math.min(maxHours || 24, 24);
    const baseDay = dayjs().startOf('day');
    const maxDurationDate = baseDay.add(cap, 'hour').toDate();
    // Form stores duration as decimal hours (2:30 -> 2.5); convert to/from a Date for the picker.
    const hoursToDate = (h?: number) => {
      if (h == null) return undefined;
      const whole = Math.floor(h);
      const minutes = Math.round((h - whole) * 60);
      return baseDay.hour(whole).minute(minutes).toDate();
    };
    const dateToHours = (d: Date) => dayjs(d).hour() + dayjs(d).minute() / 60;
    return (
      <View className="gap-6">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="startDate"
              rules={{ required: 'Ажиллах өдөр сонгоно уу' }}
              render={({ field: { onChange, value } }) => (
                <AppDatePicker
                  label="Ажиллах өдөр"
                  mode="date"
                  value={value ? dayjs(value, 'YYYY-MM-DD').toDate() : undefined}
                  onValueChange={(date) => onChange(dayjs(date).format('YYYY-MM-DD'))}
                  placeholder="00/00"
                  format="MM/DD"
                  icon={<HugeiconsIcon icon={Calendar03Icon} color="#222" size={22} />}
                  isInvalid={!!errors.startDate}
                  errorMessage={errors.startDate?.message}
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
              name="startTime"
              rules={{ required: 'Эхлэх цаг сонгоно уу' }}
              render={({ field: { onChange, value } }) => (
                <AppDatePicker
                  label="Эхлэх цаг"
                  mode="time"
                  value={value ? dayjs(value, 'HH:mm').toDate() : undefined}
                  onValueChange={(date) => onChange(dayjs(date).format('HH:mm'))}
                  placeholder="00:00"
                  format="HH:mm"
                  minuteInterval={5}
                  icon={<HugeiconsIcon icon={Clock01Icon} color="#222" size={22} />}
                  isInvalid={!!errors.startTime}
                  errorMessage={errors.startTime?.message}
                  isDisabled={!dateSelected}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="hours"
              rules={{
                required: 'Цаг сонгоно уу',
                validate: (v) => (v != null && v > 0) || 'Цаг сонгоно уу',
              }}
              render={({ field: { onChange, value } }) => (
                <AppDatePicker
                  label="Ажиллах цаг"
                  mode="time"
                  value={hoursToDate(value)}
                  onValueChange={(date) => onChange(dateToHours(date))}
                  placeholder="00:00"
                  format="HH:mm"
                  minuteInterval={30}
                  initialDate={baseDay.toDate()}
                  maximumDate={maxDurationDate}
                  icon={<HugeiconsIcon icon={Clock01Icon} color="#222" size={22} />}
                  isInvalid={!!errors.hours}
                  errorMessage={errors.hours?.message}
                  isDisabled={!dateSelected}
                />
              )}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderTimeCorrectionFields = () => {
    const arrivalError = errors.shift?.arrivalTime;
    const leaveError = errors.shift?.leaveTime;
    const arrivalDisabled = !initialShift.arrivalTime;
    const watchedArrival = watch('shift.arrivalTime');
    const minLeaveDate = watchedArrival
      ? dayjs(watchedArrival, 'YYYY-MM-DD HH:mm').toDate()
      : undefined;
    return (
      <View className="gap-2.5">
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
                  placeholderClassName="text-darkerblue/50"
                  icon={<HugeiconsIcon icon={Login03Icon} color="#222" size={22} />}
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
                  label={crossesDay ? 'Тарсан огноо, цаг' : 'Тарсан цаг'}
                  mode={crossesDay ? 'datetime' : 'time'}
                  value={value ? dayjs(value, 'YYYY-MM-DD HH:mm').toDate() : undefined}
                  onValueChange={(date) => {
                    if (crossesDay) {
                      onChange(dayjs(date).format('YYYY-MM-DD HH:mm'));
                    } else {
                      const time = dayjs(date).format('HH:mm');
                      onChange(`${params.cdate} ${time}`);
                    }
                  }}
                  placeholder={crossesDay ? '00/00 00:00' : '--:--'}
                  format={crossesDay ? 'MM/DD HH:mm' : 'HH:mm'}
                  minuteInterval={5}
                  placeholderClassName="text-darkerblue/50"
                  minimumDate={crossesDay ? minLeaveDate : undefined}
                  icon={<HugeiconsIcon icon={Logout03Icon} color="#222" size={22} />}
                  isInvalid={!!leaveError}
                  errorMessage={leaveError?.message}
                />
              )}
            />
          </View>
        </View>
        <View className="flex-row items-center justify-end gap-2">
          <AppCheckbox
            isSelected={crossesDay}
            onSelectedChange={handleCrossesDayChange}
            size={20}
          />
          <AppText className="text-sm text-darkgray">Хоног дамжина</AppText>
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
                  label={
                    params.settingKey === 'feedback'
                      ? 'Санал, хүсэлт'
                      : params.settingKey === 'anonymous_feedback'
                        ? 'Санал, гомдол'
                        : 'Шалтгаан'
                  }
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  isTextArea
                  className={type === 'textOnly' ? 'h-80' : 'h-25'}
                  placeholder={
                    params.settingKey === 'feedback'
                      ? 'Санал, хүсэлтээ энд бичнэ үү'
                      : params.settingKey === 'anonymous_feedback'
                        ? 'Санал, гомдлоо энд бичнэ үү'
                        : 'Шалтгаанаа энд бичнэ үү'
                  }
                />
              )}
            />

            <Pressable
              className={`flex-row items-center justify-end gap-2 ${attachments.length >= MAX_ATTACHMENTS ? 'opacity-40' : ''}`}
              onPress={handlePickAttachments}
              disabled={isUploading || attachments.length >= MAX_ATTACHMENTS}
            >
              {isUploading ? (
                <Spinner color="#005FEE" size="sm" />
              ) : (
                <HugeiconsIcon icon={FileAttachmentIcon} color="#222222" size={24} />
              )}
              <AppText className="text-sm text-darkgray">{isUploading ? 'Хуулж байна...' : 'Файл хавсаргах'}</AppText>
            </Pressable>

            {attachments.map((file, index) => (
              <View key={index} className="flex-row items-center gap-3">
                <View className="flex-1 flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3">
                  <HugeiconsIcon icon={FileAttachmentIcon} color="#222222" size={24} />
                  <AppText className="text-sm flex-1" numberOfLines={1}>{file.name}</AppText>
                </View>
                <Pressable
                  onPress={() => handleRemoveAttachment(index)}
                  className="w-12 h-12 items-center justify-center border border-gray/20 rounded-xl"
                >
                  <HugeiconsIcon icon={MultiplicationSignIcon} color="#EF444480" size={24} />
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