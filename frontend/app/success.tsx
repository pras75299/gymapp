import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { gymApi, PassStatus } from "../src/api/gymApi";
import {
  API_POLLING_INTERVAL,
  API_POLLING_MAX_ATTEMPTS,
} from "../src/constants/app";
import { logger } from "../src/utils/logger";
import { useAuth } from "../src/contexts/AuthContext";
import { colors, radius, space, type, layout } from "../src/theme";

export default function SuccessScreen() {
  const { passId } = useLocalSearchParams<{ passId: string }>();
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passStatus, setPassStatus] = useState<PassStatus | null>(null);

  useEffect(() => {
    let pollingInterval: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;
    const safePassId = typeof passId === "string" ? passId.trim() : "";
    const isSafePassId = /^[a-zA-Z0-9_:-]{3,128}$/.test(safePassId);

    const fetchPassStatus = async () => {
      if (!userId) {
        router.replace("/(auth)/sign-in");
        return;
      }

      if (!isSafePassId) {
        setError("Invalid pass ID");
        setLoading(false);
        return;
      }

      try {
        const status = await gymApi.getPassStatus(safePassId, userId);
        setPassStatus(status);

        if (status.status === "succeeded" && status.qrCodeValue) {
          setLoading(false);
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        } else if (++attempts >= API_POLLING_MAX_ATTEMPTS) {
          setError("Payment confirmation is taking longer than expected");
          setLoading(false);
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        }
      } catch (error) {
        logger.error("Error fetching pass status", error);
        setError("Failed to load pass details");
        setLoading(false);
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      }
    };

    if (isSafePassId && userId) {
      fetchPassStatus();
      pollingInterval = setInterval(fetchPassStatus, API_POLLING_INTERVAL);
    } else if (!userId || !isSafePassId) {
      setLoading(false);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [passId, userId, router]);

  const handleViewPasses = () => {
    router.replace("/my-passes");
  };

  if (loading) {
    return (
      <View style={styles.stateScreen}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.eyebrow}>Confirming</Text>
        <Text style={styles.stateTitle}>Generating{"\n"}your pass…</Text>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
        <Text style={styles.stateSub}>This may take a few moments.</Text>
      </View>
    );
  }

  if (error || !passStatus) {
    return (
      <View style={styles.stateScreen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errIcon}>
          <Ionicons name="alert" size={26} color={colors.danger} />
        </View>
        <Text style={styles.stateTitle}>{error || "Something went wrong"}</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleViewPasses}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>View my passes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (passStatus.status !== "succeeded" || !passStatus.qrCodeValue) {
    return (
      <View style={styles.stateScreen}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.eyebrow}>Processing</Text>
        <Text style={styles.stateTitle}>Payment{"\n"}processing…</Text>
        <Text style={styles.stateSub}>
          Hang tight while we confirm your transaction.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: space.xl }]}
          onPress={handleViewPasses}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>View my passes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View style={styles.brandMark}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>VEER · GYM</Text>
          </View>
          <Text style={styles.unit}>PASS · 01</Text>
        </View>

        <Text style={styles.eyebrow}>Confirmed · Show at entrance</Text>
        <Text style={styles.title}>
          Welcome.{"\n"}
          <Text style={styles.titleAccent}>You're in.</Text>
        </Text>

        <View style={styles.ticket}>
          <View style={styles.notchTop} />
          <View style={styles.notchBottom} />

          <View style={styles.qrWrap}>
            <View style={styles.qrFrame}>
              <QRCode
                value={passStatus.qrCodeValue}
                size={200}
                backgroundColor="#FFFFFF"
                color={colors.accentInk}
              />
            </View>
            <Text style={styles.qrCaption}>SCAN TO ENTER</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsBlock}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pass</Text>
              <Text style={styles.detailValue}>
                {passStatus.passType?.name || "—"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Expires</Text>
              <Text style={styles.detailValue}>
                {passStatus.expiryDate
                  ? new Date(passStatus.expiryDate).toLocaleDateString()
                  : "—"}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.instructions}>
          Show the QR code at the gym entrance. The pass auto-expires after the
          listed date.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleViewPasses}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>View all my passes</Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={colors.accentInk}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.topPadding,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.xxl,
  },
  brandMark: { flexDirection: "row", alignItems: "center" },
  brandDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.accent,
    marginRight: space.sm,
  },
  brandText: { ...type.label, color: colors.text, fontWeight: "700" },
  unit: { ...type.label, color: colors.textMuted },
  eyebrow: { ...type.eyebrow, color: colors.accent, marginBottom: space.md },
  title: {
    ...type.display,
    color: colors.text,
    fontSize: 48,
    lineHeight: 46,
    marginBottom: space.xl,
  },
  titleAccent: { color: colors.accent, fontStyle: "italic" },
  ticket: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    marginBottom: space.xl,
  },
  notchTop: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notchBottom: {
    position: "absolute",
    bottom: -12,
    alignSelf: "center",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrWrap: { alignItems: "center" },
  qrFrame: {
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.sm,
  },
  qrCaption: {
    ...type.label,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: space.md,
  },
  divider: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: "dashed",
    marginVertical: space.lg,
  },
  detailsBlock: { width: "100%" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: space.sm,
  },
  detailLabel: {
    ...type.label,
    color: colors.textMuted,
    fontSize: 11,
  },
  detailValue: {
    ...type.numeric,
    color: colors.text,
    fontSize: 14,
  },
  instructions: {
    ...type.bodyMuted,
    textAlign: "center",
    fontSize: 13,
    marginBottom: space.xl,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.sm,
  },
  primaryBtnText: {
    ...type.label,
    color: colors.accentInk,
    fontSize: 14,
    fontWeight: "800",
  },
  stateScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.topPadding + 24,
  },
  stateTitle: {
    ...type.display,
    color: colors.text,
    fontSize: 44,
    lineHeight: 44,
    marginBottom: space.xxl,
  },
  stateSub: { ...type.bodyMuted, fontSize: 14 },
  spinnerWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  errIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: "rgba(255,72,72,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
});
