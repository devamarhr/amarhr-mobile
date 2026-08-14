import { AppButton } from "@/components/app-button";
import { AppCheckbox } from "@/components/app-checkbox";
import { AppDialog } from "@/components/app-dialog";
import { AppIcon } from "@/components/app-icon";
import { AppText } from "@/components/app-text";
import { AppToast } from "@/components/app-toast";
import { api } from "@/config/api";
import { ProfileData, useAuthStore } from "@/store/auth-store";
import { processNotificationData } from "@/store/notification-store";
import { syncAttendanceReminders } from "@/utils/attendance-reminders";
import { registerForPushNotificationsAsync } from "@/utils/register-for-push-notifications";
import {
  Alert01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Location01Icon,
  Login03Icon,
  Logout03Icon,
  UserMultipleIcon,
  Wifi01Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import dayjs from 'dayjs';
import * as Location from 'expo-location';
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import { Avatar, useToast } from "heroui-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from 'react-native';
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { NetworkInfo } from 'react-native-network-info';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

type PunchAction = 'punch_in' | 'punch_out' | 'retroactive_punch_out' | 'none';

type OvertimeCategory = 'overtime' | 'compensatory' | 'accumulated' | 'compensatory_rest';

type Shift = {
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  worked_duration_minutes: number | null;
  overtime_category: OvertimeCategory | null;
};

// Илүү цаг / нөхөн олговорт / хуримтлуулсан цагийн ээлжийг ногоон өнгөөр ялгана (timesheet-тэй ижил).
const isOvertimeShift = (shift?: Shift | null): boolean =>
  shift?.overtime_category === 'overtime' ||
  shift?.overtime_category === 'compensatory' ||
  shift?.overtime_category === 'accumulated';

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
  if (!datetime) return '00:00';
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
  const sStr = dayjs(start).format('MM/DD');
  if (start === end) return sStr;
  const eStr = dayjs(end).format('MM/DD');
  return `${sStr} - ${eStr}`;
};

const eventColors = (type: string): { bg: string; text: string; nameText: string } => {
  if (type === 'annual_leave') return { bg: 'bg-amber', text: 'text-white', nameText: 'text-white' };
  if (type === 'medical_examination') return { bg: 'bg-lightcyan', text: 'text-darkcyan', nameText: 'text-black' };
  return { bg: 'bg-lightblue', text: 'text-blue', nameText: 'text-black' };
};

