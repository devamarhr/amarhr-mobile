import { HugeiconsIcon, type HugeiconsProps, type IconSvgElement } from '@hugeicons/react-native';

export const TugrugIcon: IconSvgElement = [
  ["path", {
    d: "M9 12L12 10.7143M12 10.7143L16 9M12 10.7143V14.7143M12 10.7143V4M9 16L12 14.7143M12 14.7143L16 13M12 14.7143V20M12 4H5M12 4H19",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    key: "0",
  }],
];

/**
 * App-wide icon wrapper around HugeiconsIcon.
 *
 * Defaults every icon to a constant *visual* stroke width of 1.5 —
 * `absoluteStrokeWidth` normalizes the stroke across different icon sizes,
 * so an icon at size 16, 20 or 24 all render with the same 1.5 weight.
 *
 * Override per-usage via the `strokeWidth` prop (e.g. checkmarks use 2).
 * Not for solid/filled icons — those should use HugeiconsIcon directly.
 */
export function AppIcon({ strokeWidth = 1.5, absoluteStrokeWidth = true, ...props }: HugeiconsProps) {
  return <HugeiconsIcon strokeWidth={strokeWidth} absoluteStrokeWidth={absoluteStrokeWidth} {...props} />;
}

/**
 * The design's lighter icon family: 24px at a 1.2 stroke, used for the leading
 * slot of a form field (date picker, select, text field) and for attachment rows
 * and the "Файл хавсаргах" action.
 *
 * Everything else — headers, nav, the attachment X — keeps the app-wide 1.5 of
 * `AppIcon`. Pass `color` for the rows that aren't #222; all props override.
 */
export function AppFieldIcon({ strokeWidth = 1.2, size = 24, color = '#222', ...props }: HugeiconsProps) {
  return <AppIcon strokeWidth={strokeWidth} size={size} color={color} {...props} />;
}
