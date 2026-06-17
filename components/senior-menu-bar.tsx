import {
  Calendar03Icon,
  ChartIncreaseIcon,
  IslandIcon,
  Megaphone01Icon,
  Note02Icon,
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import { Pressable, View } from "react-native";

export type SeniorMenuKey = "request" | "announcement" | "performance" | "schedule" | "leave";

const ITEMS: { key: SeniorMenuKey; icon: typeof Note02Icon }[] = [
  { key: "request", icon: Note02Icon },
  { key: "announcement", icon: Megaphone01Icon },
  { key: "performance", icon: ChartIncreaseIcon },
  { key: "schedule", icon: Calendar03Icon },
  { key: "leave", icon: IslandIcon },
];

interface Props {
  active: SeniorMenuKey;
  onChange: (key: SeniorMenuKey) => void;
  hiddenKeys?: SeniorMenuKey[];
}

export function SeniorMenuBar({ active, onChange, hiddenKeys }: Props) {
  const items = hiddenKeys?.length
    ? ITEMS.filter((item) => !hiddenKeys.includes(item.key))
    : ITEMS;
  return (
    <View className="self-center flex-row items-center gap-2 bg-black rounded-full px-3 py-2 mb-2">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              if (!isActive) onChange(item.key);
            }}
            className="w-11 h-11 rounded-full items-center justify-center"
            hitSlop={4}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={24}
              color={isActive ? "#FFFFFF" : "#949494"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
