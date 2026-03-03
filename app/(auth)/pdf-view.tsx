import { View } from 'react-native';
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";
import { AppHeader } from "@/components/app-header";
import { WebView } from "react-native-webview";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function PdfViewScreen() {
  const { title, url } = useLocalSearchParams<{ title: string; url: string }>();

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-4">
        <AppHeader backTitle={title || 'Баримт бичиг'} showBack />
        <WebView
          source={{ uri: url || '' }}
          className="flex-1 mt-2"
        />
      </View>
    </StyledSafeAreaView>
  );
}