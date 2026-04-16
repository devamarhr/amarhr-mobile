import { Stack, Redirect } from 'expo-router';
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
        <Stack.Screen name="profile" />
        <Stack.Screen name="personal-info/index" />
        <Stack.Screen name="personal-info/edit" />
        <Stack.Screen name="workplace-info" />
        <Stack.Screen name="contract-info" />
        <Stack.Screen name="contract-files" />
        <Stack.Screen name="contact" />
        <Stack.Screen name="pdf-view" />
        <Stack.Screen name="request/create" />
        <Stack.Screen name="request/[id]" />
        <Stack.Screen name="attendance-map" />
      </Stack>
    </View>
  );
}
