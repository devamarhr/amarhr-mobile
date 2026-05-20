import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface PickedAsset {
  uri: string;
  name: string;
}

async function pickPhotos(): Promise<PickedAsset[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Зөвшөөрөл хэрэгтэй', 'Зураг сонгохын тулд зөвшөөрөл өгнө үү');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({
    uri: a.uri,
    name: a.fileName ?? `image_${Date.now()}.jpg`,
  }));
}

async function pickDocuments(): Promise<PickedAsset[]> {
  const result = await DocumentPicker.getDocumentAsync({ multiple: true });
  if (result.canceled) return [];
  return result.assets.map((a) => ({ uri: a.uri, name: a.name }));
}

export function pickAttachments(): Promise<PickedAsset[]> {
  return new Promise((resolve) => {
    const choose = async (index: number) => {
      if (index === 1) resolve(await pickPhotos());
      else if (index === 2) resolve(await pickDocuments());
      else resolve([]);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Цуцлах', 'Зураг сонгох', 'Файл сонгох'],
          cancelButtonIndex: 0,
        },
        choose,
      );
    } else {
      Alert.alert('Хавсралт сонгох', undefined, [
        { text: 'Цуцлах', style: 'cancel', onPress: () => choose(0) },
        { text: 'Зураг сонгох', onPress: () => choose(1) },
        { text: 'Файл сонгох', onPress: () => choose(2) },
      ]);
    }
  });
}
