import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { api } from "@/config/api";
import { cn } from "heroui-native";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

interface SalarySetting {
  type: string;
  main_salary: number;
  advance_type: string;
  advance_value: number;
  performance_type: string;
  performance_value: number;
}

interface AdjustmentDetail {
  amount: number;
  amount_type: 'percent' | 'fixed';
  is_attendance: boolean;
  calculate_type: string;
  start_year?: number;
  end_year?: number;
}

interface Adjustment {
  id: number;
  name: string;
  type: string;
  category: string;
  detail: AdjustmentDetail[];
}

interface ContractInfo {
  isPermanent: boolean;
  startDate: string | null;
  endDate: string | null;
  type: string | null;
  contractNumber: string | null;
  insuranceType: string | null;
  totalWorkMonths: number | null;
  currentCompanyMonths: number | null;
  salarySetting: SalarySetting | null;
  adjustments: Adjustment[];
}

const salaryTypeLabels: Record<string, string> = {
  fixed: 'Тогтмол',
  fixed_performance: 'Тогтмол + Гүйцэтгэл',
  hourly: 'Цагаар',
  piece: 'Гараагаар',
};

const advanceTypeLabels: Record<string, string> = {
  attendance_percent: 'Ирцэд ноогдох цалингийн хувиар',
  main_percent: 'Үндсэн цалингийн хувиар',
  fixed: 'Тогтмол',
};

function formatCurrency(value: number) {
  return `${value.toLocaleString()} ₮`;
}

const StyledSafeAreaView = withUniwind(SafeAreaView);

function InfoField({ label, value, className, valueClassName }: { label: string; value?: string | null; className?: string | null; valueClassName?: string }) {
  return (
    <View className={cn('mb-5', className)}>
      <AppText className="text-sm text-darkgray/50">{label}</AppText>
      <AppText className={cn('text-base', valueClassName)}>{value || '-'}</AppText>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="bg-lightblue px-4 py-2 my-[30px]">
      <AppText className="text-sm text-darkblue text-right">{title}</AppText>
    </View>
  );
}

export default function ContractInfoScreen() {
  const insets = useSafeAreaInsets();
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);

  useEffect(() => {
    api<ContractInfo>({
      path: '/profile/contract-info',
      method: 'GET',
    }).then((res) => {
      if (res.status === 200) {
        setContractInfo(res.data);
      }
    }).catch(console.error);
  }, []);

  const salary = contractInfo?.salarySetting;
  const adjustments = contractInfo?.adjustments ?? [];

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <AppHeader backTitle="Гэрээ & Цалин" showBack className="px-4" />
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        >
          <View className="px-4">
            <InfoField label="Хөдөлмөрийн гэрээ" value={contractInfo?.isPermanent ? 'Хугацаагүй' : 'Хугацаатай'} />
            <InfoField
              label={contractInfo?.isPermanent ? 'Гэрээ эхэлсэн огноо' : 'Гэрээ эхэлсэн/дуусах огноо'}
              value={contractInfo?.isPermanent
                ? contractInfo?.startDate
                : (contractInfo?.startDate && contractInfo?.endDate ? `${contractInfo.startDate} - ${contractInfo.endDate}` : null)}
            />
            <InfoField label="Гэрээний төрөл" value={contractInfo?.type} />
            <InfoField label="Гэрээний дугаар" value={contractInfo?.contractNumber} />
            <InfoField label="НДШ тайлагнах төрөл" value={contractInfo?.insuranceType} />
            <InfoField label="НДШ төлсөн сар / Нийт ажилласан жилийн" value={contractInfo?.totalWorkMonths ? `${contractInfo.totalWorkMonths} сар` : null} />
            <InfoField label="НДШ төлсөн сар / Одоогийн байгууллага дээр" value={contractInfo?.currentCompanyMonths ? `${contractInfo.currentCompanyMonths} сар` : null} className="mb-0" />
          </View>

          <SectionHeader title="Цалин олговрын мэдээлэл" />

          <View className="px-4">
            <InfoField label="Үндсэн цалингийн төрөл" value={salary?.type ? (salaryTypeLabels[salary.type] || salary.type) : null} />
            <InfoField
              label={salary?.type === 'hourly' ? 'Цагийн цалин' : salary?.type === 'piece' ? 'Гарааны цалин' : 'Үндсэн цалин'}
              value={salary?.main_salary ? formatCurrency(salary.main_salary) : null}
            />
            {salary?.type === 'fixed_performance' && (
              <InfoField
                label="Гүйцэтгэл"
                value={salary?.performance_value != null
                  ? `${salary.performance_value.toLocaleString()}${salary.performance_type === 'fixed' ? '₮' : '%'}`
                  : null}
              />
            )}
            <InfoField label="Урьдчилгаа цалин тооцох суурь" value={salary?.advance_type ? (advanceTypeLabels[salary.advance_type] || salary.advance_type) : null} />
            <InfoField
              label="Урьдчилгаа цалин"
              value={salary?.advance_value != null
                ? `${salary.advance_value.toLocaleString()}${salary.advance_type === 'fixed' ? '₮' : '%'}`
                : null}
              className="mb-0"
            />
          </View>

          <SectionHeader title="Нэмэгдэл олговрын мэдээлэл" />

          <View className="px-4">
            {adjustments.map((adj) => (
              <View key={adj.id} className="mb-5">
                <AppText className="text-sm text-darkgray">{adj.name}</AppText>
                {adj.detail.map((d, di) => (
                  <AppText key={di} className="text-base mt-1">
                    {d.amount_type === 'fixed' ? `${d.amount.toLocaleString()} ₮` : `${d.amount} %`}
                    {adj.category === 'yearly' && d.start_year != null && d.end_year != null
                      ? ` / ${d.start_year}-${d.end_year} жилийн хооронд`
                      : ''}
                  </AppText>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}