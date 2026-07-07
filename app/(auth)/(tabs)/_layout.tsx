import { TugrugIcon } from '@/components/app-icon';
import { getTabBarPaddingBottom, TAB_BAR_BASE_HEIGHT, tabBarHidden } from '@/hooks/use-hide-tab-bar';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import {
  ClockCheckIcon
} from '@hugeicons-pro/core-stroke-rounded';
import {
  Calendar03Icon,
  MailSend01Icon,
  Notification02Icon,
  UserGroupIcon
} from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Wraps the default tab bar so screens can slide it off the bottom edge on
// scroll via the shared `tabBarHidden` value. Kept in normal layout flow, so
// the scene still insets for it and tabs that never drive the value are
// unchanged.
function AnimatedTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const fullHeight = TAB_BAR_BASE_HEIGHT + getTabBarPaddingBottom(insets.bottom);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarHidden.value * fullHeight }],
  }));
  return (
    <Animated.View style={animatedStyle}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isSenior = useAuthStore((state) => state.isSenior);
  const hasAnnouncement = useNotificationStore((s) => s.announcement.length > 0);
  const hasEmployeeRequest = useNotificationStore((s) => s.employee_request.length > 0);
  const hasAssignedRequest = useNotificationStore((s) => s.employee_request_assigned.length > 0);

  // Shared visual style for the bottom bar. The senior screen overrides this to
  // `position: absolute` so its scene draws full-height (content flows behind the
  // bar); the floating senior menu then sits over real content instead of the
  // white gap the bar leaves when it hides on scroll.
  const tabBarPaddingBottom = getTabBarPaddingBottom(insets.bottom);

  const tabBarBaseStyle = {
    height: TAB_BAR_BASE_HEIGHT + tabBarPaddingBottom,
    paddingTop: 0,
    paddingBottom: tabBarPaddingBottom,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(106,106,106,0.2)',
  } as const;

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: '#222222',
        tabBarInactiveTintColor: '#B4B4B4',
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 9,
          fontFamily: 'Inter_500Medium',
          marginTop: 2,
        },
        tabBarStyle: tabBarBaseStyle,
        tabBarBadgeStyle: {
          backgroundColor: '#EE5700',
          minWidth: 8,
          height: 8,
          borderRadius: 4,
          fontSize: 1,
          top: 0,
          end: -6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Бүртгэл',
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={ClockCheckIcon} size={24} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="timesheet"
        options={{
          tabBarLabel: 'Хуваарь',
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={Calendar03Icon} size={24} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="request"
        options={{
          tabBarLabel: 'Хүсэлт',
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={MailSend01Icon} size={24} color={color} strokeWidth={1.5} />,
          tabBarBadge: hasEmployeeRequest ? '' : undefined,
        }}
      />
      <Tabs.Screen
        name="salary"
        options={{
          tabBarLabel: 'Цалин',
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={TugrugIcon} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="announcement"
        options={{
          tabBarLabel: 'Мэдээлэл',
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={Notification02Icon} size={24} color={color} strokeWidth={1.5} />,
          tabBarBadge: hasAnnouncement ? '' : undefined,
        }}
      />
      <Tabs.Screen
        name="senior"
        options={{
          href: isSenior ? '/(auth)/(tabs)/senior' : null,
          tabBarLabel: 'Ахлах',
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={UserGroupIcon} size={24} color={color} strokeWidth={1.5} />,
          tabBarBadge: hasAssignedRequest ? '' : undefined,
          // Float the bar so the senior scene fills full height; the list scrolls
          // behind it and the floating menu never exposes the bar's white gap.
          tabBarStyle: [tabBarBaseStyle, { position: 'absolute', left: 0, right: 0, bottom: 0 }],
        }}
      />
    </Tabs>
  );
}
