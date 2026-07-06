import { useCallback, useRef } from "react";
import { Platform } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { makeMutable, withTiming } from "react-native-reanimated";

export type ScrollHandler = (e: NativeSyntheticEvent<NativeScrollEvent>) => void;

// Base height of the bottom tab bar, excluding the device's bottom safe-area
// inset. Mirrors `tabBarStyle.height` in app/(auth)/(tabs)/_layout.tsx. React
// Navigation centers each icon+label within this region, so extra height shows
// up as empty space above/below the icons — but too little clips the label.
// 50 keeps the icons close to the top border without cutting off the labels.
export const TAB_BAR_BASE_HEIGHT = 50;

// Bottom padding for the tab bar, derived from the device's safe-area inset.
// iOS trims most of the large home-indicator inset (~34px) so the tabs sit near
// the bottom edge instead of leaving a big empty gap. Android keeps its system
// nav-bar inset, but with an 8px floor so 3-button-nav labels aren't clipped.
// Shared by the tabs layout (for the bar's own height/padding) and the senior
// floating menu (so it can rest just above the bar's real top edge).
export function getTabBarPaddingBottom(bottomInset: number) {
  return Platform.OS === "ios"
    ? Math.max(bottomInset - 10, 8)
    : Math.max(bottomInset, 8);
}

// 0 = tab bar fully visible, 1 = fully hidden (slid off the bottom edge).
// A module-level shared value lets a screen's scroll handler and the custom tab
// bar in the tabs layout drive/read the same animation without threading a
// value across the expo-router screen boundary. Screens that never touch it
// (every tab except senior) keep the bar permanently visible.
export const tabBarHidden = makeMutable(0);

const SCROLL_THRESHOLD = 8; // ignore tiny scroll jitter
const REVEAL_NEAR_TOP = 40; // never hide while still near the top

// Returns an `onScroll` handler that hides the bottom tab bar when the user
// scrolls down and reveals it when they scroll up (or reach the top), plus a
// `reset()` that forces the bar back to visible — call it when the surface
// unmounts or the screen blurs so other tabs are never left with a hidden bar.
export function useHideTabBarOnScroll() {
  const lastY = useRef(0);
  const hidden = useRef(false);

  const setHidden = useCallback((next: boolean) => {
    if (hidden.current === next) return;
    hidden.current = next;
    tabBarHidden.value = withTiming(next ? 1 : 0, { duration: 220 });
  }, []);

  const onScroll = useCallback<ScrollHandler>(
    (e) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      lastY.current = y;

      if (y <= 0) {
        setHidden(false);
      } else if (dy > SCROLL_THRESHOLD && y > REVEAL_NEAR_TOP) {
        setHidden(true);
      } else if (dy < -SCROLL_THRESHOLD) {
        setHidden(false);
      }
    },
    [setHidden]
  );

  const reset = useCallback(() => {
    lastY.current = 0;
    hidden.current = false;
    tabBarHidden.value = 0;
  }, []);

  return { onScroll, reset };
}
