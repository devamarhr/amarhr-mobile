import { View, ScrollView } from 'react-native';
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import { AppHeader } from "@/components/app-header";
import React, { useEffect, useState } from "react";
import { cn } from "heroui-native";
import { api } from "@/config/api";

interface WorkInfo {
  department: string | null;
  jobPosition: string | null;
  employeeCode: string | null;
  occCode: { id: number; name: string; code: string } | null;
  workCondition: string | null;
  medicalExamination: number | null;
  branch: { id: number; name: string };
  isTimeTracking: boolean;
  rosterTemplate: string | null;
  isLateDeduction: boolean;
}

const StyledSafeAreaView = withUniwind(SafeAreaView);

function InfoField({ label, value, className }: { label: string; value?: string | null; className?: string | null  }) {
  return (
    <View className={cn('mb-4', className)}>
      <AppText className="text-sm text-darkgray">{label}</AppText>
      <AppText className="text-sm mt-1">{value || '-'}</AppText>
    </View>
  );
}

export default function WorkInfoScreen() {
  const [workInfo, setWorkInfo] = useState<WorkInfo | null>(null);

  useEffect(() => {
    api<WorkInfo>({
      path: '/profile/work-info',
      method: 'GET',
    }).then((res) => {
      if (res.status === 200) {
        setWorkInfo(res.data);
      }
    }).catch(console.error);
  }, []);

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1">
        <AppHeader backTitle="Ажлын байрны мэдээлэл" showBack className="px-4" />
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4">
            <InfoField label="Алба, хэлтэс" value={workInfo?.department} />
            <InfoField label="Албан тушаал" value={workInfo?.jobPosition} />
            <InfoField label="Ажилтны код / ID" value={workInfo?.employeeCode} />
            <InfoField label="Ажил мэргэжлийн код" value={workInfo?.occCode ? `${workInfo.occCode.code}-${workInfo.occCode.name}` : null} />
            <InfoField label="Ажлын нөхцөл" value={workInfo?.workCondition === 'standard' ? 'Хэвийн' : workInfo?.workCondition === 'non-standard' ? 'Хэвийн бус' : workInfo?.workCondition} />
            <InfoField label="Эрүүл мэндийн үзлэг" value={workInfo?.medicalExamination ? `Хамрагдана / ${workInfo.medicalExamination} сарын давтамжтай` : 'Хамрагдахгүй'} />
            <InfoField label="Үндсэн салбар" value={workInfo?.branch?.name || null} className="mb-0" />
          </View>

          <View className="bg-lightblue px-4 py-2 my-6">
            <AppText className="text-sm text-darkblue text-right">Цагийн хуваарь</AppText>
          </View>

          <View className="px-4">
            <InfoField label="Ажилтны цагийг" value={workInfo?.isTimeTracking ? 'Бүртгэнэ' : 'Бүртгэхгүй'} />
            <InfoField label="Цагийн хуваарийн нэр" value={workInfo?.rosterTemplate} />
            <InfoField label="Хоцорсон минутын суутгал" value={workInfo?.isLateDeduction ? 'Суутгана' : 'Суутгахгүй'} className="mb-0" />
          </View>
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}