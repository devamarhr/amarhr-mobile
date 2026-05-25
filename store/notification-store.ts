import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type NotificationType = 'announcement' | 'employee_request' | 'employee_request_assigned';

interface NotificationState {
  announcement: number[];
  employee_request: number[];
  employee_request_assigned: number[];
  add: (type: NotificationType, id: number) => void;
  clear: (type: NotificationType) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      announcement: [],
      employee_request: [],
      employee_request_assigned: [],
      add: (type, id) =>
        set((state) => {
          if (state[type].includes(id)) return state;
          return { ...state, [type]: [...state[type], id] };
        }),
      clear: (type) =>
        set((state) => {
          if (state[type].length === 0) return state;
          return { ...state, [type]: [] };
        }),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function processNotificationData(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  const d = data as { type?: unknown; id?: unknown };
  const type = d.type;
  const idNum = typeof d.id === 'number' ? d.id : typeof d.id === 'string' ? Number(d.id) : NaN;
  if (!Number.isFinite(idNum)) return;
  if (
    type === 'announcement' ||
    type === 'employee_request' ||
    type === 'employee_request_assigned'
  ) {
    useNotificationStore.getState().add(type, idNum);
  }
}
