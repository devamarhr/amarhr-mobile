import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Pdf from "react-native-pdf";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

/**
 * Файлыг өөрсдөө татаад react-native-pdf-д base64 эх сурвалж болгож өгнө.
 *
 * Номын сангийн дотоод татагч (react-native-blob-util-ийн файл руу бичих
 * горим) Android дээр татсан байтыг Content-Length-тэй яг таарахыг шаарддаг
 * бөгөөд таарахгүй үед "Download interrupted." өгдөг. Улмаар index.js доторх
 * .catch() нь шийдэгдсэн promise буцаадаг тул араас нь ирэх .then() дуусаагүй
 * түр файлыг кэш рүү хуулж, "File not in PDF format or corrupted." үүсгэдэг.
 *
 * base64 эх сурвалж өгвөл тэр татагч огт дуудагдахгүй, кэш файл руу шууд бичнэ.
 */
async function fetchAsPdfDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Файлыг уншиж чадсангүй'));
    reader.readAsDataURL(blob);
  });

  // Сервер MIME-ээ octet-stream гэх мэтээр буцаавал react-native-pdf танихгүй.
  return dataUri.replace(/^data:[^;]*;base64,/, 'data:application/pdf;base64,');
}

export default function PdfViewScreen() {
  const { title, url } = useLocalSearchParams<{ title: string; url: string }>();
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setError('Файлын хаяг олдсонгүй');
      return;
    }

    let cancelled = false;
    setDataUri(null);
    setError(null);

    fetchAsPdfDataUri(url)
      .then((uri) => {
        if (!cancelled) setDataUri(uri);
      })
      .catch((e) => {
        console.error('PDF download error:', e);
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  const renderBody = () => {
    if (error) {
      return (
        <View className="flex-1 items-center justify-center px-6">
          <AppText className="text-base text-darkgray text-center">
            Баримт бичгийг нээхэд алдаа гарлаа.
          </AppText>
          <AppText className="text-sm text-darkgray/50 text-center mt-2">{error}</AppText>
        </View>
      );
    }

    if (!dataUri) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#222222" />
        </View>
      );
    }

    return (
      <Pdf
        source={{ uri: dataUri }}
        trustAllCerts={false}
        onError={(e) => {
          console.error('PDF render error:', e);
          setError(e instanceof Error ? e.message : String(e));
        }}
        renderActivityIndicator={() => <ActivityIndicator color="#222222" />}
        style={styles.pdf}
      />
    );
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <AppHeader backTitle={title || 'Баримт бичиг'} showBack />
        {renderBody()}
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
