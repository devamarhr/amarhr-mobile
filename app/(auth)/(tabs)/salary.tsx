import { View, ScrollView } from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';
import { AppText } from '@/components/app-text';
import { AppHeader } from '@/components/app-header';
import { AppSelect, SelectOption } from '@/components/app-select';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

const StyledSafeAreaView = withUniwind(SafeAreaView);

const MONTH_OPTIONS: SelectOption[] = [
  { value: '05', label: '05 сар' },
  { value: '04', label: '04 сар' },
  { value: '03', label: '03 сар' },
  { value: '02', label: '02 сар' },
  { value: '01', label: '01 сар' },
];

interface SalaryLine {
  label: string;
  amount: string;
  detail?: string;
}

const SALARY_ITEMS: SalaryLine[] = [
  { label: 'Ирцэд ноогдох цалин', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Гүйцэтгэлийн цалин', amount: '5,500,000.00', detail: '100 %' },
  { label: 'Гадуур ажилласан', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Зайнаас ажилласан', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Сургалт', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Томилолт', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Шинээр нэмсэн', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Нэмэгдэл цалин 1', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Нэмэгдэл цалин 2', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Нэмэгдэл цалин 3', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'АЦНБЖурмаар тооцох', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Энгийн илүү цаг', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Шөнийн илүү цаг', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Баярын илүү цаг', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Нэмэгдэл хөлс 1', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Нэмэгдэл хөлс 2', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Нэмэгдэл хөлс 3', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Хөнгөлөлт 1', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Хөнгөлөлт 2', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Хөнгөлөлт 3', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Ээлжийн амралт', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Нөхөн амралт', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Цалинтай чөлөө 1', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Цалинтай чөлөө 2', amount: '5,500,000.00', detail: '168:00 × 32,453.00' },
  { label: 'Нэмэг/шагн/урамшуулал', amount: '5,500,000.00' },
  { label: 'Тэтгэмж', amount: '5,500,000.00' },
];

const DEDUCTION_ITEMS: SalaryLine[] = [
  { label: 'НДШ', amount: '5,500,000.00' },
  { label: 'ХХОАТ', amount: '5,500,000.00' },
  { label: 'Урьдчилгаа цалин', amount: '5,500,000.00' },
  { label: 'Хооролтын суутгал', amount: '5,500,000.00' },
  { label: 'Суутгал', amount: '5,500,000.00' },
  { label: 'Т/хөнгөлөлтийн тэгшитгэл', amount: '5,500,000.00' },
];

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center">
      <AppText numberOfLines={1} className="text-sm text-white/70 w-24">
        {label}
      </AppText>
      <AppText className="text-base font-semibold text-white">{value}</AppText>
    </View>
  );
}

function SalaryRow({ item }: { item: SalaryLine }) {
  return (
    <View className="px-4 py-2.5">
      <AppText className="text-sm text-darkgray">{item.label}</AppText>
      <View className="flex-row items-center justify-between mt-0.5">
        <AppText className="text-base font-medium">{item.amount}</AppText>
        {item.detail && (
          <AppText className="text-sm text-darkgray">{item.detail}</AppText>
        )}
      </View>
    </View>
  );
}

export default function SalaryScreen() {
  const [selectedMonth, setSelectedMonth] = useState<SelectOption>(MONTH_OPTIONS[0]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [])
  );

  return (
    <View className="flex-1 bg-darkgreen">
      <StyledSafeAreaView className="flex-1" edges={['top']}>
        <AppHeader
          title="Цалин тооцоолол"
          className="px-4 mb-3"
          titleClassName="text-white"
          rightContent={
            <AppSelect
              title="Цалингийн задаргаа"
              options={MONTH_OPTIONS}
              value={selectedMonth}
              onValueChange={(opt) => opt && setSelectedMonth(opt)}
              trigger={
                <AppText className="text-xl font-medium text-white">{selectedMonth.label}</AppText>
              }
              triggerClassName="bg-transparent p-0 min-h-0"
            />
          }
        />

        <View className="px-4 pb-4 gap-1.5">
          <SummaryRow label="Нийт цалин" value="5,500,000.00" />
          <SummaryRow label="Гарт олгох" value="5,500,000.00" />
        </View>

        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
          <View className="pt-2.5 pb-28">
            {SALARY_ITEMS.map((item, index) => (
              <SalaryRow key={`earning-${index}`} item={item} />
            ))}

            <View className="h-4" />

            {DEDUCTION_ITEMS.map((item, index) => (
              <SalaryRow key={`deduction-${index}`} item={item} />
            ))}
          </View>
        </ScrollView>
      </StyledSafeAreaView>
    </View>
  );
}
