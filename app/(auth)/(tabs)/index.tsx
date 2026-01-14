import { View, Text, Button } from 'react-native';
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={{
      paddingTop: 40,
    }}>
      <Text className="text-xl text-red-400">Home</Text>
      <Button title="go to login" onPress={() => router.push("/login")} />
    </View>
  );
}