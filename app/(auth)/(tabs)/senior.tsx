import { AppButton } from "@/components/app-button";
import { AppHeader } from "@/components/app-header";
import { useAuthStore } from "@/store/auth-store";
import { router } from "expo-router";
import React from "react";
import { View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function SeniorScreen() {
  const isSenior = useAuthStore((state) => state.isSenior);

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <AppHeader title="Senior" />
        <View className="gap-4">
          <AppButton
            label="Toggle senior"
            onPress={() => {}}
          />
          <AppButton
            label="Go to component"
            onPress={() => router.navigate('/components')}
          />
          <AppButton
            label="Work hour correction"
            onPress={() => router.navigate({
              pathname: '/request/create',
              params: {
                title: 'Цаг засах  05/16',
                type: 'timeCorrection',
                headerInfo: JSON.stringify([{ label: 'Ирсэн, тарсан цаг', value: '09:42 - 17:39' }])
              },
            })}
          />
          <AppButton
            label="Switch attendance type"
            onPress={() => {}}
          />
        </View>
      </View>
    </StyledSafeAreaView>
  );
}