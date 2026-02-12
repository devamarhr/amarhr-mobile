import { Stack, Redirect } from 'expo-router';
import 'react-native-reanimated';
import { View } from "react-native";
import { useAuthStore } from '@/store/auth-store';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((state) => state.hasCompletedOnboarding);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // Redirect to onboarding if not completed
  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <View className="flex-1 bg-background">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}
