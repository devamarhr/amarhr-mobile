import { AppHeader } from '@/components/app-header';
import { AppSelect, SelectOption } from '@/components/app-select';
import { AppText } from '@/components/app-text';
import { api } from '@/config/api';
import dayjs from 'dayjs';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { cn } from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

// --- API types (/salary) ---

type PayrollStatus = 'pending' | 'draft' | 'locked';
type PayrollCalculateStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Секц бүрийн detail[] мөр. Талбарууд секцээс хамаарч өөр өөр байдаг тул
 * бүгдийг optional-оор нэг төрөлд нэгтгэв:
 * - remote_work: setting_id, minutes, salary_percent
 * - adjustment_salary | discount: adjustment_setting_id, amount, amount_type, minutes_base
 * - overtime | other_adjustment: adjustment_setting_id, minutes, amount_percent
 */
interface DetailRow {
  setting_id?: number | null;
  adjustment_setting_id?: number | null;
  pay_item_id?: number | null;
  name?: string | null;
  minutes?: number | null;
  minutes_base?: number | null;
  salary_percent?: number | null;
  amount_percent?: number | null;
  amount?: number | null;
  amount_type?: string | null;
  is_attendance?: boolean;
  value?: number | null;
}

interface Section {
  sum?: number | null;
  minutes?: number | null;
  detail?: DetailRow[] | null;
}

interface Deductions {
  ndsh?: number | null;
  hhoat?: number | null;
  advance?: number | null;
  lateness?: {
    minutes?: number | null;
    deductible_minutes?: number | null;
    value_per_minute?: number | null;
    sum?: number | null;
  } | null;
  other?: Section | null;
  total_salary?: Section | null;
  main_salary?: Section | null;
  tax_rebate?: number | null;
  sum?: number | null;
}

interface PayrollDetail {
  period?: { from: string; to: string } | null;
  calculated_at?: string | null;
  time?: {
    planned_minutes?: number | null;
    worked_minutes?: number | null;
    planned_days?: number | null;
    worked_days?: number | null;
    work_days?: number | null;
    annual_leave_days?: number | null;
  } | null;
  contract_salary?: Section | null;
  attendance_portion?: { main_salary?: number | null; sum?: number | null } | null;
  performance_portion?: { rating?: number | null; value?: number | null; sum?: number | null } | null;
  remote_work?: Section | null;
  adjustment_salary?: Section | null;
  overtime?: Section | null;
  other_adjustment?: Section | null;
  discount?: Section | null;
  benefit?: Section | null;
  bonus?: Section | null;
  allowance?: Section | null;
  gross_total?: number | null;
  deductions?: Deductions | null;
  net_amount?: number | null;
  assignments?: { hourly_rate?: number | null }[] | null;
}

interface SalaryRecord {
  id: number;
  year: number;
  month: number;
  net_amount: string | null;
  payroll_status: PayrollStatus;
  payroll_calculate_status: PayrollCalculateStatus | null;
  payroll_detail: PayrollDetail | null;
}

/**
 * months[] нь задаргаа бодогдсон сарууд, дээр нь ЯМАГТ өнөөдрийн сар (бодогдсон
 * эсэхээс үл хамаарч) — шинээс хуучин руу. Тиймээс клиент талд идэвхтэй сарыг
 * нөхөж нэмэх шаардлагагүй.
 */
interface SalaryMonth {
  year: number;
  month: number;
}

interface SalaryResponse {
  year: number;
  month: number;
  months: SalaryMonth[];
  salary: SalaryRecord | null;
}

// --- Formatting helpers ---

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : null;
}

