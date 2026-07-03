import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  taxNumber: string | null;
  profileImage: string | null;
  hidePhone: boolean;
  attendanceReminder: boolean;
  attendanceMethod: 'geo' | 'wifi' | null;
  allowedAttendanceMethod: ('geo' | 'wifi')[];
}

export interface UserSettings {
  attendance_method: 'geo' | 'wifi' | null;
  hide_phone: boolean;
  attendance_reminder: boolean;
}

interface AuthState {
  token: string | null;
  phone: string | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isSenior: boolean;
  companyName: string | null;
  attendanceMethod: 'geo' | 'wifi' | null;
  allowedAttendanceMethod: ('geo' | 'wifi')[];
  hidePhone: boolean;
  attendanceReminder: boolean;
  jobPosition: string | null;
  taxNumber: string | null;

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
  setProfileData: (data: ProfileData) => void;
  setSettings: (settings: Partial<UserSettings>) => void;
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
      attendanceMethod: null,
      hidePhone: false,
      attendanceReminder: true,
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
      taxNumber: null,
      profileImage: null,
      allowedAttendanceMethod: [],
      selectOptions: null,

      setToken: (token: string, phone: string) => {
        set({ token, phone, isAuthenticated: true });
      },

      setProfileData: (data: ProfileData) => {
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
          taxNumber: data.taxNumber,
          profileImage: data.profileImage ?? null,
          hidePhone: data.hidePhone,
          attendanceReminder: data.attendanceReminder,
          attendanceMethod: data.attendanceMethod,
          allowedAttendanceMethod: data.allowedAttendanceMethod,
        });
      },

      setSettings: (settings: Partial<UserSettings>) => {
        const mapped: Partial<AuthState> = {};
        if (settings.attendance_method !== undefined) mapped.attendanceMethod = settings.attendance_method;
        if (settings.hide_phone !== undefined) mapped.hidePhone = settings.hide_phone;
        if (settings.attendance_reminder !== undefined) mapped.attendanceReminder = settings.attendance_reminder;
        set(mapped);
      },

      setSelectOptions: (data: SelectOptionsData) => {
        set({ selectOptions: data });
      },

      logout: () => {
        // static import үүсгэвэл api.ts-ээр дамжсан require cycle үүсэх тул dynamic import ашиглана
        import('@/utils/attendance-reminders')
          .then((m) => m.cancelAttendanceReminders())
          .catch(() => {});
        set({
          token: null,
          phone: null,
          isAuthenticated: false,
          hasCompletedOnboarding: false,
          isSenior: false,
          companyName: null,
          attendanceMethod: null,
          hidePhone: false,
          attendanceReminder: true,
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
          taxNumber: null,
          profileImage: null,
          allowedAttendanceMethod: [],
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