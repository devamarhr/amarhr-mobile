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

export interface ProfileData {
  hasCompletedOnboarding: boolean;
  isSupervisor: boolean;
  companyName: string | null;
  attendanceType: 'wifi' | 'location';

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
}

interface AuthState {
  token: string | null;
  phone: string | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isSupervisor: boolean;
  companyName: string | null;
  attendanceType: 'wifi' | 'location';

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
  setToken: (token: string, phone: string) => void;
  setInitialData: (data: ProfileData) => void;
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
      phone: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      isSupervisor: false,
      companyName: null,
      attendanceType: 'location',
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

      setToken: (token: string, phone: string) => {
        set({ token, phone, isAuthenticated: true });
      },

      setInitialData: (data: ProfileData) => {
        set({
          hasCompletedOnboarding: data.hasCompletedOnboarding,
          isSupervisor: data.isSupervisor,
          companyName: data.companyName,
          attendanceType: data.attendanceType,
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
        });
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
          phone: null,
          isAuthenticated: false,
          hasCompletedOnboarding: false,
          isSupervisor: false,
          companyName: null,
          attendanceType: 'location',
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
          phone: null,
          isAuthenticated: false,
          hasCompletedOnboarding: false,
          isSupervisor: false,
          companyName: null,
          attendanceType: 'location',
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