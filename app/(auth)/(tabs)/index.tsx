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
  LoginCircle02Icon,
  LogoutCircle02Icon,
  UserMultipleIcon,
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import NetInfo from '@react-native-community/netinfo';
import dayjs from 'dayjs';
import * as Location from 'expo-location';
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Avatar, BottomSheet, useToast } from "heroui-native";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

const WEEKDAYS_MN = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

const announcements = [
  { date: '09/12', text: 'Бурхан багшийн Их дүйчин өдөр' },
  { date: '09/15', text: 'Компанийн тэмдэглэлт өдөр' },
];

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

  const methodLabels: Record<string, string> = {
    geo: 'Байршил',
    wifi: 'WiFi',
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
        <View className="flex-row justify-between items-center py-[7px]">
          <AppText className="text-xl font-medium">{companyName}</AppText>
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
          <AppText className="font-light text-7xl">
            {formattedTime}
          </AppText>
          <AppText className="text-sm text-black mt-2">
            {formattedDate}  {weekday}
          </AppText>
        </View>

        <View className="mt-5">
          <PagerView
            style={{ height: 50 }}
            initialPage={0}
            onPageSelected={(e) => setActiveAnnouncementIndex(e.nativeEvent.position)}
          >
            {announcements.map((item, index) => (
              <View
                key={index}
                className="bg-lightblue rounded-xl flex-row items-center px-4"
                style={{ height: 46 }}
              >
                <AppText className="text-blue font-medium mr-3">{item.date}</AppText>
                <AppText className="text-black flex-1" numberOfLines={1}>{item.text}</AppText>
              </View>
            ))}
          </PagerView>
          <View className="flex-row justify-center gap-1.5 mt-2">
            {announcements.map((_, index) => (
              <View
                key={index}
                className={`w-1.5 h-1.5 rounded-full ${
                  index === activeAnnouncementIndex ? 'bg-darkgray/50' : 'bg-darkgray/20'
                }`}
              />
            ))}
          </View>
        </View>

        <View className="flex-row justify-around mt-10 px-4">
          <View className="items-center">
            <HugeiconsIcon icon={LoginCircle02Icon} color="#6A6A6A80" size={22} />
            <AppText className="text-xl mt-2">09:12</AppText>
          </View>
          <View className="items-center">
            <HugeiconsIcon icon={LogoutCircle02Icon} color="#6A6A6A80" size={22} />
            <AppText className="text-xl mt-2">18:00</AppText>
          </View>
          <View className="items-center">
            <HugeiconsIcon icon={Clock01Icon} color="#6A6A6A80" size={22} />
            <AppText className="text-xl mt-2">07:48</AppText>
          </View>
        </View>

        <View className="flex-1 items-center justify-center">
          <Pressable
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
              shadowColor: '#A8C8F0',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 30,
              elevation: 12,
            }}
          >
            <AppText className="text-2xl">
              Ирлээ
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
            <View className="gap-5 mb-5 px-4">
              {allowedAttendanceMethod.map((method) => (
                <AppButton
                  key={method}
                  label={methodLabels[method]}
                  onPress={() => handleSelectMethod(method)}
                  className="rounded-full border-darkgray"
                  labelClassName="text-base font-medium"
                />
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