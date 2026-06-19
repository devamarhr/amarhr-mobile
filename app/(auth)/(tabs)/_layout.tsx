import { TugrugIcon } from '@/components/app-icon';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import {
  Home01Icon
} from '@hugeicons-pro/core-stroke-rounded';
import {
  Calendar03Icon,
  MailSend01Icon,
  Notification02Icon,
  UserGroupIcon
} from '@hugeicons-pro/core-stroke-standard';
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isSenior = useAuthStore((state) => state.isSenior);
  const hasAnnouncement = useNotificationStore((s) => s.announcement.length > 0);
  const hasEmployeeRequest = useNotificationStore((s) => s.employee_request.length > 0);
  const hasAssignedRequest = useNotificationStore((s) => s.employee_request_assigned.length > 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#222222',
        tabBarInactiveTintColor: '#B4B4B4',
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 50 + insets.bottom,
          paddingHorizontal: 16
        },
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
        },
        tabBarIconStyle: {
          flex: 1,
          alignSelf: "center",
        },
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
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={Home01Icon} size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="timesheet"
        options={{
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={Calendar03Icon} size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="request"
        options={{
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={MailSend01Icon} size={28} color={color} />,
          tabBarBadge: hasEmployeeRequest ? '' : undefined,
        }}
      />
      <Tabs.Screen
        name="salary"
        options={{
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={TugrugIcon} size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="announcement"
        options={{
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={Notification02Icon} size={28} color={color} />,
          tabBarBadge: hasAnnouncement ? '' : undefined,
        }}
      />
      <Tabs.Screen
        name="senior"
        options={{
          href: isSenior ? '/(auth)/(tabs)/senior' : null,
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={UserGroupIcon} size={28} color={color} />,
          tabBarBadge: hasAssignedRequest ? '' : undefined,
        }}
      />
    </Tabs>
  );
}
