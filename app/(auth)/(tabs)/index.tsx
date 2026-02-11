import { Text, ScrollView, View } from 'react-native';
import { useRouter } from "expo-router";
import {
  Button,
} from "heroui-native";
import { ScreenScrollView } from "@/components/screen-scroll-view";
import { useAuthStore } from '@/store/auth-store';

export default function HomeScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <ScreenScrollView>
      <View className="gap-y-2">
        <Text>Home</Text>
        <Text className="text-xl text-red-400">Red text</Text>
        <Button onPress={handleLogout}>
          <Button.Label>Logout</Button.Label>
        </Button>
        <Button onPress={() => router.push("/components")}>
          <Button.Label>Go to components</Button.Label>
        </Button>
      </View>
    </ScreenScrollView>
  );
}