import { AppThemeProvider } from "@/contexts/app-theme-context";
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { HeroUINativeConfig } from 'heroui-native';
import { HeroUINativeProvider } from 'heroui-native';
import { useCallback } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardAvoidingView, KeyboardProvider } from "react-native-keyboard-controller";
import '../config/dayjs';
import '../global.css';

const textProps: HeroUINativeConfig['textProps'] = {
  minimumFontScale: 0.5,
  maxFontSizeMultiplier: 1.2,
};

function AppContent() {
  const contentWrapper = useCallback(
    (children: React.ReactNode) => (
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior="padding"
        keyboardVerticalOffset={12}
        className="flex-1"
      >
        {children}
      </KeyboardAvoidingView>
    ),
    []
  );

  return (
    <AppThemeProvider>
      <HeroUINativeProvider
        config={{
          toast: {
            contentWrapper,
          },
          devInfo: {
            stylingPrinciples: false,
          },
        }}
      >
        <Slot />
      </HeroUINativeProvider>
    </AppThemeProvider>
  );
}

export default function RootLayout() {
  const fonts = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fonts) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardProvider>
        <AppContent />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
