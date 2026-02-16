import { View, Text } from 'react-native';
import { ScreenScrollView } from "@/components/screen-scroll-view";
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import { AppButton } from "@/components/app-button";
import { useAuthStore } from "@/store/auth-store";
import { router } from "expo-router";
import { AppHeader } from "@/components/app-header";
import React from "react";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function TimesheetScreen() {

  const { toggleSupervisor } = useAuthStore();
  const isSupervisor = useAuthStore((state) => state.isSupervisor);

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <AppHeader title="05 сар" />
      </View>
    </StyledSafeAreaView>
  );
}