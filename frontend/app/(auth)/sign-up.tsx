import * as React from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { logger } from "../../src/utils/logger";
import { colors, radius, space, type, layout } from "../../src/theme";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    setError(null);
    setIsLoading(true);
    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      logger.error("Sign up error", err);
      setError(
        err?.errors?.[0]?.message || "Couldn't sign up. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;
    setError(null);
    setIsLoading(true);
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace("/");
      } else {
        logger.warn("Sign up verification incomplete", signUpAttempt);
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      logger.error("Sign up verification error", err);
      setError(
        err?.errors?.[0]?.message || "Verification failed. Check your code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>
          {pendingVerification ? "Verifying…" : "Creating your account…"}
        </Text>
      </View>
    );
  }

  if (pendingVerification) {
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
                onPress={() => setPendingVerification(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
                <Text style={styles.backChipText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.unit}>VEER · GYM</Text>
            </View>

            <Text style={styles.eyebrow}>Step 02 / 02</Text>
            <Text style={styles.title}>
              Verify{"\n"}
              <Text style={styles.titleAccent}>your email.</Text>
            </Text>
            <Text style={styles.lede}>
              We sent a 6-digit code to {emailAddress}.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  placeholderTextColor={colors.textDim}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={onVerifyPress}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Verify & continue</Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.accentInk}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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

          <Text style={styles.eyebrow}>Step 01 / 02</Text>
          <Text style={styles.title}>
            Join{"\n"}
            <Text style={styles.titleAccent}>the gym.</Text>
          </Text>
          <Text style={styles.lede}>
            Create an account to buy passes and store your entry QR codes.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textDim}
                value={emailAddress}
                onChangeText={setEmailAddress}
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
                  placeholder="Choose a strong password"
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
              onPress={onSignUpPress}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.accentInk}
              />
            </TouchableOpacity>

            <View style={styles.signInRow}>
              <Text style={styles.signInLabel}>Already a member?</Text>
              <Link href="/sign-in" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.signInLink}>Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
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
  lede: { ...type.bodyMuted, fontSize: 14, marginBottom: space.xxl },
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
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    fontFamily: type.numeric.fontFamily,
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
    color: colors.danger,
    ...type.label,
    fontSize: 12,
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
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: space.xl,
  },
  signInLabel: {
    ...type.bodyMuted,
    fontSize: 13,
  },
  signInLink: {
    ...type.label,
    color: colors.accent,
    fontSize: 12,
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
