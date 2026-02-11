import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  phoneNumber: string | null;
  isAuthenticated: boolean;
  userName: string | null;
  hasCompletedOnboarding: boolean;

  // Onboarding data
  lastName: string | null;
  firstName: string | null;
  gender: 'male' | 'female' | null;
  nationality: string | null;
  familyName: string | null;

  // Actions
  setToken: (token: string, phoneNumber: string) => void;
  completeOnboarding: (data: {
    lastName: string;
    firstName: string;
    gender: 'male' | 'female';
    nationality: string;
    familyName: string;
  }) => void;
  logout: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      phoneNumber: null,
      isAuthenticated: false,
      userName: null,
      hasCompletedOnboarding: false,
      lastName: null,
      firstName: null,
      gender: null,
      nationality: null,
      familyName: null,

      setToken: (token: string, phoneNumber: string) => {
        set({ token, phoneNumber, isAuthenticated: true });
      },

      completeOnboarding: (data) => {
        set({
          lastName: data.lastName,
          firstName: data.firstName,
          gender: data.gender,
          nationality: data.nationality,
          familyName: data.familyName,
          userName: `${data.firstName} ${data.lastName}`,
          hasCompletedOnboarding: true,
        });
      },

      logout: () => {
        set({
          token: null,
          phoneNumber: null,
          isAuthenticated: false,
          userName: null,
          hasCompletedOnboarding: false,
          lastName: null,
          firstName: null,
          gender: null,
          nationality: null,
          familyName: null,
        });
      },

      clearAuth: () => {
        set({
          token: null,
          phoneNumber: null,
          isAuthenticated: false,
          userName: null,
          hasCompletedOnboarding: false,
          lastName: null,
          firstName: null,
          gender: null,
          nationality: null,
          familyName: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);