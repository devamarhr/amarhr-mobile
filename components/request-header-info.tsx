import { AppText } from '@/components/app-text';
import React from 'react';
import { View } from 'react-native';

export interface HeaderInfoItem {
  label: string;
  value: string;
}

interface HeaderInfoFields {
  time_unit?: string;
  time_value?: number;
  has_salary?: boolean;
  salary_percent?: number;
}

/**
 * The subset of an employee-request setting that the header rows are derived
 * from — loose on purpose so both the request list (`/employee-request-setting`)
 * and a submitted request's detail (`/employee-request/{id}` → `setting`) satisfy it.
 */
export interface HeaderInfoSetting {
  type?: string;
  detail?: {
    key?: string;
    fields?: HeaderInfoFields | unknown[] | null;
    annual_leave_total_days?: number;
    annual_leave_available_days?: number;
    compensatory_minutes?: number;
  } | null;
  adjustment_setting?: {
    detail?: { amount: number; amount_type: 'fixed' | 'percent' }[];
  } | null;
}

// Format a minutes value as HH:mm, e.g. 90 -> "01:30", 720 -> "12:00".
function formatMinutesAsHHMM(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Settings whose header row is an employee-specific *live* balance rather than a
// fixed attribute of the setting itself.
const BALANCE_KEYS = ['compensatory', 'annual_leave'];

/**
 * Build the label/value rows for a request screen header.
 *
 * `includeBalances: false` drops the annual-leave and compensatory settings
 * entirely. Their rows ("Боломжит хоног", "Хуримтлагдсан цаг") are the employee's
 * balance as of right now — correct while submitting, but on an already-submitted
 * request's detail they'd show today's balance next to a months-old request.
 */
export function getRequestHeaderInfo(
  setting: HeaderInfoSetting,
  { includeBalances = true }: { includeBalances?: boolean } = {},
): HeaderInfoItem[] | undefined {
  const detail = setting.detail;
  if (!detail) return undefined;

  if (!includeBalances && BALANCE_KEYS.includes(detail.key ?? '')) return undefined;

  if (detail.key === 'compensatory' && detail.compensatory_minutes != null) {
    return [{ label: 'Хуримтлагдсан цаг', value: formatMinutesAsHHMM(detail.compensatory_minutes) }];
  }

  const annualLeaveTotal = detail.annual_leave_total_days ?? detail.annual_leave_available_days;
  if (detail.key === 'annual_leave' && annualLeaveTotal != null) {
    return [{ label: 'Боломжит хоног', value: `${annualLeaveTotal} хоног` }];
  }

  if (setting.type === 'benefit' && setting.adjustment_setting?.detail?.length) {
    return setting.adjustment_setting.detail.map((item) => {
      if (item.amount_type === 'fixed') {
        return { label: 'Нэг удаагийн', value: `${item.amount.toLocaleString()} ₮` };
      }
      return { label: 'Үндсэн цалингийн', value: `${item.amount} %` };
    });
  }

  const fields = detail.fields;
  if (!fields || Array.isArray(fields)) return undefined;

  if (setting.type === 'attendance' || setting.type === 'remote') {
    const timeLabel = fields.time_unit === 'hour' ? 'Боломжит дээд цаг' : 'Боломжит дээд хоног';
    const timeValue = fields.time_unit === 'hour' ? `${fields.time_value} цаг` : `${fields.time_value} хоног`;
    return [
      setting.type === 'attendance'
        ? { label: 'Амралт чөлөөний төрөл', value: fields.has_salary ? 'Цалинтай' : 'Цалингүй' }
        : { label: 'Цалин бодолтын хувь', value: `${fields.salary_percent} %` },
      { label: timeLabel, value: timeValue },
    ];
  }

  return undefined;
}

// Render a value, dimming any "--:--" placeholder (e.g. an unrecorded clock-out
// in "09:42 - --:--") to match the design.
function renderValue(value: string) {
  return value.split(/(--:--)/g).map((part, i) =>
    part === '--:--' ? (
      <AppText key={i} className="text-sm text-darkerblue/50">{part}</AppText>
    ) : (
      part
    ),
  );
}

/**
 * Label/value list for request-screen headers. A single row renders inline;
 * two or more rows use two auto-sizing columns — the label column hugs its
 * widest label (so the 10px column gap holds at any font scale) and the value
 * column fills the rest, keeping every value aligned to the same edge.
 *
 * `leading-5` is deliberate: the design puts the 14px rows in a 20px line box
 * with a 10px gap, i.e. a 30px row pitch. Without it the rows fall back to
 * Inter's natural ~17px line height and the block reads 3px per row too tight.
 */
export function RequestHeaderInfo({ rows }: { rows: HeaderInfoItem[] }) {
  if (rows.length === 0) return null;

  if (rows.length === 1) {
    return (
      <View className="flex-row gap-2.5">
        <AppText className="text-sm leading-5 text-darkblue" numberOfLines={1}>{rows[0].label}</AppText>
        <AppText className="flex-1 text-sm leading-5 font-medium text-darkerblue" numberOfLines={1}>{renderValue(rows[0].value)}</AppText>
      </View>
    );
  }

  return (
    <View className="flex-row gap-2.5">
      <View className="gap-2.5">
        {rows.map((item, index) => (
          <AppText key={index} className="text-sm leading-5 text-darkblue" numberOfLines={1}>{item.label}</AppText>
        ))}
      </View>
      <View className="flex-1 gap-2.5">
        {rows.map((item, index) => (
          <AppText key={index} className="text-sm leading-5 font-medium text-darkerblue" numberOfLines={1}>{renderValue(item.value)}</AppText>
        ))}
      </View>
    </View>
  );
}
