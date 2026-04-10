// Cross-platform icon component using MaterialIcons as fallback
// Supports SF Symbols naming for consistency

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolViewProps, SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

/**
 * SF Symbols to Material Icons mappings
 * - see Material Icons: https://icons.expo.fyi
 * - see SF Symbols: https://developer.apple.com/sf-symbols/
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.up": "keyboard-arrow-up",
  "chevron.down": "keyboard-arrow-down",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  magnifyingglass: "search",
  "person.fill": "person",
  "person.circle.fill": "account-circle",
  "rectangle.portrait.and.arrow.right": "logout",
  "doc.text": "description",
  calendar: "event",
  checkmark: "check",
  "checkmark.circle.fill": "check-circle",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  gear: "settings",
  "gear.circle": "settings",
  "bell.fill": "notifications",
  "heart.fill": "favorite",
  "star.fill": "star",
  "lock.shield.fill": "security",
  "lock.fill": "lock",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "envelope.fill": "email",
  "phone.fill": "phone",
  trash: "delete",
  plus: "add",
  "plus.circle.fill": "add-circle",
  "minus.circle.fill": "remove-circle",
  globe: "language",
  "square.and.arrow.up": "share",
  "doc.on.doc": "content-copy",
  "list.bullet": "list",
  "arrow.clockwise": "refresh",
  "arrow.clockwise.circle.fill": "refresh",
  "exclamationmark.triangle.fill": "warning",
  "exclamationmark.circle.fill": "error",
  "info.circle.fill": "info",
  "camera.fill": "camera",
  "photo.fill": "photo",
  "mic.fill": "mic",
  "videocam.fill": "videocam",
  sparkles: "auto-awesome",
  infinity: "all-inclusive",
  // 2FA-specific icons
  "key.fill": "vpn-key",
  "checkmark.shield.fill": "verified-user",
  "shield.slash.fill": "remove-moderator",
  "gearshape.fill": "settings",
} as const;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