// Intl-ээс хамаарахгүйгээр "5,500,000.00" хэлбэрт хөрвүүлнэ (Hermes-д Intl
// байхгүй build дээр toLocaleString(opts) чимээгүй буруу ажилладаг).
function formatAmount(value: number | string | null | undefined): string {
  const n = toNumber(value) ?? 0;
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}${grouped}.${dec}`;
}

// Хувь/коэффициентийн сүүлийн тэгийг хасна: 85.00 -> "85", 12.50 -> "12.5"
function formatDecimal(value: number): string {
  return String(Number(value.toFixed(2)));
}

function padMonth(month: number): string {
  return String(month).padStart(2, '0');
}

function monthValue(year: number, month: number): string {
  return `${year}-${padMonth(month)}`;
}

// Dropdown жагсаалт: "2026/08". Header trigger нь оноо давтахгүй — "08 сар".
function monthLabel(year: number, month: number): string {
  return `${year}/${padMonth(month)}`;
}

function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Мөрийн баруун талын тайлбар. Секц бүр өөр талбартай тул хэлбэр нь ялгаатай:
 * "176:00 × 100%" (remote_work), "04:00 × 150%" (overtime), "10%" / "Тогтмол дүн"
 * (adjustment_salary, discount, benefit).
 * ⚠ minutes: null нь 0 биш — «хамаарахгүй» гэсэн утгатай тул цагийг огт харуулахгүй.
 */
function detailText(row: DetailRow): string | undefined {
  const timePart = row.minutes != null ? formatMinutes(row.minutes) : null;

  // remote_work — цаг × цалингийн хувь
  if (row.salary_percent != null) {
    const percent = `${formatDecimal(row.salary_percent)}%`;
    return timePart ? `${timePart} × ${percent}` : percent;
  }

  // overtime / other_adjustment — цаг × нэмэгдлийн хувь.
  // ⚠ amount_percent: 0 нь тохиргооноос ургаагүй мөр (ж: «АЦНБ Журмаар тооцох»)
  // бөгөөд дүн нь тэгээс өөр байдаг тул «× 0%» гэж бичвэл төөрөгдүүлнэ.
  if (row.amount_percent != null) {
    if (!row.amount_percent) return timePart ?? undefined;
    const percent = `${formatDecimal(row.amount_percent)}%`;
    return timePart ? `${timePart} × ${percent}` : percent;
  }

  // adjustment_salary / discount / benefit — тогтмол дүн эсвэл хувь.
  // ⚠ minutes_base нь үржигдэхүүн биш, «ирцээр хувааръяглах суурь» тул
  // «цаг × дүн» хэлбэрт оруулахгүй (176:00 × 150,000 = буруу ойлголт).
  if (row.amount_type != null || row.amount != null) {
    // Ирцээр хуваарилагдсан үед мөрийн дүн нь суурь дүнгээсээ зөрдөг учир
    // суурийг нь харуулах нь утгатай; эс бөгөөс баруун талын дүнг давтахгүй.
    if (row.amount_type === 'fixed') {
      return row.is_attendance && row.amount != null
        ? `${formatAmount(row.amount)}, ирцээр`
        : 'Тогтмол дүн';
    }
    if (row.amount != null) {
      const percent = `${formatDecimal(row.amount)}%`;
      return row.is_attendance ? `${percent}, ирцээр` : percent;
    }
  }

  return timePart ?? undefined;
}

/**
 * Нэг ажилтан хэд хэдэн assignment-тай бол дээд түвшний detail[] дотор ижил
 * тохиргооны мөр давхардаж болно — value/minutes-ийг нэмж нэг мөр болгоно.
 */
function mergeDetail(rows: DetailRow[] | null | undefined): DetailRow[] {
  if (!rows?.length) return [];
  const merged: DetailRow[] = [];
  const index = new Map<string, number>();

  rows.forEach((row) => {
    const settingId = row.setting_id ?? row.adjustment_setting_id ?? row.pay_item_id ?? null;
    const key = `${settingId ?? 'none'}|${row.name ?? ''}`;
    const existing = index.get(key);
    if (existing == null) {
      index.set(key, merged.length);
      merged.push({ ...row });
      return;
    }
    const target = merged[existing];
    target.value = (target.value ?? 0) + (row.value ?? 0);
    if (row.minutes != null) target.minutes = (target.minutes ?? 0) + row.minutes;
    if (row.minutes_base != null) target.minutes_base = (target.minutes_base ?? 0) + row.minutes_base;
  });

  return merged;
}

// --- Derived row models ---

interface SalaryLine {
  key: string;
  label: string;
  amount: string;
  detail?: string;
}

interface DeductionLine {
  key: string;
  label: string;
  amount: string;
  negative?: boolean;
}

// detail[] хоосон боловч sum-тай секцийн нийлбэр мөрийн гарчиг.
const SECTION_LABELS: Record<string, string> = {
  remote_work: 'Гадуур/зайнаас ажилласан',
  adjustment_salary: 'Нэмэгдэл цалин',
  overtime: 'Илүү цаг',
  other_adjustment: 'Нэмэгдэл хөлс',
  discount: 'Хөнгөлөлт',
  benefit: 'Тэтгэмж, чөлөө',
};

function buildSalaryLines(detail: PayrollDetail): SalaryLine[] {
  const lines: SalaryLine[] = [];

  // Ирцэд ноогдох цалин — цагийн хөлс зөвхөн нэг assignment-тай үед л
  // хоёрдмол утгагүй тул тэр үед нь "цаг × хөлс" хэлбэрээр харуулна.
  const workedMinutes = detail.time?.worked_minutes ?? null;
  const assignments = detail.assignments ?? [];
  const hourlyRate = assignments.length === 1 ? assignments[0]?.hourly_rate ?? null : null;
  const attendanceDetail =
    workedMinutes != null
      ? hourlyRate != null
        ? `${formatMinutes(workedMinutes)} × ${formatAmount(hourlyRate)}`
        : formatMinutes(workedMinutes)
      : undefined;

  lines.push({
    key: 'attendance',
    label: 'Ирцэд ноогдох цалин',
    amount: formatAmount(detail.attendance_portion?.sum),
    detail: attendanceDetail,
  });

  // rating: null -> ажилтан fixed_performance төрлийн цалингүй
  const rating = detail.performance_portion?.rating ?? null;
  const performanceSum = detail.performance_portion?.sum ?? 0;
  if (rating != null || performanceSum !== 0) {
    lines.push({
      key: 'performance',
      label: 'Гүйцэтгэлийн цалин',
      amount: formatAmount(performanceSum),
      detail: rating != null ? `${formatDecimal(rating * 100)}%` : undefined,
    });
  }

  const sections: { key: string; section: Section | null | undefined }[] = [
    { key: 'remote_work', section: detail.remote_work },
    { key: 'adjustment_salary', section: detail.adjustment_salary },
    { key: 'overtime', section: detail.overtime },
    { key: 'other_adjustment', section: detail.other_adjustment },
    { key: 'discount', section: detail.discount },
    { key: 'benefit', section: detail.benefit },
  ];

  sections.forEach(({ key, section }) => {
    const rows = mergeDetail(section?.detail);
    rows.forEach((row, index) => {
      lines.push({
        key: `${key}-${index}`,
        label: row.name ?? '—',
        amount: formatAmount(row.value),
        detail: detailText(row),
      });
    });

    // Задаргаагүй мөнгө (detail[] хоосон ч sum байгаа) алдагдахгүй байх.
    const sum = section?.sum ?? 0;
    if (!rows.length && sum !== 0) {
      lines.push({ key, label: SECTION_LABELS[key] ?? key, amount: formatAmount(sum) });
    }
  });

  // bonus / allowance — зөвхөн sum, detail[] байхгүй
  const bonus = detail.bonus?.sum ?? 0;
  if (bonus !== 0) {
    lines.push({ key: 'bonus', label: 'Нэмэг/шагн/урамшуулал', amount: formatAmount(bonus) });
  }
  const allowance = detail.allowance?.sum ?? 0;
  if (allowance !== 0) {
    lines.push({ key: 'allowance', label: 'Тэтгэмж', amount: formatAmount(allowance) });
  }

  return lines;
}

function buildDeductionLines(deductions: Deductions | null | undefined): DeductionLine[] {
  if (!deductions) return [];
  const lines: DeductionLine[] = [];

  const ndsh = deductions.ndsh ?? 0;
  if (ndsh !== 0) lines.push({ key: 'ndsh', label: 'НДШ', amount: formatAmount(ndsh) });

  const hhoat = deductions.hhoat ?? 0;
  if (hhoat !== 0) lines.push({ key: 'hhoat', label: 'ХХОАТ', amount: formatAmount(hhoat) });

  const advance = deductions.advance ?? 0;
  if (advance !== 0) {
    lines.push({ key: 'advance', label: 'Урьдчилгаа цалин', amount: formatAmount(advance) });
  }

  const lateness = deductions.lateness;
  if ((lateness?.sum ?? 0) !== 0) {
    lines.push({
      key: 'lateness',
      label: 'Хоцролтын суутгал',
      amount: formatAmount(lateness?.sum),
      negative: true,
    });
  }

  // other / total_salary / main_salary — нэрлэсэн суутгал бүрийг тусад нь мөр
  // болгоно. Задаргаагүй мөртлөө sum-тай секц байвал ерөнхий «Суутгал» мөрөөр
  // харуулж мөнгө алдагдахаас сэргийлнэ.
  const deductionSections: { key: string; section: Section | null | undefined }[] = [
    { key: 'other', section: deductions.other },
    { key: 'total_salary', section: deductions.total_salary },
    { key: 'main_salary', section: deductions.main_salary },
  ];

  deductionSections.forEach(({ key, section }) => {
    const rows = mergeDetail(section?.detail);
    rows.forEach((row, index) => {
      lines.push({
        key: `${key}-${index}`,
        label: row.name ?? 'Суутгал',
        amount: formatAmount(row.value),
        negative: true,
      });
    });

    const sum = section?.sum ?? 0;
    if (!rows.length && sum !== 0) {
      lines.push({ key, label: 'Суутгал', amount: formatAmount(sum), negative: true });
    }
  });

  const rebate = deductions.tax_rebate ?? 0;
  if (rebate !== 0) {
    lines.push({ key: 'tax_rebate', label: 'Татвар тохируулга', amount: formatAmount(rebate) });
  }

  return lines;
}

// --- Sub-components ---

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <AppText numberOfLines={1} className="text-base text-white/80">
        {label}
      </AppText>
      <AppText className="text-base font-medium text-white">{value}</AppText>
    </View>
  );
}

function SalaryRow({ item }: { item: SalaryLine }) {
  // Задаргаагүй мөр (bonus, allowance гэх мэт) — нэр ба дүн нэг мөрөнд.
  // ⚠ Урт нэр дүнг дэлгэцээс шахаж гаргахгүйн тулд нэр нь flex-1-ээр агшиж
  // мөр дамжина; дүн нь үргэлж бүтнээрээ харагдана. items-start учир нь нэр
  // хэдэн ч мөр болсон дүн нь эхний мөртэй нь дээд ирмэгээрээ зэрэгцэнэ.
  if (!item.detail) {
    return (
      <View className="flex-row items-start px-4 py-2.5">
        <AppText className="flex-1 text-sm text-darkgray/50">{item.label}</AppText>
        <AppText className="text-base ml-2">{item.amount}</AppText>
      </View>
    );
  }

  return (
    <View className="px-4 py-2.5">
      <AppText className="text-sm text-darkgray/50">{item.label}</AppText>
      <View className="flex-row items-start">
        <AppText className="flex-1 text-base text-darkgray">{item.detail}</AppText>
        <AppText className="text-base ml-2">{item.amount}</AppText>
      </View>
    </View>
  );
}

function DeductionRow({ item }: { item: DeductionLine }) {
  return (
    <View className="flex-row items-start py-2">
      <AppText className="flex-1 text-base text-darkgray">{item.label}</AppText>
      <AppText className={cn('text-base ml-2', item.negative && 'text-red')}>{item.amount}</AppText>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View className="items-center py-20">
      <AppText className="text-sm text-darkgray">{text}</AppText>
    </View>
  );
}

// --- Screen ---

export default function SalaryScreen() {
  // API нь параметргүй үед өнөөдрийн он/сараар default-лодог. Гэхдээ хариунаас
  // period-оо тавибал fetch дахин асч давхар хүсэлт явдаг тул эхнээс нь
  // локалиар өнөөдрийн он/сарыг сонгож өгнө — үр дүн ижил.
  const [period, setPeriod] = useState(() => {
    const now = dayjs();
    return { year: now.year(), month: now.month() + 1 };
  });
  const [months, setMonths] = useState<SalaryMonth[]>([]);
  const [salary, setSalary] = useState<SalaryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [])
  );

  const fetchData = useCallback(async () => {
    try {
      const res = await api<SalaryResponse>({
        path: `/salary?year=${period.year}&month=${period.month}`,
      });
      if (res.status === 200 && res.data && typeof res.data === 'object') {
        setMonths(Array.isArray(res.data.months) ? res.data.months : []);
        setSalary(res.data.salary ?? null);
      } else {
        setSalary(null);
      }
    } catch (err) {
      console.error(err);
      setSalary(null);
    }
  }, [period]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchData().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  // Tab руу буцаж ирэхэд чимээгүй сэргээнэ. Дээрх effect нь mount болон сар
  // солих үеийг spinner-тэйгээр аль хэдийн барьдаг тул эхний focus-ыг алгасна.
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;
  const skipFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      fetchDataRef.current();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const periodValue = monthValue(period.year, period.month);

  const monthOptions: SelectOption[] = useMemo(
    () =>
      months.map((m) => ({
        value: monthValue(m.year, m.month),
        label: monthLabel(m.year, m.month),
        year: m.year,
        month: m.month,
      })),
    [months]
  );

  const selectedMonth = useMemo(
    () => monthOptions.find((o) => o.value === periodValue) ?? monthOptions[0],
    [monthOptions, periodValue]
  );

  const detail = salary?.payroll_detail ?? null;

  const salaryLines = useMemo(() => (detail ? buildSalaryLines(detail) : []), [detail]);
  const deductionLines = useMemo(() => buildDeductionLines(detail?.deductions), [detail]);

  // Задаргаа байхгүй үед бичлэгийн net_amount нь "0.00" (тооцоо хийгдээгүйн
  // орлуулга) байдаг тул түүнийг харуулбал «цалин тэг» мэт ойлгогдоно — хоёуланг
  // нь зөвхөн задаргаанаас авч, эс бөгөөс «—».
  const grossTotal = detail ? formatAmount(detail.gross_total) : '—';
  const netAmount = detail ? formatAmount(detail.net_amount) : '—';

  return (
    <View className="flex-1 bg-darkgreen">
      <StyledSafeAreaView className="flex-1" edges={['top']}>
        <AppHeader
          title="Цалин тооцоолол"
          className="px-4 mb-3"
          titleClassName="text-white/80"
          rightContent={
            <AppSelect
              title="Цалингийн задаргаа"
              options={monthOptions}
              value={selectedMonth}
              onValueChange={(opt) => {
                if (!opt) return;
                setPeriod({ year: Number(opt.year), month: Number(opt.month) });
              }}
              trigger={
                <AppText className="text-xl font-medium text-white">
                  {padMonth(period.month)} сар
                </AppText>
              }
              triggerClassName="bg-transparent p-0 min-h-0"
            />
          }
        />

        <View className="px-4 pb-4 gap-2.5">
          <SummaryRow label="Нийт цалин" value={grossTotal} />
          <SummaryRow label="Гарт олгох" value={netAmount} />
        </View>

        <View className="flex-1 bg-background">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator />
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {!detail ? (
                // Бичлэг байхгүй, задаргаа бодогдоогүй, months хоосон, хүсэлт
                // бүтэлгүйтсэн — бүгдэд нэг л текст.
                <EmptyState text="Цалин бодогдоогүй байна" />
              ) : (
                <View className="pt-2.5 pb-28">
                  {salaryLines.map((item) => (
                    <SalaryRow key={item.key} item={item} />
                  ))}

                  {deductionLines.length > 0 && (
                    <>
                      <View className="h-px bg-darkgreen mx-4 my-5" />

                      <View className="px-4">
                        {deductionLines.map((item) => (
                          <DeductionRow key={item.key} item={item} />
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </StyledSafeAreaView>
    </View>
  );
}
