import { AppText } from "@/components/app-text";
import {
  CalendarUserIcon,
  LicenseDraftIcon,
  MailReceive01Icon,
  PercentIcon,
  Sun03Icon,
} from "@hugeicons-pro/core-stroke-standard";
import { AppIcon } from "@/components/app-icon";
import React from "react";
import { Pressable, View } from "react-native";

export type SeniorMenuKey = "request" | "announcement" | "performance" | "schedule" | "leave";

const ITEMS: { key: SeniorMenuKey; icon: typeof PercentIcon; label: string }[] = [
  { key: "request", icon: MailReceive01Icon, label: "Хүсэлт" },
  { key: "announcement", icon: LicenseDraftIcon, label: "Зарлал" },
  { key: "performance", icon: PercentIcon, label: "Гүйцэтгэл" },
  { key: "schedule", icon: CalendarUserIcon, label: "Хуваарь" },
  { key: "leave", icon: Sun03Icon, label: "Амралт" },
];

interface Props {
  active: SeniorMenuKey;
  onChange: (key: SeniorMenuKey) => void;
  hiddenKeys?: SeniorMenuKey[];
  badges?: SeniorMenuKey[];
}

export function SeniorMenuBar({ active, onChange, hiddenKeys, badges }: Props) {
  const items = hiddenKeys?.length
    ? ITEMS.filter((item) => !hiddenKeys.includes(item.key))
    : ITEMS;
  return (
    <View className="flex-row items-center bg-lightblue rounded-[10px] overflow-hidden">
      {items.map((item) => {
        const isActive = item.key === active;
        const hasBadge = badges?.includes(item.key);
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              if (!isActive) onChange(item.key);
            }}
            className={`w-[60px] h-[60px] items-center justify-center rounded-[10px] ${
              isActive ? "bg-darkblue" : ""
            }`}
          >
            <AppIcon icon={item.icon} size={24} color={isActive ? "#FFFFFF" : "#A3ACC1"} />
            <AppText
              className={`text-[10px] font-medium mt-1 ${isActive ? "text-white" : "text-bluegray"}`}
            >
              {item.label}
            </AppText>
            {hasBadge && (
              <View className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-orange" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
