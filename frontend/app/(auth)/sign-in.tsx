import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSignIn, useUser, useClerk } from "@clerk/clerk-expo";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { gymApi } from "../../src/api/gymApi";
import { ERROR_MESSAGES, USER_ERROR_MESSAGES } from "../../src/constants/app";
import { logger } from "../../src/utils/logger";
import { colors, radius, space, type, layout } from "../../src/theme";
import { useWarmUpBrowser } from "../../src/hooks/useWarmUpBrowser";

export default function SignInScreen() {
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const { signIn, setActive } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { user } = useUser();
  const clerk = useClerk();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  useWarmUpBrowser();

  const handleSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      const completeSignIn = await signIn?.create({
        identifier: email,
        password,
      });
      if (completeSignIn?.createdSessionId) {
        await setActive?.({ session: completeSignIn.createdSessionId });

        await new Promise((resolve) => setTimeout(resolve, 500));

        const [storedPassId, redirectPath] = await AsyncStorage.multiGet([
          "selectedPassId",
          "redirectAfterAuth",
        ]);

        if (storedPassId[1]) {
          try {
            await AsyncStorage.multiRemove([
              "selectedPassId",
              "redirectAfterAuth",
            ]);

            let currentUserId: string | null = null;

            await new Promise((resolve) => setTimeout(resolve, 300));

            if (clerk.user?.id) {
              currentUserId = clerk.user.id;
            } else {
              let attempts = 0;
              const maxAttempts = 5;

              while (!currentUserId && attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 200));
                if (clerk.user?.id) {
                  currentUserId = clerk.user.id;
                  break;
                }
                attempts++;
              }
            }

            if (!currentUserId) {
              logger.error("Unable to get userId after sign-in");
              throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED);
            }

            const deviceId = await AsyncStorage.getItem("deviceId");
            if (!deviceId) {
              throw new Error(ERROR_MESSAGES.DEVICE_ID_REQUIRED);
            }

            logger.info("Proceeding with payment flow after sign-in", {
              passId: storedPassId[1],
            });
            const order = await gymApi.purchasePass(
              storedPassId[1],
              currentUserId,
              deviceId
            );

            router.replace({
              pathname: "/payment",
              params: {
                passId: order.passId,
                orderId: order.orderId,
                amount: order.amount.toString(),
                currency: order.currency,
                keyId: order.keyId,
              },
            });
          } catch (paymentError) {
            logger.error("Payment process error after sign-in", paymentError);
            Alert.alert("Payment Error", USER_ERROR_MESSAGES.PAYMENT_ERROR, [
              { text: "OK", onPress: () => router.replace("/") },
            ]);
          }
        } else {
          router.replace("/");
        }
      }
    } catch (error) {
      logger.error("Sign in error", error);
      setError("Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow({
        redirectUrl:
          process.env.EXPO_PUBLIC_OAUTH_CALLBACK_URL ||
          "exp://localhost:19000/oauth-callback",
      });

      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        router.replace("/");
      }
    } catch (oauthError) {
      logger.error("Google OAuth sign in error", oauthError);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Signing you in…</Text>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backChip}
              onPress={() => router.replace("/")}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
              <Text style={styles.backChipText}>Home</Text>
            </TouchableOpacity>
            <Text style={styles.unit}>VEER · GYM</Text>
          </View>

          <Text style={styles.eyebrow}>Member access</Text>
          <Text style={styles.title}>
            Welcome{"\n"}
            <Text style={styles.titleAccent}>back.</Text>
          </Text>
          <Text style={styles.lede}>Sign in to access your gym passes.</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textDim}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, { flex: 1, paddingRight: 44 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSignIn}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Sign in</Text>
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
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color={colors.text} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing you agree to our terms.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.topPadding,
    paddingBottom: 60,
    flexGrow: 1,
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
    fontSize: 56,
    lineHeight: 54,
    marginBottom: space.md,
  },
  titleAccent: { color: colors.accent, fontStyle: "italic" },
  lede: {
    ...type.bodyMuted,
    fontSize: 14,
    marginBottom: space.xxl,
  },
  form: { width: "100%" },
  inputGroup: { marginBottom: space.lg },
  label: {
    ...type.label,
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: space.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  passwordWrap: { position: "relative" },
  passwordToggle: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    ...type.label,
    color: colors.danger,
    fontSize: 13,
    marginBottom: space.md,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: space.xl,
    borderRadius: radius.sm,
    marginTop: space.sm,
  },
  primaryBtnText: {
    ...type.label,
    color: colors.accentInk,
    fontSize: 14,
    fontWeight: "800",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: space.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    ...type.label,
    color: colors.textMuted,
    fontSize: 10,
    marginHorizontal: space.md,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 16,
    borderRadius: radius.sm,
  },
  googleBtnText: {
    ...type.label,
    color: colors.text,
    fontSize: 13,
  },
  footer: { marginTop: space.xxl, alignItems: "center" },
  footerText: {
    ...type.label,
    color: colors.textDim,
    fontSize: 10,
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
