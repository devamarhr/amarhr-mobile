import { AppText } from '@/components/app-text';
import React from 'react';
import { View } from 'react-native';

export interface HeaderInfoItem {
  label: string;
  value: string;
}

// Render a value, dimming any "--:--" placeholder (e.g. an unrecorded clock-out
// in "09:42 - --:--") to match the design.
function renderValue(value: string) {
  return value.split(/(--:--)/g).map((part, i) =>
    part === '--:--' ? (
      <AppText key={i} className="text-sm text-darkerblue/50">{part}</AppText>
    ) : (
      part
    ),
  );
}

/**
 * Label/value list for request-screen headers. A single row renders inline;
 * two or more rows use two auto-sizing columns — the label column hugs its
 * widest label (so the 10px column gap holds at any font scale) and the value
 * column fills the rest, keeping every value aligned to the same edge.
 */
export function RequestHeaderInfo({ rows }: { rows: HeaderInfoItem[] }) {
  if (rows.length === 0) return null;

  if (rows.length === 1) {
    return (
      <View className="flex-row gap-2.5">
        <AppText className="text-sm text-darkblue" numberOfLines={1}>{rows[0].label}</AppText>
        <AppText className="flex-1 text-sm font-medium text-darkerblue" numberOfLines={1}>{renderValue(rows[0].value)}</AppText>
      </View>
    );
  }

  return (
    <View className="flex-row gap-2.5">
      <View className="gap-2.5">
        {rows.map((item, index) => (
          <AppText key={index} className="text-sm text-darkblue" numberOfLines={1}>{item.label}</AppText>
        ))}
      </View>
      <View className="flex-1 gap-2.5">
        {rows.map((item, index) => (
          <AppText key={index} className="text-sm font-medium text-darkerblue" numberOfLines={1}>{renderValue(item.value)}</AppText>
        ))}
      </View>
    </View>
  );
}
