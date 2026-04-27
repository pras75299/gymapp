import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HeaderBackButtonProps } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";
import { useClerk, useUser } from "@clerk/clerk-expo";
import { colors, radius, space, type } from "../src/theme";
import { logger } from "../src/utils/logger";

type AppHeaderProps = {
  title?: string;
  canGoBack?: boolean;
  onBack?: HeaderBackButtonProps["onPress"];
};

export function AppHeader({ title = "VEER · GYM", canGoBack, onBack }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = useMemo(() => {
    return (
      user?.firstName?.[0]?.toUpperCase() ||
      user?.username?.[0]?.toUpperCase() ||
      "U"
    );
  }, [user]);
  const isAuthScreen = segments[0] === "(auth)";

  const handleSignOut = async () => {
    try {
      await signOut();
      setMenuOpen(false);
    } catch (err) {
      logger.error("Header sign out failed", err);
    }
  };

  return (
    <>
      <View style={styles.wrap}>
        <View style={{ height: Math.max(insets.top, 8) }} />
        <View style={styles.row}>
          {canGoBack ? (
            <TouchableOpacity
              style={styles.backChip}
              onPress={onBack}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
          )}

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {isSignedIn ? (
            <TouchableOpacity
              style={styles.profileChip}
              onPress={() => setMenuOpen(true)}
              activeOpacity={0.85}
            >
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.profileImage} />
              ) : (
                <Text style={styles.profileInitials}>{initials}</Text>
              )}
            </TouchableOpacity>
          ) : !isAuthScreen ? (
            <TouchableOpacity
              style={styles.signInChip}
              onPress={() => router.push("/sign-in")}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in-outline" size={14} color={colors.text} />
              <Text style={styles.signInText}>SIGN IN</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.signInPlaceholder} />
          )}
        </View>
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownEyebrow}>
              {isSignedIn ? "SIGNED IN" : "GUEST"}
            </Text>
            <Text style={styles.dropdownName} numberOfLines={1}>
              {isSignedIn
                ? user?.fullName || user?.primaryEmailAddress?.emailAddress || "Member"
                : "Sign in for a better experience"}
            </Text>
            {isSignedIn && (
              <>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity
                  style={styles.dropdownAction}
                  onPress={handleSignOut}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                  <Text style={styles.dropdownActionText}>Sign out</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  backChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backPlaceholder: {
    width: 72,
    height: 36,
  },
  backText: {
    ...type.label,
    color: colors.text,
    fontSize: 11,
    marginLeft: 4,
  },
  title: {
    ...type.label,
    flex: 1,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 11,
  },
  profileChip: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  profileInitials: {
    ...type.label,
    color: colors.accent,
    fontSize: 12,
  },
  signInChip: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  signInText: {
    ...type.label,
    color: colors.text,
    fontSize: 10,
  },
  signInPlaceholder: {
    width: 72,
    height: 36,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  dropdownMenu: {
    marginTop: 100,
    marginRight: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    padding: space.md,
    minWidth: 220,
  },
  dropdownEyebrow: {
    ...type.eyebrow,
    fontSize: 9,
    color: colors.accent,
    marginBottom: 4,
  },
  dropdownName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
    marginBottom: space.md,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: space.sm,
  },
  dropdownAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space.sm,
    gap: 8,
  },
  dropdownActionText: {
    color: colors.danger,
    ...type.label,
    fontSize: 12,
  },
});
