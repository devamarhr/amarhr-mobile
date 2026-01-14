import { View, Text, Button } from 'react-native';
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View style={{
      paddingTop: 40,
    }}>
      <Text>Login</Text>
      <Button title="go to home" onPress={() => router.push("/(auth)/(tabs)")} />
    </View>
  );
}