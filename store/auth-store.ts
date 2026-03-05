import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Child = {
  gender: 'boy' | 'girl';
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
  city: string;
  district: string;
  address: string;
  children: Child[];
  salaryAccount: string;
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
  city: string | null;
  district: string | null;
  address: string | null;
  children: Child[];
  salaryAccount: string | null;
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
      city: null,
      district: null,
      address: null,
      children: [],
      salaryAccount: null,
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
          city: data.city,
          district: data.district,
          address: data.address,
          children: data.children,
          salaryAccount: data.salaryAccount,
          bank: data.bank,
          profileImage: data.profileImage ?? null,
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
          city: null,
          district: null,
          address: null,
          children: [],
          salaryAccount: null,
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
          city: null,
          district: null,
          address: null,
          children: [],
          salaryAccount: null,
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