// Нэг event chip. Нэр нэг мөрөнд багтахгүй (таслагдсан) эсэхийг нуугдмал
// хэмжигчийн бүтэн өргөнийг container-ийн өргөнтэй харьцуулж илрүүлнэ.
// annual_leave → хуудас руу үсэрнэ; бусад төрөл таслагдсан бол dialog-оор бүтнээр харуулна.
function EventChip({
  item,
  onNavigate,
  onShowFull,
}: {
  item: UpcomingEvent;
  onNavigate: () => void;
  onShowFull: (item: UpcomingEvent) => void;
}) {
  const colors = eventColors(item.type);
  const isAnnualLeave = item.type === 'annual_leave';
  const [truncated, setTruncated] = useState(false);

  const handlePress = () => {
    if (isAnnualLeave) onNavigate();
    else if (truncated) onShowFull(item);
  };

  return (
    <Pressable
      onPress={handlePress}
      className={`${colors.bg} rounded-lg flex-row items-center px-4`}
      style={{ height: 46 }}
    >
      <AppText className={`text-sm ${colors.text} font-medium mr-3`}>
        {formatEventDate(item.start_date, item.end_date)}
      </AppText>
      <View className="flex-1">
        <AppText className={`text-sm ${colors.nameText}`} numberOfLines={1}>{item.name}</AppText>
        {/* Далд хэмжигч — container өргөнд (left/right:0) хязгаарлаж, мөр 1-ээс их
            болбол (харагдах хэсэгт таслагдсан гэсэн үг) truncated=true. */}
        {!truncated && (
          <AppText
            className={`text-sm ${colors.nameText}`}
            style={{ position: 'absolute', left: 0, right: 0, opacity: 0 }}
            onTextLayout={(e) => {
              if (e.nativeEvent.lines.length > 1) setTruncated(true);
            }}
          >
            {item.name}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

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
  const methodSheetRef = useRef<ActionSheetRef>(null);
  const pendingMethodRef = useRef<'geo' | 'wifi' | null>(null);
  const isPunchingRef = useRef(false);
  const [saveSelection, setSaveSelection] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [action, setAction] = useState<PunchAction>('none');
  const [warning, setWarning] = useState<string | null>(null);
  const [activeShiftIndex, setActiveShiftIndex] = useState(0);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  // Таслагдсан holiday/medical event дээр дарахад бүтэн текстийг харуулах dialog.
  const [eventDialog, setEventDialog] = useState<UpcomingEvent | null>(null);
  const [wifiConfirmOpen, setWifiConfirmOpen] = useState(false);
  // PagerView өөрөө өндрөө агуулгаараа тааруулж чаддаггүй тул нэг баганы
  // агуулгыг onLayout-оор хэмжиж, түүгээр pager-ийн өндрийг жолооддог.
  const [shiftRowHeight, setShiftRowHeight] = useState(58);

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (lastNotificationResponse) {
      processNotificationData(lastNotificationResponse.notification.request.content.data);
    }
  }, [lastNotificationResponse]);

  const fetchTimesheet = useCallback(async () => {
    const res = await api<TimesheetToday>({ path: '/timesheet/today', method: 'GET' });
    if (res.status == 200 && res.data) {
      setShifts(res.data.shifts ?? []);
      setAction(res.data.action);
      setWarning(res.data.warning ?? null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTimesheet();
      syncAttendanceReminders();
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
    pendingMethodRef.current = method;
    methodSheetRef.current?.hide();
    if (saveSelection) {
      useAuthStore.getState().setSettings({ attendance_method: method });
      api({ path: '/settings', method: 'PUT', data: { attendance_method: method } }).then((res) => {
        if (res.status !== 200) {
          toast.show({
            component: (props) => (
              <AppToast
                {...props}
                variant="danger"
                description={res.message || 'Алдаа гарлаа'}
                icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
              />
            ),
          });
        }
      });
    }
  }, [saveSelection, toast]);

  const punchWithWifi = useCallback(async () => {
    if (isPunchingRef.current) return;
    isPunchingRef.current = true;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              description="WiFi мэдээлэл авахын тулд байршлын зөвшөөрөл шаардлагатай."
              icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
        return;
      }
      const [ssid, bssid] = await Promise.all([
        NetworkInfo.getSSID(),
        NetworkInfo.getBSSID(),
      ]);
      console.log(JSON.stringify({ssid,bssid}))
      if (!ssid) {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              description="WiFi сүлжээнд холбогдсон байх шаардлагатай."
              icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
        return;
      }
      const res = await api<{ warning?: string | null }>({
        path: '/timesheet/punch',
        method: 'POST',
        data: {
          attendance_method: 'wifi',
          wifi_name: ssid,
          wifi_mac: bssid,
        },
      });
      if (res.status == 200) {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="success"
              description="Амжилттай цагаа бүртгүүллээ"
              icon={<AppIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
              iconContainerClassName="justify-center"
            />
          ),
        });
        fetchTimesheet();
        syncAttendanceReminders({ force: true });
      } else {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              description={res.message || 'Цаг бүртгэх үед алдаа гарлаа.'}
              icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
      }
    } finally {
      isPunchingRef.current = false;
    }
  }, [toast, fetchTimesheet]);

  const proceedWithAttendance = useCallback((method: 'geo' | 'wifi') => {
    // WiFi нь нэг даралтаар шууд punch хийдэг тул эхлээд баталгаажуулна.
    // Geo нь газрын зургийн дэлгэц дээрээ баталгаажуулалтын алхамтай.
    if (method === 'wifi') setWifiConfirmOpen(true);
    else if (method === 'geo') router.navigate('/attendance-map');
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);

    api<ProfileData>({ path: '/profile', method: 'GET' })
      .then((res) => {
        if (res.status === 200 && res.data) {
          useAuthStore.getState().setProfileData(res.data);
        }
      })
      .catch(console.error);

    api<UpcomingEvent[]>({ path: '/upcoming-events', method: 'GET' })
      .then((res) => {
        if (res.status >= 200 && res.status < 300 && Array.isArray(res.data)) {
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
      .catch((error: any) => console.log(error))
      .finally(() => {
        syncAttendanceReminders();
      });

    Notifications.getPresentedNotificationsAsync()
      .then((items) => {
        items.forEach((n) => processNotificationData(n.request.content.data));
      })
      .catch(() => {});

    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      processNotificationData(notification.request.content.data);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      processNotificationData(response.notification.request.content.data);
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
          <View className="flex-row gap-[5px] items-center">
            <Pressable
              onPress={() => router.navigate('/contact')}
              className="w-10 h-10 rounded-full bg-lightblue items-center justify-center"
            >
              <AppIcon icon={UserMultipleIcon} color="#606884" size={24} />
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
            <AppText className="text-sm text-black mt-2 w-full text-center">{formattedDate}  {weekday}</AppText>
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
              {events.map((item, index) => (
                <EventChip
                  key={index}
                  item={item}
                  onNavigate={() => router.navigate('/request/annual-leave')}
                  onShowFull={setEventDialog}
                />
              ))}
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

        <View className="flex-1" />

        {shifts.length > 0 && (
          <View className="mb-[30px]">
            <PagerView
              style={{ height: shiftRowHeight }}
              initialPage={0}
              onPageSelected={(e) => setActiveShiftIndex(e.nativeEvent.position)}
            >
              {shifts.map((shift, index) => {
                const overtime = isOvertimeShift(shift);
                return (
                  <View key={index} className="flex-row px-11">
                    <View className="flex-1 items-center">
                      <View
                        className="items-center"
                        onLayout={index === 0 ? (e) => setShiftRowHeight(e.nativeEvent.layout.height) : undefined}
                      >
                        <AppIcon icon={Login03Icon} color="#6A6A6A80" size={22} />
                        <AppText
                          className={`text-xl mt-2 ${shift.actual_start ? (overtime ? 'text-green' : '') : (overtime ? 'text-green/50' : 'text-darkgray/50')}`}
                        >
                          {formatTime(shift.actual_start ?? shift.planned_start)}
                        </AppText>
                      </View>
                    </View>
                    <View className="flex-1 items-center">
                      <AppIcon icon={Logout03Icon} color="#6A6A6A80" size={22} />
                      <AppText
                        className={`text-xl mt-2 ${shift.actual_end ? (overtime ? 'text-green' : '') : (overtime ? 'text-green/50' : 'text-darkgray/50')}`}
                      >
                        {formatTime(shift.actual_end ?? shift.planned_end)}
                      </AppText>
                    </View>
                    <View className="flex-1 items-center">
                      <AppIcon icon={Clock01Icon} color="#6A6A6A80" size={22} />
                      <AppText className={`text-xl mt-2 ${overtime ? (shift.worked_duration_minutes ? 'text-green' : 'text-green/50') : (shift.worked_duration_minutes ? '' : 'text-darkgray/50')}`}>
                        {formatDuration(shift.worked_duration_minutes)}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </PagerView>
            {shifts.length > 1 && (
              <View className="flex-row justify-center gap-1.5 mt-2">
                {shifts.map((_, index) => (
                  <View
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full ${
                      index === activeShiftIndex
                        ? isOvertimeShift(shifts[activeShiftIndex]) ? 'bg-green' : 'bg-darkgray/50'
                        : 'bg-darkgray/20'
                    }`}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <View className="items-center pb-[40px]">
          <Pressable
            onPress={() => {
              if (action === 'none') {
                if (warning) {
                  toast.show({
                    component: (props) => (
                      <AppToast
                        {...props}
                        variant="danger"
                        description={warning}
                        icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
                      />
                    ),
                  });
                }
                return;
              }
              if (attendanceMethod) {
                proceedWithAttendance(attendanceMethod);
              } else {
                setSaveSelection(false);
                methodSheetRef.current?.show();
              }
            }}
            className="w-[200px] h-[200px] rounded-full items-center justify-center"
            style={{
              backgroundColor: action === 'none' ? 'rgba(106,106,106,0.07)' : '#CCDFFC',
            }}
          >
            <View
              className="w-[180px] h-[180px] rounded-full bg-white items-center justify-center"
              style={{
                shadowColor: '#00265F',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: action === 'none' ? 0.15 : 0.25,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <AppText
                className="text-[28px] leading-9 text-center w-full px-3"
                style={{ color: action === 'none' ? 'rgba(180,180,180,0.5)' : '#090B42' }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {actionLabel(action)}
              </AppText>
            </View>
          </Pressable>
        </View>
      </View>

      <ActionSheet
        ref={methodSheetRef}
        onClose={() => {
          const method = pendingMethodRef.current;
          pendingMethodRef.current = null;
          if (method) proceedWithAttendance(method);
        }}
        gestureEnabled
        indicatorStyle={{ width: 0, height: 0, marginVertical: 0 }}
        containerStyle={{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
      >
        <View className="px-4 py-5">
          <AppText className="text-lg font-medium text-center">Цаг бүртгэлийн арга сонгох</AppText>
        </View>
        <View className="px-4 gap-5">
          <View className="flex-row gap-5 justify-center">
            {allowedAttendanceMethod.map((method) => (
              <View key={method} className="items-center gap-2">
                <AppButton
                  isIconOnly
                  leftIcon={
                    <AppIcon
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
        </View>
      </ActionSheet>

      <AppDialog isOpen={wifiConfirmOpen} onOpenChange={setWifiConfirmOpen}>
        <View className="mb-5 gap-1.5">
          <AppDialog.Title>{actionLabel(action)}</AppDialog.Title>
          <AppDialog.Description>
            Цагаа бүртгүүлэх үү?
          </AppDialog.Description>
        </View>
        <View className="flex-row gap-3">
          <AppDialog.Button label="Үгүй" className="flex-1" onPress={() => setWifiConfirmOpen(false)} />
          <AppDialog.Button
            label="Тийм"
            className="flex-1"
            onPress={() => {
              setWifiConfirmOpen(false);
              punchWithWifi();
            }}
          />
        </View>
      </AppDialog>

      <AppDialog isOpen={eventDialog !== null} onOpenChange={(open) => !open && setEventDialog(null)} className="pb-10">
        <View className="gap-1.5">
          <AppDialog.Title>
            {eventDialog ? formatEventDate(eventDialog.start_date, eventDialog.end_date) : ''}
          </AppDialog.Title>
          <AppDialog.Description>{eventDialog?.name}</AppDialog.Description>
        </View>
      </AppDialog>
    </StyledSafeAreaView>
  );
}