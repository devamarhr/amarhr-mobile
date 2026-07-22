import { api } from '@/config/api';
import { useAuthStore } from '@/store/auth-store';
import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';

export const ATTENDANCE_REMINDER_TYPE = 'attendance_reminder';

export const REMINDER_OFFSET_MINUTES = 5;
const SYNC_INTERVAL_MS = 60 * 60 * 1000;

type UpcomingShift = {
  date: string;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
};

type UpcomingShiftsResponse = {
  shifts: UpcomingShift[];
};

let lastSyncAt = 0;

export async function cancelAttendanceReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.content.data?.type === ATTENDANCE_REMINDER_TYPE) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (error) {
    console.log('cancelAttendanceReminders error', error);
  }
}

export async function syncAttendanceReminders(opts?: { force?: boolean }): Promise<void> {
  try {
    if (!opts?.force && Date.now() - lastSyncAt < SYNC_INTERVAL_MS) {
      return;
    }

    const { isAuthenticated, attendanceReminder } = useAuthStore.getState();
    if (!isAuthenticated) {
      return;
    }
    if (!attendanceReminder) {
      await cancelAttendanceReminders();
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const res = await api<UpcomingShiftsResponse>({ path: '/timesheet/upcoming-shifts' });
    if (res.status !== 200 || !Array.isArray(res.data?.shifts)) {
      return;
    }
    lastSyncAt = Date.now();

    await cancelAttendanceReminders();

    const now = dayjs();
    for (const shift of res.data.shifts) {
      // API нь ISO 8601 UTC (…Z) буцаадаг тул формат зааж өгөхгүй — dayjs өөрөө
      // ISO-г танин UTC-г local цаг руу хөрвүүлнэ.
      const plannedStart = dayjs(shift.planned_start);
      const plannedEnd = dayjs(shift.planned_end);

      const startAt = plannedStart.subtract(REMINDER_OFFSET_MINUTES, 'minute');
      if (!shift.actual_start && startAt.isAfter(now)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Цаг бүртгэл',
            body: `Таны ээлж ${plannedStart.format('HH:mm')} цагт эхэлнэ. «Ирлээ» цагаа бүртгүүлэхээ мартуузай.`,
            data: { type: ATTENDANCE_REMINDER_TYPE },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: startAt.toDate(),
            channelId: 'default',
          },
        });
      }

      const endAt = plannedEnd.subtract(REMINDER_OFFSET_MINUTES, 'minute');
      if (!shift.actual_end && endAt.isAfter(now)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Цаг бүртгэл',
            body: `Таны ээлж ${plannedEnd.format('HH:mm')} цагт дуусна. «Тарлаа» цагаа бүртгүүлэхээ мартуузай.`,
            data: { type: ATTENDANCE_REMINDER_TYPE },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: endAt.toDate(),
            channelId: 'default',
          },
        });
      }
    }
    // 14 хоног x 2 сануулга ≈ 28 — iOS-ийн 64 pending notification лимитэд багтана
  } catch (error) {
    console.log('syncAttendanceReminders error', error);
  }
}
