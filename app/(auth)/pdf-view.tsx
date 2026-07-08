import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";
import { AppHeader } from "@/components/app-header";
import Pdf from "react-native-pdf";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function PdfViewScreen() {
  const { title, url } = useLocalSearchParams<{ title: string; url: string }>();

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <AppHeader backTitle={title || 'Баримт бичиг'} showBack />
        <Pdf
          source={{ uri: url || '' }}
          trustAllCerts={false}
          style={styles.pdf}
        />
      </View>
    </StyledSafeAreaView>
  );
}

const styles = StyleSheet.create({
  pdf: {
    flex: 1,
    marginTop: 8,
  },
});