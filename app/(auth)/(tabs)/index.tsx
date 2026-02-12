import { View, Pressable } from 'react-native';
import { useRouter } from "expo-router";
import { Avatar } from "heroui-native";
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import React, { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  UserMultipleIcon,
  Clock01Icon,
  Login02Icon,
  Logout02Icon, Login01Icon, Logout01Icon, LoginCircle02Icon, LogoutCircle02Icon,
} from "@hugeicons-pro/core-stroke-standard";
import PagerView from 'react-native-pager-view';
import dayjs from 'dayjs';
import { LoginCircle01StrokeRounded } from "@hugeicons-pro/core-stroke-rounded";

const StyledSafeAreaView = withUniwind(SafeAreaView);

const WEEKDAYS_MN = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

const announcements = [
  { date: '09/12', text: 'Бурхан багшийн Их дүйчин өдөр' },
  { date: '09/15', text: 'Компанийн тэмдэглэлт өдөр' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);
  const [clockedIn, setClockedIn] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.format('HH:mm');
  const formattedDate = currentTime.format('YYYY/MM/DD');
  const weekday = WEEKDAYS_MN[currentTime.day()];

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-4">
        <View className="flex-row justify-between items-center">
          <AppText className="text-xl font-medium">Датаком</AppText>
          <View className="flex-row gap-4 items-center">
            <Pressable onPress={() => router.push('/contact')}>
              <HugeiconsIcon icon={UserMultipleIcon} color="#222222" size={24} />
            </Pressable>
            <Pressable onPress={() => router.push('/profile')}>
              <Avatar alt="Profile" className="w-10 h-10">
                <Avatar.Image source={{
                  uri: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2',
                }} />
                <Avatar.Fallback classNames={{ text: "text-black" }}>AC</Avatar.Fallback>
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
            onPress={() => setClockedIn(!clockedIn)}
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
              {clockedIn ? 'Тарлаа' : 'Ирлээ'}
            </AppText>
          </Pressable>
        </View>
      </View>
    </StyledSafeAreaView>
  );
}