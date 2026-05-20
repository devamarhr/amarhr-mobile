import { AppDatePicker } from '@/components/app-date-picker';
import { AppHeader } from '@/components/app-header';
import { AppSelect } from '@/components/app-select';
import { AppText } from '@/components/app-text';
import { AppTextField } from '@/components/app-text-field';
import { api } from '@/config/api';
import {
  ArrowLeft02Icon,
  Calendar03Icon,
  FileAttachmentIcon,
  LoginCircle02Icon,
  LogoutCircle02Icon,
} from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from '@hugeicons/react-native';
import dayjs from 'dayjs';
import { useLocalSearchParams } from 'expo-router';
import { cn, Separator } from 'heroui-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

type FormType = 'dateRange' | 'timeRange' | 'compensatory' | 'textOnly' | 'timeCorrection' | 'annualLeave';

type ReviewerType = string | null;

interface ReviewDetail {
  comment: string | null;
  review_at?: string | null;
  decision_at?: string | null;
}

interface SettingDetail {
  name?: string;
  key?: string;
  fields?: { time_unit?: string; time_value?: number; has_salary?: boolean; salary_percent?: number } | [];
  annual_leave_available_days?: number;
  annual_leave_available_start_date?: string | null;
  annual_leave_available_end_date?: string | null;
  compensatory_hours?: number;
}

interface RequestSetting {
  id: number;
  name: string;
  type?: string;
  request_type?: string;
  detail?: SettingDetail;
}

interface EmployeeRequestDetail {
  id: number;
  employee_request_setting_id: number;
  status: string;
  review_by_type: ReviewerType;
  review_detail: ReviewDetail | null;
  decision_by_type: ReviewerType;
  decision_detail: ReviewDetail | null;
  detail: Record<string, any> | null;
  attachments: { name: string; path: string }[] | null;
  created_at: string | null;
  setting: RequestSetting;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Хүлээгдэж байна', color: 'text-yellow' },
  senior_pending: { label: 'Хүлээгдэж байна', color: 'text-yellow' },
  approved: { label: 'Зөвшөөрсөн', color: 'text-green' },
  rejected: { label: 'Татгалзсан', color: 'text-red' },
  read: { label: 'Уншиж танилцсан', color: 'text-darkcyan' },
};

function getDecisionLabel(type: ReviewerType): string | null {
  if (type?.includes('Employee')) return 'Ахлах';
  if (type?.includes('User')) return 'Админ';
  return null;
}

function getReviewLabel(type: ReviewerType): string | null {
  if (type?.includes('Employee')) return 'Ахлахын санал';
  if (type?.includes('User')) return 'Админы санал';
  return null;
}

function getFormType(setting: RequestSetting | undefined, detail: Record<string, any> | null): FormType {
  if (setting?.request_type === 'time_correction') return 'timeCorrection';

  const key = setting?.detail?.key;
  if (key === 'overtime') return 'timeRange';
  if (key === 'feedback' || key === 'anonymous_feedback') return 'textOnly';
  if (key === 'compensatory') return 'compensatory';
  if (key === 'annual_leave') return 'annualLeave';

  if (detail) {
    if (Array.isArray(detail.periods)) return 'annualLeave';
    if (detail.arrivalTime || detail.leaveTime || Array.isArray(detail.shifts)) {
      return 'timeCorrection';
    }
    if (detail.compensatoryMode) return 'compensatory';
    if (detail.startTime && detail.hours != null) return 'timeRange';
    if (detail.startDate && detail.days != null) return 'dateRange';
  }

  const fields = setting?.detail?.fields;
  if (fields && !Array.isArray(fields)) {
    if (fields.time_unit === 'hour') return 'timeRange';
    if (fields.time_unit === 'day') return 'dateRange';
  }

  return 'textOnly';
}

function getHeaderInfo(setting: RequestSetting | undefined): { label: string; value: string }[] {
  if (!setting?.detail) return [];
  const detail = setting.detail;

  if (detail.key === 'annual_leave' && detail.annual_leave_available_days != null) {
    const info: { label: string; value: string }[] = [
      { label: 'Боломжит хоног', value: `${detail.annual_leave_available_days} хоног` },
    ];
    if (detail.annual_leave_available_start_date && detail.annual_leave_available_end_date) {
      info.push({
        label: 'Сонгох боломжит',
        value: `${dayjs(detail.annual_leave_available_start_date, 'YYYY-MM-DD').format('MM/DD')} - ${dayjs(detail.annual_leave_available_end_date, 'YYYY-MM-DD').format('MM/DD')}`,
      });
    }
    return info;
  }
  if (detail.key === 'compensatory' && detail.compensatory_hours != null) {
    return [{ label: 'Хуримтлагдсан цаг', value: `${detail.compensatory_hours} цаг` }];
  }

  const fields = detail.fields;
  if (!fields || Array.isArray(fields)) return [];

  const timeLabel = fields.time_unit === 'hour' ? 'Боломжит дээд цаг' : 'Боломжит дээд хоног';
  const timeValue = fields.time_unit === 'hour' ? `${fields.time_value} цаг` : `${fields.time_value} хоног`;

  const info: { label: string; value: string }[] = [];
  if (fields.has_salary != null) {
    info.push({ label: 'Амралт чөлөөний төрөл', value: fields.has_salary ? 'Цалинтай' : 'Цалингүй' });
  }
  if (fields.salary_percent != null) {
    info.push({ label: 'Цалин бодолтын хувь', value: `% ${fields.salary_percent}` });
  }
  if (fields.time_value != null) {
    info.push({ label: timeLabel, value: timeValue });
  }
  return info;
}

