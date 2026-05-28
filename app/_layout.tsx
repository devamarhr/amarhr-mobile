import { AttachmentPickerHost } from "@/components/attachment-picker-host";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import type { HeroUINativeConfig } from 'heroui-native';
import { HeroUINativeProvider } from 'heroui-native';
import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardAvoidingView, KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
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
        <AttachmentPickerHost />
      </HeroUINativeProvider>
    </AppThemeProvider>
  );
}

function useUpdateGate() {
  const [isReady, setIsReady] = useState(!Updates.isEnabled);

  useEffect(() => {
    if (!Updates.isEnabled) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (cancelled) return;

        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          if (cancelled) return;
          await Updates.reloadAsync();
          return;
        }
      } catch {
        // Fall through and let the app start even if the check fails.
      }

      if (!cancelled) {
        setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return isReady;
}

export default function RootLayout() {
  const fonts = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const isUpdateReady = useUpdateGate();

  if (!fonts || !isUpdateReady) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.loader}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.loaderText}>Шинэчилж байна...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <KeyboardProvider>
          <AppContent />
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 200,
    height: 50,
    marginBottom: 16,
  },
  loaderText: {
    fontSize: 15,
    color: '#1a1a1a',
  },
});
