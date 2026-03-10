import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Child = {
  gender: 'female' | 'male';
  birthDate: string;
};

export interface ProfileFormData {
  lastName: string;
  firstName: string;
  gender: 'male' | 'female';
  nationality: string;
  familyName: string;
  registerNumber: string;
  email: string;
  emergencyContact: string;
  emergencyRelationship: string;
  aimag: string;
  soum: string;
  street: string;
  children: Child[];
  bankAccount: string;
  bank: string;
  profileImage?: string;
}

interface AuthState {
  token: string | null;
  phoneNumber: string | null;
  isAuthenticated: boolean;
  userName: string | null;
  hasCompletedOnboarding: boolean;
  isSupervisor: boolean;
  companyName: string | null;
  attendanceType: 'wifi' | 'location' | null;

  // Onboarding data
  lastName: string | null;
  firstName: string | null;
  gender: 'male' | 'female' | null;
  nationality: string | null;
  familyName: string | null;
  registerNumber: string | null;
  email: string | null;
  emergencyContact: string | null;
  emergencyRelationship: string | null;
  aimag: string | null;
  soum: string | null;
  street: string | null;
  children: Child[];
  bankAccount: string | null;
  bank: string | null;
  profileImage: string | null;

  // Actions
  setToken: (token: string, phoneNumber: string) => void;
  setAttendanceType: (type: 'wifi' | 'location') => void;
  completeOnboarding: (data: ProfileFormData) => void;
  logout: () => void;
  clearAuth: () => void;
  toggleSupervisor: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      phoneNumber: null,
      isAuthenticated: false,
      userName: null,
      hasCompletedOnboarding: false,
      isSupervisor: false,
      companyName: null,
      attendanceType: null,
      lastName: null,
      firstName: null,
      gender: null,
      nationality: null,
      familyName: null,
      registerNumber: null,
      email: null,
      emergencyContact: null,
      emergencyRelationship: null,
      aimag: null,
      soum: null,
      street: null,
      children: [],
      bankAccount: null,
      bank: null,
      profileImage: null,

      setToken: (token: string, phoneNumber: string) => {
        set({ token, phoneNumber, isAuthenticated: true });
      },

      setAttendanceType: (type: 'wifi' | 'location') => {
        set({ attendanceType: type });
      },

      completeOnboarding: (data) => {
        set({
          lastName: data.lastName,
          firstName: data.firstName,
          gender: data.gender,
          nationality: data.nationality,
          familyName: data.familyName,
          registerNumber: data.registerNumber,
          email: data.email,
          emergencyContact: data.emergencyContact,
          emergencyRelationship: data.emergencyRelationship,
          aimag: data.aimag,
          soum: data.soum,
          street: data.street,
          children: data.children,
          bankAccount: data.bankAccount,
          bank: data.bank,
          profileImage: data.profileImage ?? null,
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
          isSupervisor: false,
          companyName: null,
          attendanceType: null,
          lastName: null,
          firstName: null,
          gender: null,
          nationality: null,
          familyName: null,
          registerNumber: null,
          email: null,
          emergencyContact: null,
          emergencyRelationship: null,
          aimag: null,
          soum: null,
          street: null,
          children: [],
          bankAccount: null,
          bank: null,
          profileImage: null,
        });
      },

      clearAuth: () => {
        set({
          token: null,
          phoneNumber: null,
          isAuthenticated: false,
          userName: null,
          hasCompletedOnboarding: false,
          isSupervisor: false,
          companyName: null,
          attendanceType: null,
          lastName: null,
          firstName: null,
          gender: null,
          nationality: null,
          familyName: null,
          registerNumber: null,
          email: null,
          emergencyContact: null,
          emergencyRelationship: null,
          aimag: null,
          soum: null,
          street: null,
          children: [],
          bankAccount: null,
          bank: null,
          profileImage: null,
        });
      },
      toggleSupervisor: () => {
        set((state) => ({ isSupervisor: !state.isSupervisor }));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);