export default function RequestDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<EmployeeRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<EmployeeRequestDetail>({
      path: `/employee-request/${params.id}`,
      method: 'GET',
    }).then((res) => {
      if (res.status === 200) setRequest(res.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const formType = useMemo(
    () => (request ? getFormType(request.setting, request.detail) : 'textOnly'),
    [request]
  );
  const headerInfo = useMemo(() => (request ? getHeaderInfo(request.setting) : []), [request]);

  const detail = request?.detail ?? {};
  const description = (detail.description as string | undefined) ?? '';
  const status = request ? statusMap[request.status] ?? { label: request.status, color: 'text-darkgray' } : null;

  const renderDateRangeFields = () => (
    <View className="flex-row gap-3">
      <View className="flex-1">
        <AppDatePicker
          label="Эхлэх өдөр"
          mode="date"
          value={detail.startDate ? dayjs(detail.startDate, 'YYYY-MM-DD').toDate() : undefined}
          placeholder="00/00"
          format="MM/DD"
          icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
          isDisabled
        />
      </View>
      <View className="flex-1">
        <AppSelect
          label="Хоног"
          options={detail.days ? [{ value: String(detail.days), label: `${detail.days} хоног` }] : []}
          value={detail.days ? { value: String(detail.days), label: `${detail.days} хоног` } : undefined}
          placeholder="-"
          isDisabled
        />
      </View>
    </View>
  );

  const renderTimeRangeFields = () => (
    <View className="flex-row gap-3">
      <View className="flex-1">
        <AppDatePicker
          label="Эхлэх цаг"
          mode="datetime"
          value={detail.startTime ? dayjs(detail.startTime, 'YYYY-MM-DD HH:mm').toDate() : undefined}
          placeholder="00/00 00:00"
          format="MM/DD HH:mm"
          icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
          isDisabled
        />
      </View>
      <View className="flex-1">
        <AppSelect
          label="Хугацаа"
          options={detail.hours != null ? [{ value: String(detail.hours), label: `${detail.hours} цаг` }] : []}
          value={detail.hours != null ? { value: String(detail.hours), label: `${detail.hours} цаг` } : undefined}
          placeholder="-"
          isDisabled
        />
      </View>
    </View>
  );

  const renderTimeCorrectionFields = () => {
    const shifts: { arrivalTime?: string; leaveTime?: string }[] = Array.isArray(detail.shifts)
      ? detail.shifts
      : [{ arrivalTime: detail.arrivalTime, leaveTime: detail.leaveTime }];
    return (
      <>
        {shifts.map((s, idx) => (
          <View key={idx} className="flex-row gap-3">
            <View className="flex-1">
              <AppDatePicker
                label="Ирсэн цаг"
                mode="time"
                value={s.arrivalTime ? dayjs(s.arrivalTime, 'HH:mm').toDate() : undefined}
                placeholder="--:--"
                icon={<HugeiconsIcon icon={LoginCircle02Icon} color="#005FEE" size={22} />}
                isDisabled
              />
            </View>
            <View className="flex-1">
              <AppDatePicker
                label="Тарсан цаг"
                mode="time"
                value={s.leaveTime ? dayjs(s.leaveTime, 'HH:mm').toDate() : undefined}
                placeholder="--:--"
                icon={<HugeiconsIcon icon={LogoutCircle02Icon} color="#005FEE" size={22} />}
                isDisabled
              />
            </View>
          </View>
        ))}
      </>
    );
  };

  const renderCompensatoryFields = () => {
    const mode = (detail.compensatoryMode as 'day' | 'hour' | undefined) ?? (detail.hours != null ? 'hour' : 'day');
    return (
      <>
        <View className="flex-row gap-3">
          <View
            className={cn(
              'flex-1 h-11 rounded-full border items-center justify-center opacity-60',
              mode === 'day' ? 'border-darkgray' : 'border-darkgray/30'
            )}
          >
            <AppText className={cn('text-sm', mode === 'day' ? 'font-medium text-black' : 'text-darkgray/50')}>
              Өдрөөр
            </AppText>
          </View>
          <View
            className={cn(
              'flex-1 h-11 rounded-full border items-center justify-center opacity-60',
              mode === 'hour' ? 'border-darkgray' : 'border-darkgray/30'
            )}
          >
            <AppText className={cn('text-sm', mode === 'hour' ? 'font-medium text-black' : 'text-darkgray/50')}>
              Цагаар
            </AppText>
          </View>
        </View>
        {mode === 'day' ? renderDateRangeFields() : renderTimeRangeFields()}
      </>
    );
  };

  const renderAnnualLeaveFields = () => {
    const periods = Array.isArray(detail.periods) ? detail.periods : [];
    if (periods.length === 0) return null;
    return (
      <View className="gap-4">
        {periods.map((p: any, i: number) => (
          <View key={i} className="flex-row gap-2 items-end">
            <View className="flex-1">
              <AppDatePicker
                label="Эхлэх"
                mode="date"
                value={p.start_date ? dayjs(p.start_date, 'YYYY-MM-DD').toDate() : undefined}
                placeholder="00/00"
                format="MM/DD"
                icon={<HugeiconsIcon icon={Calendar03Icon} color="#005FEE" size={22} />}
                isDisabled
              />
            </View>
            <View className="flex-1">
              <AppSelect
                label="Хоног"
                options={p.days != null ? [{ value: String(p.days), label: `${p.days} хоног` }] : []}
                value={p.days != null ? { value: String(p.days), label: `${p.days} хоног` } : undefined}
                placeholder="-"
                isDisabled
              />
            </View>
            <View className="gap-2">
              <AppText className="text-sm font-normal text-darkgray text-center">Дуусах</AppText>
              <View className="h-11 justify-center items-center">
                <AppText className={`text-sm ${p.end_date ? '' : 'text-muted'}`}>
                  {p.end_date ? dayjs(p.end_date, 'YYYY-MM-DD').format('MM/DD') : '--/--'}
                </AppText>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderFormFields = () => {
    switch (formType) {
      case 'dateRange':
        return renderDateRangeFields();
      case 'timeRange':
        return renderTimeRangeFields();
      case 'timeCorrection':
        return renderTimeCorrectionFields();
      case 'compensatory':
        return renderCompensatoryFields();
      case 'annualLeave':
        return renderAnnualLeaveFields();
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

        {loading ? (
          <View className="flex-1 items-center justify-center bg-white">
            <ActivityIndicator />
          </View>
        ) : !request ? (
          <View className="flex-1 items-center justify-center bg-white">
            <AppText className="text-sm text-darkgray">Мэдээлэл олдсонгүй</AppText>
          </View>
        ) : (
          <>
            <View className="px-4 pb-7.5 gap-5">
              <AppText className="text-base font-medium text-darkerblue" numberOfLines={1}>
                {request.setting.name}
              </AppText>
              {headerInfo.length > 0 && (
                <View className="gap-2.5">
                  {headerInfo.map((item, index) => (
                    <View key={index} className="flex-row gap-2">
                      <AppText className={`text-sm text-darkblue ${headerInfo.length > 1 ? 'w-48' : ''}`}>
                        {item.label}
                      </AppText>
                      <AppText className="text-sm font-medium text-darkerblue">{item.value}</AppText>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <ScrollView
              style={{ flex: 1, paddingHorizontal: 16, backgroundColor: '#ffffff' }}
              contentContainerClassName="pb-10 pt-7.5"
              showsVerticalScrollIndicator={false}
            >
              <View className="gap-6">
                {renderFormFields()}

                <AppTextField
                  label="Тайлбар"
                  value={description}
                  isTextArea
                  isDisabled
                  className={formType === 'textOnly' ? 'h-40' : 'h-22'}
                  placeholder="-"
                />

                {request.attachments && request.attachments.length > 0 && (
                  <View className="gap-2">
                    <AppText className="text-sm text-darkgray">Хавсаргасан файл</AppText>
                    {request.attachments.map((file, i) => (
                      <View key={i} className="flex-row items-center gap-3 border border-gray/20 rounded-xl h-12 px-3">
                        <HugeiconsIcon icon={FileAttachmentIcon} color="#005FEE" size={20} />
                        <AppText className="text-sm flex-1" numberOfLines={1}>{file.name}</AppText>
                      </View>
                    ))}
                  </View>
                )}

                {(request.decision_detail?.comment || request.review_detail?.comment) && (
                  <View className="gap-3 pt-2">
                    <Separator className="bg-darkgray/12" />
                    {request.decision_detail?.comment && (
                      <View>
                        <AppText className="text-sm text-darkgray">
                          {getDecisionLabel(request.decision_by_type) ?? 'Шийдвэр'}
                        </AppText>
                        <AppText className="text-sm mt-1">{request.decision_detail.comment}</AppText>
                      </View>
                    )}
                    {request.review_detail?.comment && (
                      <View>
                        <AppText className="text-sm text-darkgray">
                          {getReviewLabel(request.review_by_type) ?? 'Санал'}
                        </AppText>
                        <AppText className="text-sm mt-1">{request.review_detail.comment}</AppText>
                      </View>
                    )}
                  </View>
                )}

              </View>
            </ScrollView>

            {status && (
              <View
                className="px-4 bg-background items-center"
                style={{ paddingBottom: insets.bottom + 10, paddingTop: 12 }}
              >
                <AppText className={`text-base font-medium ${status.color}`}>
                  {status.label}
                </AppText>
              </View>
            )}
          </>
        )}
      </StyledSafeAreaView>
    </View>
  );
}
