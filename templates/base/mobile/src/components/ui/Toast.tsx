import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, Pressable, Platform } from "react-native";
import { useUI, useUIActions } from "@/store/ui.store";

const COLORS = {
  success: { bg: "#dcfce7", border: "#16a34a", text: "#166534" },
  error: { bg: "#fee2e2", border: "#dc2626", text: "#991b1b" },
  warning: { bg: "#fef3c7", border: "#d97706", text: "#92400e" },
  info: { bg: "#dbeafe", border: "#2563eb", text: "#1e40af" },
};

export function Toast() {
  const { notification } = useUI();
  const { hideNotification } = useUIActions();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (notification) {
      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out (store handles auto-hide timing)
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [notification, opacity, translateY]);

  if (!notification) return null;

  const colors = COLORS[notification.type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable onPress={hideNotification} style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {notification.title}
        </Text>
        {notification.message && (
          <Text style={[styles.message, { color: colors.text }]}>
            {notification.message}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 16,
    right: 16,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 10, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  message: {
    fontSize: 14,
    marginTop: 4,
  },
});
