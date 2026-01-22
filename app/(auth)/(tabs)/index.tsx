import { Text, ScrollView, View } from 'react-native';
import { useRouter } from "expo-router";
import {
  Button,
} from "heroui-native";
import { ScreenScrollView } from "@/components/screen-scroll-view";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScreenScrollView>
      <View className="gap-y-2">
        <Text>Home</Text>
        <Text className="text-xl text-red-400">Red text</Text>
        <Button onPress={() => router.push("/login")}>
          <Button.Label>Go to login</Button.Label>
        </Button>
        <Button onPress={() => router.push("/components")}>
          <Button.Label>Go to components</Button.Label>
        </Button>
      </View>
    </ScreenScrollView>
  );
}