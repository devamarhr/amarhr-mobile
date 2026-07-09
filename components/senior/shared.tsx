import { SeniorMenuBar, SeniorMenuKey } from "@/components/senior-menu-bar";
import {
  getTabBarPaddingBottom,
  TAB_BAR_BASE_HEIGHT,
  tabBarHidden,
} from "@/hooks/use-hide-tab-bar";
import { useIsFocused } from "@react-navigation/native";
import { Portal } from "heroui-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Bottom padding for the senior tab's scroll surfaces. The senior scene draws
// full-height (its bottom tab bar is `position: absolute`), so content must
// clear both the bar and the floating senior menu hovering above it. The 88 is
// the gap that used to sit above the menu when the scene was inset by the bar.
export function useSeniorContentPad() {
  const insets = useSafeAreaInsets();
  return 88 + TAB_BAR_BASE_HEIGHT + insets.bottom;
}

export interface MonthlySummary {
  year: number;
  month: number;
  label: string;
  count: number;
}

// Per-menu pending counts served by GET /senior/menu-badges; count > 0 lights
// the menu item's dot. Keys mirror SeniorMenuKey.
export type MenuBadges = Record<SeniorMenuKey, number>;

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function fullName(emp: { first_name?: string | null; last_name?: string | null }): string {
  const parts = [emp.last_name, emp.first_name].filter(Boolean) as string[];
  return parts.join(" ");
}

export function avatarFallback(emp: { first_name?: string | null; last_name?: string | null }): string {
  return ((emp.last_name?.[0] ?? "") + (emp.first_name?.[0] ?? "")) || "?";
}

export function nameWithInitial(emp: { first_name?: string | null; last_name?: string | null }): string {
  const initial = emp.last_name?.[0];
  return initial ? `${emp.first_name ?? ""}.${initial}` : emp.first_name ?? "";
}

export const MENU_TITLES: Record<SeniorMenuKey, string> = {
  request: "Өргөдөл хүсэлт",
  announcement: "Зарлал, мэдээлэл",
  performance: "Гүйцэтгэл",
  schedule: "Хуваарь",
  leave: "Э/амралт төлөвлөлт",
};

// Day-of-week index (0 = Sunday) → full Mongolian weekday name. The app has no
// dayjs Mongolian locale, so weekday names are mapped manually (cf. shift-swap).
export const WEEKDAYS_FULL = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

export interface DeadlineInfo {
  label: string;
  urgent: boolean;
}

// The floating menu pill. Rendered through a Portal (app root) so it can slide
// down into the area the bottom tab bar vacates without being clipped by the
// screen's scene bounds. Only shown while the senior tab is focused, since tab
// screens stay mounted in the background. Targets the dedicated
// "floating-overlay" host, which sits below the default HeroUI portal host in
// the root layout — bottom sheets and dialogs always draw above the pill.
export function SeniorMenuOverlay({
  active,
  onChange,
  hiddenKeys,
  badges,
}: {
  active: SeniorMenuKey;
  onChange: (key: SeniorMenuKey) => void;
  hiddenKeys: SeniorMenuKey[];
  badges?: SeniorMenuKey[];
}) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  // Resting position: 15px above the bottom tab bar's real top edge. Uses the
  // bar's actual padding (not the raw safe-area inset) so the gap stays tight
  // and consistent regardless of platform.
  const restBottom = TAB_BAR_BASE_HEIGHT + getTabBarPaddingBottom(insets.bottom) + 15;
  const animatedStyle = useAnimatedStyle(() => ({
    // When hidden, drop the pill so it rests flush against the bottom safe-area
    // inset (restBottom → insets.bottom), filling the space the tab bar vacates.
    transform: [{ translateY: tabBarHidden.value * (restBottom - insets.bottom) }],
  }));

  if (!isFocused) return null;

  return (
    <Portal name="senior-menu-overlay" hostName="floating-overlay">
      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: restBottom,
            alignItems: "center",
          },
          animatedStyle,
        ]}
      >
        <SeniorMenuBar active={active} onChange={onChange} hiddenKeys={hiddenKeys} badges={badges} />
      </Animated.View>
    </Portal>
  );
}
