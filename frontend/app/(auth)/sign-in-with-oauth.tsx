import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { useOAuth } from "@clerk/clerk-expo";
import { useWarmUpBrowser } from "../../src/hooks/useWarmUpBrowser";
import { Ionicons } from "@expo/vector-icons";
import { logger } from "../../src/utils/logger";
import { colors, radius, space, type, layout } from "../../src/theme";

export default function SignInWithOAuthScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { isSignedIn } = useAuth();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [isLoading, setIsLoading] = useState(false);
  useWarmUpBrowser();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (searchParams?.code) {
        setIsLoading(true);
        try {
          const { createdSessionId, setActive } = await startOAuthFlow({
            redirectUrl:
              process.env.EXPO_PUBLIC_OAUTH_CALLBACK_URL ||
              "exp://localhost:19000/oauth-callback",
          });

          if (createdSessionId && setActive) {
            await setActive({ session: createdSessionId });
            router.replace("/");
          } else {
            router.replace("/sign-in");
          }
        } catch (err) {
          logger.error("OAuth error", err);
          router.replace("/sign-in");
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, startOAuthFlow]);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/");
    }
  }, [isSignedIn]);

  const onPress = async () => {
    setIsLoading(true);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl:
          process.env.EXPO_PUBLIC_OAUTH_CALLBACK_URL ||
          "exp://localhost:19000/oauth-callback",
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/");
      }
    } catch (err) {
      logger.error("OAuth error", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Connecting to Google…</Text>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <View style={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backChip}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
            <Text style={styles.backChipText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.unit}>VEER · GYM</Text>
        </View>

        <Text style={styles.eyebrow}>Quick access</Text>
        <Text style={styles.title}>
          One{"\n"}
          <Text style={styles.titleAccent}>tap.</Text>
        </Text>
        <Text style={styles.lede}>
          Sign in with your Google account to access your gym passes.
        </Text>

        <View style={{ flex: 1 }} />

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onPress}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={18} color={colors.accentInk} />
            <Text style={styles.primaryBtnText}>Continue with Google</Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.accentInk}
            />
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push("/sign-in")}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Sign in with email</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.topPadding,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.xxl,
  },
  backChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space.sm,
    paddingLeft: 4,
    paddingRight: space.md,
  },
  backChipText: {
    ...type.label,
    color: colors.text,
    marginLeft: 4,
    fontSize: 12,
  },
  unit: { ...type.label, color: colors.textMuted },
  eyebrow: { ...type.eyebrow, color: colors.accent, marginBottom: space.md },
  title: {
    ...type.display,
    color: colors.text,
    fontSize: 64,
    lineHeight: 60,
    marginBottom: space.md,
  },
  titleAccent: { color: colors.accent, fontStyle: "italic" },
  lede: { ...type.bodyMuted, fontSize: 14, maxWidth: 320 },
  actions: { width: "100%" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: space.xl,
    borderRadius: radius.sm,
  },
  primaryBtnText: {
    ...type.label,
    color: colors.accentInk,
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
    marginLeft: space.md,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: space.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    ...type.label,
    color: colors.textMuted,
    fontSize: 10,
    marginHorizontal: space.md,
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 16,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  secondaryBtnText: {
    ...type.label,
    color: colors.text,
    fontSize: 13,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...type.bodyMuted,
    marginTop: space.lg,
    fontSize: 14,
  },
});
