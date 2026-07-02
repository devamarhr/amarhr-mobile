import { AppText } from "@/components/app-text";
import { cn } from "heroui-native";
import React from "react";
import { View } from "react-native";

export interface InfoRow {
  label: string;
  value: string;
}

/**
 * Two-column label/value list emulating CSS `grid-cols-[max-content_minmax(0,1fr)]`.
 * All labels live in one column View which — having no fixed width — shrinks to its
 * widest child (= max-content); the value column takes the remaining space (flex-1).
 * No measurement needed. A uniform line height keeps the two columns' rows aligned
 * even when label and value use different font sizes. Values are single-line; use a
 * full-width block for long free-text (e.g. "Шалтгаан") instead of this list.
 */
export function InfoRowsView({
  rows,
  className,
  labelClassName,
  valueClassName,
  withColon = false,
}: {
  rows: InfoRow[];
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  withColon?: boolean;
}) {
  if (rows.length === 0) return null;
  const labelOf = (row: InfoRow) => (withColon ? `${row.label}:` : row.label);
  return (
    <View className={cn("flex-row gap-3", className)}>
      {/* Label column: no width → auto-sizes to the widest label (max-content). */}
      <View className="gap-2">
        {rows.map((row, i) => (
          <AppText
            key={i}
            numberOfLines={1}
            className={cn("text-sm leading-6 text-darkgray", labelClassName)}
          >
            {labelOf(row)}
          </AppText>
        ))}
      </View>
      {/* Value column: fills the remaining width. */}
      <View className="flex-1 gap-2">
        {rows.map((row, i) => (
          <AppText
            key={i}
            numberOfLines={1}
            className={cn("text-sm leading-6 font-medium text-black", valueClassName)}
          >
            {row.value}
          </AppText>
        ))}
      </View>
    </View>
  );
}
