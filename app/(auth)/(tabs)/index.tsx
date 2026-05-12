import { AppButton } from "@/components/app-button";
import { AppCheckbox } from "@/components/app-checkbox";
import { AppText } from "@/components/app-text";
import { AppToast } from "@/components/app-toast";
import { api } from "@/config/api";
import { ProfileData, useAuthStore } from "@/store/auth-store";
import { registerForPushNotificationsAsync } from "@/utils/register-for-push-notifications";
import {
  Alert01Icon,
  Clock01Icon,
  Location01Icon,
  LoginCircle02Icon,
  LogoutCircle02Icon,
  UserMultipleIcon,
  Wifi01Icon,
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import NetInfo from '@react-native-community/netinfo';
import dayjs from 'dayjs';
import * as Location from 'expo-location';
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import { Avatar, BottomSheet, useToast } from "heroui-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

type PunchAction = 'punch_in' | 'punch_out' | 'retroactive_punch_out' | 'none';

type Shift = {
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  worked_duration_minutes: number | null;
};

type TimesheetToday = {
  shifts: Shift[];
  action: PunchAction;
  warning: string | null;
};

const actionLabel = (action: PunchAction): string => {
  if (action === 'punch_out' || action === 'retroactive_punch_out') return 'Тарлаа';
  return 'Ирлээ';
};

const formatTime = (datetime: string | null): string => {
  if (!datetime) return '—';
  return dayjs(datetime).format('HH:mm');
};

const formatDuration = (minutes: number | null): string => {
  if (minutes == null) return '00:00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const WEEKDAYS_MN = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

type UpcomingEvent = {
  start_date: string;
  end_date: string;
  name: string;
  type: 'holiday' | 'medical_examination' | string;
};

const formatEventDate = (start: string, end: string): string => {
  const s = dayjs(start);
  const e = dayjs(end);
  const sStr = `${s.month() + 1}/${s.date()}`;
  if (start === end) return sStr;
  const eStr = `${e.month() + 1}/${e.date()}`;
  return `${sStr} - ${eStr}`;
};

const eventColors = (type: string): { bg: string; text: string } => {
  if (type === 'medical_examination') return { bg: 'bg-lightcyan', text: 'text-darkcyan' };
  return { bg: 'bg-lightblue', text: 'text-blue' };
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function HomeScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);
  const { profileImage, lastName, firstName } = useAuthStore();
  const companyName = useAuthStore((state) => state.companyName);
  const attendanceMethod = useAuthStore((state) => state.attendanceMethod);
  const allowedAttendanceMethod = useAuthStore((state) => state.allowedAttendanceMethod);
  const [methodSheetOpen, setMethodSheetOpen] = useState(false);
  const [saveSelection, setSaveSelection] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [action, setAction] = useState<PunchAction>('none');
  const [activeShiftIndex, setActiveShiftIndex] = useState(0);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const fetchTimesheet = useCallback(async () => {
    const res = await api<TimesheetToday>({ path: '/timesheet/today', method: 'GET' });
    if (res.status == 200 && res.data) {
      setShifts(res.data.shifts ?? []);
      setAction(res.data.action);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTimesheet();
    }, [fetchTimesheet])
  );

  const methodLabels: Record<string, string> = {
    geo: 'Байршил',
    wifi: 'WiFi',
  };

  const methodIcons: Record<string, typeof Location01Icon> = {
    geo: Location01Icon,
    wifi: Wifi01Icon,
  };

  const handleSelectMethod = useCallback((method: 'geo' | 'wifi') => {
    setMethodSheetOpen(false);
    if (saveSelection) {
      useAuthStore.getState().setSettings({ attendance_method: method });
      api({ path: '/settings', method: 'PUT', data: { attendance_method: method } }).catch(console.error);
    }
    proceedWithAttendance(method);
  }, [saveSelection]);

  const proceedWithAttendance = useCallback(async (method: 'geo' | 'wifi') => {
    if (method === 'wifi') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              description="WiFi мэдээлэл авахын тулд байршлын зөвшөөрөл шаардлагатай."
              icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
        return;
      }
      const state = await NetInfo.fetch();
      const ssid = state.type === 'wifi' ? (state.details as { ssid?: string })?.ssid : null;
      if (!ssid) {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              description="WiFi сүлжээнд холбогдсон байх шаардлагатай."
              icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
        return;
      }
    } else if (method === 'geo') {
      router.navigate('/attendance-map');
    }
  }, [router, toast]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);

    api<ProfileData>({ path: '/profile', method: 'GET' })
      .then((res) => {
        useAuthStore.getState().setProfileData(res.data);
      })
      .catch(console.error);

    api<UpcomingEvent[]>({ path: '/upcoming-events', method: 'GET' })
      .then((res) => {
        if (res.status >= 200 && res.status < 300 && res.data) {
          setEvents(res.data);
        }
      })
      .catch(console.error);

    registerForPushNotificationsAsync()
      .then(token => {
        console.log(token)
        if (token) {
          api({
            path: '/expo-push-token',
            method: 'PUT',
            data: { expo_push_token: token },
          }).catch(console.error);
        }
      })
      .catch((error: any) => console.log(error));

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log(JSON.stringify(notification));
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      clearInterval(timer);
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const formattedTime = currentTime.format('HH:mm');
  const formattedDate = currentTime.format('YYYY/MM/DD');
  const weekday = WEEKDAYS_MN[currentTime.day()];

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <View className="flex-row justify-between gap-4 items-center py-[7px]">
          <View className="flex-1">
            <AppText className="text-xl font-medium">{companyName}</AppText>
          </View>
          <View className="flex-row gap-4 items-center">
            <Pressable onPress={() => router.navigate('/contact')}>
              <HugeiconsIcon icon={UserMultipleIcon} color="#222222" size={24} />
            </Pressable>
            <Pressable onPress={() => router.navigate('/profile')}>
              <Avatar alt="Profile" className="w-10 h-10">
                <Avatar.Image source={{
                  uri: profileImage ?? '',
                }} />
                <Avatar.Fallback classNames={{ text: "text-black" }}>
                  {(lastName?.[0] ?? '') + (firstName?.[0] ?? '')}
                </Avatar.Fallback>
              </Avatar>
            </Pressable>
          </View>
        </View>

        <View className="items-center mt-20">
          <View className="w-full items-center">
            <AppText className="font-light text-7xl">{formattedTime}</AppText>
          </View>
          <View className="w-full items-center">
            <AppText className="text-sm text-black mt-2">{formattedDate}  {weekday}</AppText>
          </View>
        </View>

        {events.length > 0 && (
          <View className="mt-5">
            <PagerView
              style={{ height: 50 }}
              initialPage={0}
              pageMargin={12}
              onPageSelected={(e) => setActiveAnnouncementIndex(e.nativeEvent.position)}
            >
              {events.map((item, index) => {
                const colors = eventColors(item.type);
                return (
                  <View
                    key={index}
                    className={`${colors.bg} rounded-xl flex-row items-center px-4`}
                    style={{ height: 46 }}
                  >
                    <AppText className={`${colors.text} font-medium mr-3`}>
                      {formatEventDate(item.start_date, item.end_date)}
                    </AppText>
                    <AppText className="text-black flex-1" numberOfLines={1}>{item.name}</AppText>
                  </View>
                );
              })}
            </PagerView>
            {events.length > 1 && (
              <View className="flex-row justify-center gap-1.5 mt-2">
                {events.map((_, index) => (
                  <View
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full ${
                      index === activeAnnouncementIndex ? 'bg-darkgray/50' : 'bg-darkgray/20'
                    }`}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {shifts.length > 0 && (
          <View className="mt-10">
            <PagerView
              style={{ height: 70 }}
              initialPage={0}
              onPageSelected={(e) => setActiveShiftIndex(e.nativeEvent.position)}
            >
              {shifts.map((shift, index) => (
                <View key={index} className="flex-row justify-around px-4">
                  <View className="items-center">
                    <HugeiconsIcon icon={LoginCircle02Icon} color="#6A6A6A80" size={22} />
                    <AppText
                      className={`text-xl mt-2 ${shift.actual_start ? '' : 'text-darkgray/50'}`}
                    >
                      {formatTime(shift.actual_start ?? shift.planned_start)}
                    </AppText>
                  </View>
                  <View className="items-center">
                    <HugeiconsIcon icon={LogoutCircle02Icon} color="#6A6A6A80" size={22} />
                    <AppText
                      className={`text-xl mt-2 ${shift.actual_end ? '' : 'text-darkgray/50'}`}
                    >
                      {formatTime(shift.actual_end ?? shift.planned_end)}
                    </AppText>
                  </View>
                  <View className="items-center">
                    <HugeiconsIcon icon={Clock01Icon} color="#6A6A6A80" size={22} />
                    <AppText className="text-xl mt-2">{formatDuration(shift.worked_duration_minutes)}</AppText>
                  </View>
                </View>
              ))}
            </PagerView>
            {shifts.length > 1 && (
              <View className="flex-row justify-center gap-1.5 mt-2">
                {shifts.map((_, index) => (
                  <View
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full ${
                      index === activeShiftIndex ? 'bg-darkgray/50' : 'bg-darkgray/20'
                    }`}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <View className="flex-1 items-center justify-center">
          <Pressable
            disabled={action === 'none'}
            onPress={() => {
              if (attendanceMethod) {
                proceedWithAttendance(attendanceMethod);
              } else {
                setSaveSelection(false);
                setMethodSheetOpen(true);
              }
            }}
            className="w-[180px] h-[180px] rounded-full"
            style={{
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: action === 'none' ? 0.5 : 1,
              shadowColor: '#A8C8F0',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 30,
              elevation: 12,
            }}
          >
            <AppText className="text-2xl">
              {actionLabel(action)}
            </AppText>
          </Pressable>
        </View>
      </View>

      <BottomSheet
       isOpen={methodSheetOpen} onOpenChange={setMethodSheetOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={['35%']}
            enableOverDrag={false}
            handleComponent={null}
          >
            <BottomSheet.Title className="text-center mb-8">
              Цаг бүртгэлийн арга сонгох
            </BottomSheet.Title>
            <View className="flex-row gap-5 mb-5 px-4 justify-center">
              {allowedAttendanceMethod.map((method) => (
                <View key={method} className="items-center gap-2">
                  <AppButton
                    isIconOnly
                    leftIcon={
                      <HugeiconsIcon
                        icon={methodIcons[method]}
                        color="#222222"
                        size={28}
                      />
                    }
                    onPress={() => handleSelectMethod(method)}
                    className="w-20 h-20 rounded-2xl border-darkgray"
                  />
                  <AppText className="text-sm">{methodLabels[method]}</AppText>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => setSaveSelection((prev) => !prev)}
              className="flex-row items-center gap-2.5 justify-center"
            >
              <AppCheckbox
                isSelected={saveSelection}
                onSelectedChange={setSaveSelection}
              />
              <AppText className="text-sm text-darkgray">Сонголт хадгалах</AppText>
            </Pressable>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </StyledSafeAreaView>
  );
}