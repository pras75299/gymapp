import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { gymApi } from "../src/api/gymApi";
import type { PassType } from "../src/api/gymApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../src/contexts/AuthContext";
import { ERROR_MESSAGES } from "../src/constants/app";
import { logger } from "../src/utils/logger";
import { colors, radius, space, type, layout } from "../src/theme";

export default function PassSelectionScreen() {
  const { qrIdentifier } = useLocalSearchParams<{ qrIdentifier: string }>();
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passes, setPasses] = useState<PassType[]>([]);
  const [hasActivePass, setHasActivePass] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const getTier = (pass: PassType): "REGULAR" | "PRO" => {
    if (pass.tier === "PRO" || pass.tier === "REGULAR") return pass.tier;
    return pass.name.toLowerCase().includes("pro") ? "PRO" : "REGULAR";
  };

  const groupedPasses = passes.reduce<Record<number, { REGULAR?: PassType; PRO?: PassType }>>(
    (acc, pass) => {
      const key = pass.duration;
      const tier = getTier(pass);
      if (!acc[key]) acc[key] = {};
      acc[key][tier] = pass;
      return acc;
    },
    {}
  );

  const sortedDurations = Object.keys(groupedPasses)
    .map(Number)
    .sort((a, b) => a - b);

  useEffect(() => {
    const fetchPasses = async () => {
      try {
        setLoading(true);
        setError(null);

        const gym = await gymApi.getGymByQrIdentifier(qrIdentifier);
        setPasses(gym.passes);

        const deviceId = await AsyncStorage.getItem("deviceId");
        if (deviceId && userId) {
          const activePasses = await gymApi.getActivePasses(deviceId, userId);
          setHasActivePass(activePasses.length > 0);
        }
      } catch (err) {
        logger.error("Error fetching passes", err);
        if (err instanceof Error) {
          if (
            err.message.includes("timeout") ||
            err.message.includes("Connection timeout")
          ) {
            setError(
              "Connection timeout. Please check your internet connection and try again."
            );
          } else if (
            err.message.includes("Unable to connect") ||
            err.message.includes("network")
          ) {
            setError(
              "Unable to connect to server. Please check your internet connection."
            );
          } else if (
            err.message.includes("not found") ||
            err.message.includes("Gym not found")
          ) {
            setError("Gym not found. Please scan a valid gym QR code.");
          } else {
            setError(err.message || ERROR_MESSAGES.FETCH_GYM_FAILED);
          }
        } else {
          setError(ERROR_MESSAGES.FETCH_GYM_FAILED);
        }
      } finally {
        setLoading(false);
      }
    };

    if (!qrIdentifier) {
      setError("Missing gym identifier. Please scan the gym QR code again.");
      setLoading(false);
      return;
    }

    fetchPasses();
  }, [qrIdentifier, userId]);

  const handlePassSelect = async (passId: string) => {
    try {
      setSelectingId(passId);
      if (!isSignedIn) {
        await AsyncStorage.multiSet([
          ["selectedPassId", passId],
          ["redirectAfterAuth", "/payment"],
        ]);
        router.push("/sign-in");
        return;
      }

      if (!userId) {
        throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED);
      }

      const deviceId = await AsyncStorage.getItem("deviceId");
      if (!deviceId) {
        throw new Error(ERROR_MESSAGES.DEVICE_ID_REQUIRED);
      }

      logger.info("Purchasing pass", { passId, userId });
      const order = await gymApi.purchasePass(passId, userId, deviceId);
      router.push({
        pathname: "/payment",
        params: {
          passId: order.passId,
          orderId: order.orderId,
          amount: order.amount.toString(),
          currency: order.currency,
          keyId: order.keyId,
        },
      });
    } catch (err) {
      logger.error("Error purchasing pass", err);
      setError(
        err instanceof Error ? err.message : ERROR_MESSAGES.PURCHASE_PASS_FAILED
      );
    } finally {
      setSelectingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.stateScreen}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.stateTitle}>Loading passes</Text>
        <Text style={styles.stateText}>Fetching the gym's available passes…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateScreen}>
        <View style={styles.stateIcon}>
          <Ionicons name="alert" size={26} color={colors.danger} />
        </View>
        <Text style={styles.stateTitle}>Something's off</Text>
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>Step 02 / 03 — Choose pass</Text>
        <Text style={styles.title}>
          Select{"\n"}
          <Text style={styles.titleAccent}>your pass.</Text>
        </Text>

        {hasActivePass && (
          <View style={styles.activeBanner}>
            <View style={styles.activeBannerDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeBannerTitle}>Active pass found</Text>
              <Text style={styles.activeBannerText}>
                You already have a pass — purchase blocked until it expires.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.passList}>
          {sortedDurations.map((duration, idx) => {
            const pair = groupedPasses[duration];
            const regular = pair?.REGULAR;
            const pro = pair?.PRO;
            const options = [regular, pro].filter((item): item is PassType => Boolean(item));

            return (
              <View key={duration} style={styles.passGroupCard}>
                <View style={styles.passGroupHeader}>
                  <Text style={styles.passIndex}>{String(idx + 1).padStart(2, "0")}</Text>
                  <View style={styles.passDivider} />
                  <View style={styles.passInfo}>
                    <Text style={styles.passName}>
                      {duration} {duration === 1 ? "DAY" : "DAYS"}
                    </Text>
                    <Text style={styles.passHint} numberOfLines={1}>
                      Choose Regular or Pro
                    </Text>
                  </View>
                </View>

                <View style={styles.variantList}>
                  {options.map((pass) => {
                    const isLoading = selectingId === pass.id;
                    const disabled = hasActivePass || !!selectingId;
                    const tier = getTier(pass);
                    const isPro = tier === "PRO";

                    return (
                      <TouchableOpacity
                        key={pass.id}
                        style={[
                          styles.variantRow,
                          isPro && styles.variantRowPro,
                          disabled && !isLoading && styles.passCardDisabled,
                        ]}
                        onPress={() => handlePassSelect(pass.id)}
                        disabled={disabled}
                        activeOpacity={0.85}
                      >
                        <View style={styles.variantLeft}>
                          <Text style={[styles.variantTier, isPro && styles.variantTierPro]}>
                            {isPro ? "PRO" : "REGULAR"}
                          </Text>
                          <Text style={styles.variantSubtitle}>
                            {isPro ? "Exercise split included" : "Single entry pass"}
                          </Text>
                        </View>
                        <View style={styles.passRight}>
                          <View>
                            <Text style={styles.passCurrency}>{pass.currency}</Text>
                            <Text style={styles.passPrice}>{Math.round(Number(pass.price))}</Text>
                          </View>
                          <View style={styles.passCta}>
                            {isLoading ? (
                              <ActivityIndicator size="small" color={colors.accentInk} />
                            ) : (
                              <Ionicons
                                name="arrow-forward"
                                size={18}
                                color={colors.accentInk}
                              />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure checkout via Razorpay · Pass activates instantly on payment.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: space.lg,
    paddingBottom: 60,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.accent,
    marginBottom: space.md,
  },
  title: {
    ...type.display,
    color: colors.text,
    fontSize: 48,
    lineHeight: 46,
    marginBottom: space.xl,
  },
  titleAccent: { color: colors.accent, fontStyle: "italic" },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: space.lg,
  },
  activeBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: space.md,
  },
  activeBannerTitle: {
    ...type.label,
    color: colors.text,
    fontSize: 12,
    marginBottom: 2,
  },
  activeBannerText: {
    ...type.bodyMuted,
    fontSize: 12,
  },
  passList: {
    gap: space.md,
  },
  passGroupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  passGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: space.md,
  },
  passCardDisabled: { opacity: 0.45 },
  passInfo: {
    flex: 1,
    minWidth: 0,
  },
  passIndex: {
    ...type.numeric,
    fontSize: 26,
    color: colors.accent,
    width: 42,
    lineHeight: 28,
    textAlign: "center",
  },
  passDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: space.md,
  },
  passName: {
    ...type.display,
    color: colors.text,
    fontSize: 18,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  passDuration: {
    ...type.label,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 14,
  },
  passHint: {
    ...type.label,
    color: colors.textDim,
    fontSize: 10,
    marginTop: 2,
  },
  variantList: {
    gap: space.sm,
  },
  variantRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surfaceAlt,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  variantRowPro: {
    borderColor: colors.accentDim,
  },
  variantLeft: {
    flex: 1,
    minWidth: 0,
  },
  variantTier: {
    ...type.label,
    color: colors.text,
    fontSize: 11,
  },
  variantTierPro: {
    color: colors.accent,
  },
  variantSubtitle: {
    ...type.bodyMuted,
    fontSize: 12,
    marginTop: 2,
  },
  passRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginLeft: space.sm,
    flexShrink: 0,
    width: 132,
    justifyContent: "space-between",
  },
  passCurrency: {
    ...type.label,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: "right",
  },
  passPrice: {
    ...type.numeric,
    fontSize: 34,
    lineHeight: 36,
    color: colors.text,
    textAlign: "right",
  },
  passCta: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: space.md,
  },
  footer: {
    marginTop: space.xxl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    ...type.bodyMuted,
    textAlign: "center",
    fontSize: 12,
  },
  stateScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: layout.screenPadding,
  },
  stateIcon: {
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
  stateTitle: {
    ...type.display,
    color: colors.text,
    fontSize: 24,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  stateText: {
    ...type.bodyMuted,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: space.lg,
  },
  primaryBtn: {
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
  },
  primaryBtnText: {
    ...type.label,
    color: colors.accentInk,
    fontWeight: "800",
  },
});
