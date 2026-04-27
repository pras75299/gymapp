import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import { useClerk, useUser } from "@clerk/clerk-expo";
import { useAuth } from "../src/contexts/AuthContext";
import { logger } from "../src/utils/logger";
import { colors, radius, space, type } from "../src/theme";

export function UserProfileDropdown() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const segments = useSegments();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const isHomePage = !segments[0];

  const handleSignOut = async () => {
    try {
      await signOut();
      setDropdownVisible(false);
      router.replace("/sign-in");
    } catch (err) {
      logger.error("Logout error", err);
    }
  };

  const handleProfilePress = () => {
    setDropdownVisible((v) => !v);
  };

  const handleSignIn = () => {
    router.push("/sign-in");
  };

  if (!isSignedIn) {
    if (isHomePage) {
      return (
        <View style={styles.absoluteContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleSignIn}
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={14} color={colors.text} />
            <Text style={styles.signInButtonText}>SIGN IN</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return null;
    }
  }

  return (
    <View style={styles.absoluteContainer} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.profileChip}
        onPress={handleProfilePress}
        activeOpacity={0.85}
      >
        {user?.imageUrl ? (
          <Image source={{ uri: user.imageUrl }} style={styles.profileImage} />
        ) : (
          <Text style={styles.profileInitials}>
            {user?.firstName?.[0]?.toUpperCase() ||
              user?.username?.[0]?.toUpperCase() ||
              "U"}
          </Text>
        )}
      </TouchableOpacity>
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownEyebrow}>SIGNED IN</Text>
            <Text style={styles.dropdownName} numberOfLines={1}>
              {user?.fullName ||
                user?.username ||
                user?.primaryEmailAddress?.emailAddress ||
                "Member"}
            </Text>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownAction}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.danger} />
              <Text style={styles.dropdownActionText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    position: "absolute",
    top: 60,
    right: 16,
    zIndex: 9999,
    alignItems: "flex-end",
    pointerEvents: "box-none",
  },
  profileChip: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  profileInitials: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 14,
    fontFamily: type.label.fontFamily,
    letterSpacing: 0.5,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    gap: 6,
  },
  signInButtonText: {
    ...type.label,
    color: colors.text,
    fontSize: 11,
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
