import { Platform } from "react-native";

const PROD_API_URL = 'https://v3-api.amarhr.mn/mobile';
const BASE_DEV_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
const DEV_API_URL = `${BASE_DEV_URL}/mobile`;

export const Config = {
  API_URL: __DEV__ ? DEV_API_URL : PROD_API_URL,
  IS_DEV: __DEV__,
} as const;