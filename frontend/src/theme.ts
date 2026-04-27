import { Platform, TextStyle, ViewStyle } from "react-native";

export const colors = {
  bg: "#0B0B0C",
  surface: "#141416",
  surfaceAlt: "#1C1C1F",
  surfaceHigh: "#242428",
  border: "#26262A",
  borderStrong: "#36363B",
  text: "#F4F4EE",
  textMuted: "#9A9A93",
  textDim: "#5A5A55",
  accent: "#D7FE34",
  accentDim: "#A6C71F",
  accentInk: "#0B0B0C",
  success: "#5DFFA1",
  danger: "#FF4848",
  warning: "#FFB347",
  overlay: "rgba(8,8,9,0.78)",
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

const monoFont = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
}) as string;

const sansFont = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
}) as string;

export const fonts = {
  sans: sansFont,
  mono: monoFont,
} as const;

export const type = {
  display: {
    fontFamily: sansFont,
    fontWeight: "900" as TextStyle["fontWeight"],
    letterSpacing: -0.8,
    textTransform: "uppercase" as TextStyle["textTransform"],
  },
  eyebrow: {
    fontFamily: monoFont,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: "uppercase" as TextStyle["textTransform"],
    color: colors.textMuted,
  },
  label: {
    fontFamily: monoFont,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase" as TextStyle["textTransform"],
  },
  body: {
    fontFamily: sansFont,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  bodyMuted: {
    fontFamily: sansFont,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  numeric: {
    fontFamily: monoFont,
    fontWeight: "700" as TextStyle["fontWeight"],
    letterSpacing: 0.5,
  },
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  } satisfies ViewStyle,
  glow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 6,
  } satisfies ViewStyle,
};

export const layout = {
  screenPadding: space.xl,
  topPadding: 72,
  bottomPadding: 32,
};
