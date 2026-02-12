import { View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";
import { AppText } from "@/components/app-text";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft02Icon } from "@hugeicons-pro/core-stroke-standard";
import { WebView } from "react-native-webview";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function PdfViewScreen() {
  const router = useRouter();
  const { title, url } = useLocalSearchParams<{ title: string; url: string }>();

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <View className="flex-row items-center gap-2 mb-5">
          <Pressable onPress={() => router.back()}>
            <HugeiconsIcon icon={ArrowLeft02Icon} color="#222222" size={24} />
          </Pressable>
          <AppText className="text-xl font-medium">{title || 'Баримт бичиг'}</AppText>
        </View>
        <WebView
          source={{ uri: url || '' }}
          className="flex-1 mt-2"
        />
      </View>
    </StyledSafeAreaView>
  );
}