import { View, Text } from 'react-native';
import { ScreenScrollView } from "@/components/screen-scroll-view";
import { AppHeader } from "@/components/app-header";
import React from "react";
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function SupervisorScreen() {
  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <AppHeader title="Supervisor" />
      </View>
    </StyledSafeAreaView>
  );
}