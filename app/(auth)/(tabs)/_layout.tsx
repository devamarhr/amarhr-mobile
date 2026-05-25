import { Tabs } from 'expo-router';
import React from 'react';
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Home01Icon
} from '@hugeicons-pro/core-stroke-rounded';
import {
  Calendar03Icon,
  DollarCircleIcon,
  MailSend01Icon,
  Notification02Icon,
  UserGroupIcon
} from '@hugeicons-pro/core-stroke-standard';
import { TugrugIcon } from '@/components/app-icon';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';

export default function TabLayout() {
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
          paddingTop: 4,
        },
        tabBarBadgeStyle: {
          backgroundColor: '#EE5700',
          minWidth: 8,
          height: 8,
          borderRadius: 4,
          fontSize: 1,
          top: -4,
          left: 28,
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
