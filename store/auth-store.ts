import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SelectOption = {
  value: string;
  label: string;
  [key: string]: any;
};

export type SoumOption = SelectOption & { children: SelectOption[] };
export type AddressOption = SelectOption & { children: SoumOption[] };

export interface SelectOptionsData {
  bank: SelectOption[];
  nationality: SelectOption[];
  emergencyRelation: SelectOption[];
  address: AddressOption[];
}

export type Child = {
  gender: 'female' | 'male';
  birthDate: string;
};

export type Address = {
  path: {
    aimag: string;
    soum: string;
    khoroo: string;
  };
  street: string;
};

export interface ProfileFormData {
  lastName: string;
  firstName: string;
  gender: 'male' | 'female';
  nationality: string;
  familyName: string;
  registerNumber: string;
  birthDate: string;
  email: string;
  emergencyContact: string;
  emergencyRelation: string;
  address: Address;
  children: Child[];
  bankAccount: string;
  bank: string;
  profileImage?: string;
}

// Profile data from API
export interface ProfileData {
  hasCompletedOnboarding: boolean;
  isSenior: boolean;
  companyName: string | null;
  jobPosition: string | null;

  lastName: string | null;
  firstName: string | null;
  gender: 'male' | 'female' | null;
  nationality: string | null;
  familyName: string | null;
  registerNumber: string | null;
  birthDate: string | null;
  email: string | null;
  emergencyContact: string | null;
  emergencyRelation: string | null;
  address: Address | null;
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
  isSenior: boolean;
  companyName: string | null;
  attendanceType: 'wifi' | 'location';
  jobPosition: string | null;

  // Onboarding data
  lastName: string | null;
  firstName: string | null;
  gender: 'male' | 'female' | null;
  nationality: string | null;
  familyName: string | null;
  registerNumber: string | null;
  birthDate: string | null;
  email: string | null;
  emergencyContact: string | null;
  emergencyRelation: string | null;
  address: Address | null;
  children: Child[];
  bankAccount: string | null;
  bank: string | null;
  profileImage: string | null;

  // Select options
  selectOptions: SelectOptionsData | null;

  // Actions
  setToken: (token: string, phone: string) => void;
  setInitialData: (data: ProfileData) => void;
  setSelectOptions: (data: SelectOptionsData) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      phone: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      isSenior: false,
      companyName: null,
      attendanceType: 'location',
      jobPosition: null,
      lastName: null,
      firstName: null,
      gender: null,
      nationality: null,
      familyName: null,
      registerNumber: null,
      birthDate: null,
      email: null,
      emergencyContact: null,
      emergencyRelation: null,
      address: null,
      children: [],
      bankAccount: null,
      bank: null,
      profileImage: null,
      selectOptions: null,

      setToken: (token: string, phone: string) => {
        set({ token, phone, isAuthenticated: true });
      },

      setInitialData: (data: ProfileData) => {
        set({
          hasCompletedOnboarding: data.hasCompletedOnboarding,
          isSenior: data.isSenior,
          companyName: data.companyName,
          jobPosition: data.jobPosition,
          lastName: data.lastName,
          firstName: data.firstName,
          gender: data.gender,
          nationality: data.nationality,
          familyName: data.familyName,
          registerNumber: data.registerNumber,
          birthDate: data.birthDate,
          email: data.email,
          emergencyContact: data.emergencyContact,
          emergencyRelation: data.emergencyRelation,
          address: data.address,
          children: data.children,
          bankAccount: data.bankAccount,
          bank: data.bank,
          profileImage: data.profileImage ?? null,
        });
      },

      setSelectOptions: (data: SelectOptionsData) => {
        set({ selectOptions: data });
      },

      logout: () => {
        set({
          token: null,
          phone: null,
          isAuthenticated: false,
          hasCompletedOnboarding: false,
          isSenior: false,
          companyName: null,
          attendanceType: 'location',
          jobPosition: null,
          lastName: null,
          firstName: null,
          gender: null,
          nationality: null,
          familyName: null,
          registerNumber: null,
          birthDate: null,
          email: null,
          emergencyContact: null,
          emergencyRelation: null,
          address: null,
          children: [],
          bankAccount: null,
          bank: null,
          profileImage: null,
          selectOptions: null,
        });
      },

    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);