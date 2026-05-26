import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface PickedAsset {
  uri: string;
  name: string;
}

const POPULAR_IMAGE_EXT = /\.(jpe?g|png|gif)($|\?)/i;
const POPULAR_IMAGE_MIME = /^image\/(jpeg|png|gif)$/i;
const ANY_IMAGE_MIME = /^image\//i;
const NON_POPULAR_IMAGE_EXT = /\.(heic|heif|webp|bmp|tiff?|avif)($|\?)/i;

async function maybeConvertImage(
  uri: string,
  name: string,
  mimeType?: string,
): Promise<PickedAsset> {
  const isPopular =
    (mimeType && POPULAR_IMAGE_MIME.test(mimeType)) ||
    POPULAR_IMAGE_EXT.test(name) ||
    POPULAR_IMAGE_EXT.test(uri);
  if (isPopular) return { uri, name };

  const isImage =
    (mimeType && ANY_IMAGE_MIME.test(mimeType)) ||
    NON_POPULAR_IMAGE_EXT.test(name) ||
    NON_POPULAR_IMAGE_EXT.test(uri);
  if (!isImage) return { uri, name };

  try {
    const ref = await ImageManipulator.manipulate(uri).renderAsync();
    const result = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    const base = name.replace(/\.[^./\\]+$/, '');
    return { uri: result.uri, name: `${base}.jpg` };
  } catch (e) {
    console.warn('Image conversion to JPEG failed, using original:', e);
    return { uri, name };
  }
}

export async function pickPhotos(): Promise<PickedAsset[]> {
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
  return Promise.all(
    result.assets.map((a) =>
      maybeConvertImage(a.uri, a.fileName ?? `image_${Date.now()}.jpg`, a.mimeType),
    ),
  );
}

export async function pickDocuments(): Promise<PickedAsset[]> {
  const result = await DocumentPicker.getDocumentAsync({ multiple: true });
  if (result.canceled) return [];
  return Promise.all(
    result.assets.map((a) => maybeConvertImage(a.uri, a.name, a.mimeType)),
  );
}

type Resolver = (assets: PickedAsset[]) => void;
type Requester = (resolve: Resolver) => void;

let activeRequester: Requester | null = null;

export function registerAttachmentPickerHost(requester: Requester | null) {
  activeRequester = requester;
}

export function pickAttachments(): Promise<PickedAsset[]> {
  return new Promise((resolve) => {
    if (!activeRequester) {
      console.warn('AttachmentPickerHost not mounted; pickAttachments() returning []');
      resolve([]);
      return;
    }
    activeRequester(resolve);
  });
}
