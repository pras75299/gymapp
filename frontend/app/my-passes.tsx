import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Text,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { gymApi } from "../src/api/gymApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ExerciseEquipmentBucket,
  ExerciseGoal,
  PurchasedPass,
} from "../src/types";
import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";
import { PASSES_POLLING_INTERVAL, ERROR_MESSAGES } from "../src/constants/app";
import { logger } from "../src/utils/logger";
import { colors, radius, space, type, layout } from "../src/theme";
import {
  EXERCISE_BUCKETS,
  EXERCISE_GOALS,
  getBucketLabel,
  getExercises,
  getGoalLabel,
} from "../src/services/exercisePlans";

export default function MyPassesScreen() {
  const { userId, isPro } = useAuth();
  const [activePasses, setActivePasses] = useState<PurchasedPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string | null>(null);
  const [paymentCurrency, setPaymentCurrency] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<ExerciseGoal>("maintain_weight");
  const [selectedBucket, setSelectedBucket] =
    useState<ExerciseEquipmentBucket>("with_treadmill");
  const params = useLocalSearchParams();
  const router = useRouter();
  const paymentErrorParam =
    typeof params?.paymentError === "string" ? params.paymentError : null;
  const safePaymentError = paymentErrorParam
    ? paymentErrorParam.slice(0, 120)
    : null;
  const activePassesRef = useRef<PurchasedPass[]>([]);

  const clearPassData = async () => {
    try {
      await AsyncStorage.multiRemove([
        "lastPurchasedPassId",
        "paymentAmount",
        "paymentCurrency",
        "activePasses",
      ]);
      logger.debug("Cleared all pass data from AsyncStorage");
    } catch (error) {
      logger.error("Error clearing pass data", error);
    }
  };

  const fetchPasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const deviceId = await AsyncStorage.getItem("deviceId");
      if (!userId) {
        router.replace("/(auth)/sign-in");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!deviceId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const fetchedPasses = await gymApi.getActivePasses(deviceId, userId);
      setActivePasses(fetchedPasses);
      activePassesRef.current = fetchedPasses;

      if (fetchedPasses.length === 0) {
        const storedPasses = await AsyncStorage.getItem("activePasses");
        if (storedPasses) {
          logger.debug("Found stale pass data in AsyncStorage, clearing...");
          await clearPassData();
        }
      }

      const lastPassId = await AsyncStorage.getItem("lastPurchasedPassId");
      if (lastPassId) {
        const newPass = fetchedPasses.find((pass) => pass.id === lastPassId);
        if (newPass && newPass.paymentStatus === "succeeded") {
          await AsyncStorage.multiRemove([
            "lastPurchasedPassId",
            "paymentAmount",
            "paymentCurrency",
          ]);
        }
      }
    } catch (err) {
      logger.error("Error fetching passes", err);
      setError(ERROR_MESSAGES.FETCH_ACTIVE_PASSES_FAILED);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setVerifyingPayment(false);
    }
  }, [userId, router]);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchPasses();
    if (userId) {
      pollIntervalRef.current = setInterval(() => {
        if (activePassesRef.current.length === 0) {
          fetchPasses();
        }
      }, PASSES_POLLING_INTERVAL);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchPasses, userId]);

  useEffect(() => {
    const loadPaymentDetails = async () => {
      const amount = await AsyncStorage.getItem("paymentAmount");
      const currency = await AsyncStorage.getItem("paymentCurrency");
      setPaymentAmount(amount);
      setPaymentCurrency(currency);
    };
    loadPaymentDetails();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPasses();
  }, [fetchPasses]);

  const selectedExercises = getExercises(selectedGoal, selectedBucket);

  if (loading) {
    return (
      <View style={styles.stateScreen}>
        <Text style={styles.eyebrow}>Loading</Text>
        <Text style={styles.stateTitle}>Fetching{"\n"}your passes…</Text>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  const pendingVerification = verifyingPayment || params?.paymentProcessing;
  if (pendingVerification) {
    return (
      <View style={styles.stateScreen}>
        <Text style={styles.eyebrow}>Verifying payment</Text>
        <Text style={styles.stateTitle}>One{"\n"}moment…</Text>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
        {paymentAmount && paymentCurrency && (
          <Text style={styles.amountChip}>
            {paymentCurrency} {paymentAmount}
          </Text>
        )}
        <Text style={styles.stateSub}>
          This may take a few moments to confirm.
        </Text>
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={fetchPasses}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={16} color={colors.text} />
          <Text style={styles.ghostBtnText}>Refresh status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (safePaymentError) {
    return (
      <View style={styles.stateScreen}>
        <View style={styles.errIcon}>
          <Ionicons name="alert" size={26} color={colors.danger} />
        </View>
        <Text style={styles.eyebrow}>Payment issue</Text>
        <Text style={styles.stateTitle}>{safePaymentError}</Text>
        <Text style={styles.stateSub}>
          Check your passes or try again later.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={fetchPasses}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={16} color={colors.accentInk} />
          <Text style={styles.primaryBtnText}>Refresh passes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <Text style={styles.eyebrow}>Your wallet</Text>
        <Text style={styles.title}>
          Active{"\n"}
          <Text style={styles.titleAccent}>passes.</Text>
        </Text>

        {activePasses.length > 0 ? (
          activePasses.map((pass) => (
            <View key={pass.id} style={styles.ticket}>
              <View style={styles.notchTop} />
              <View style={styles.notchBottom} />

              <View style={styles.ticketHeader}>
                <View>
                  <Text style={styles.passEyebrow}>Pass</Text>
                  <Text style={styles.passName}>{pass.passType.name}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    pass.isActive ? styles.statusActive : styles.statusInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: pass.isActive
                          ? colors.success
                          : colors.danger,
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {pass.isActive ? "ACTIVE" : "EXPIRED"}
                  </Text>
                </View>
              </View>

              {pass.qrCodeValue && (
                <View style={styles.qrWrap}>
                  <View style={styles.qrFrame}>
                    <QRCode
                      value={pass.qrCodeValue}
                      size={200}
                      backgroundColor="#FFFFFF"
                      color={colors.accentInk}
                    />
                  </View>
                  <Text style={styles.qrCaption}>
                    SHOW AT GYM ENTRANCE
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expires</Text>
                <Text style={styles.detailValue}>
                  {new Date(pass.expiryDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="ticket-outline"
                size={28}
                color={colors.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>No active passes</Text>
            <Text style={styles.emptyText}>
              Scan a gym QR code to grab your first pass.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.emptyScanBtn]}
              onPress={() => router.push("/qr-scanner")}
              activeOpacity={0.85}
            >
              <Ionicons name="qr-code" size={16} color={colors.accentInk} />
              <Text style={styles.primaryBtnText}>Scan QR code</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.planSection}>
          <Text style={styles.planEyebrow}>Pro membership</Text>
          <Text style={styles.planTitle}>Exercise splits</Text>
          {isPro ? (
            <>
              <View style={styles.segmentRow}>
                {EXERCISE_GOALS.map((goal) => {
                  const active = goal === selectedGoal;
                  return (
                    <TouchableOpacity
                      key={goal}
                      style={[styles.segmentChip, active && styles.segmentChipActive]}
                      onPress={() => setSelectedGoal(goal)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.segmentChipText,
                          active && styles.segmentChipTextActive,
                        ]}
                      >
                        {getGoalLabel(goal)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.segmentRow}>
                {EXERCISE_BUCKETS.map((bucket) => {
                  const active = bucket === selectedBucket;
                  return (
                    <TouchableOpacity
                      key={bucket}
                      style={[styles.segmentChip, active && styles.segmentChipActive]}
                      onPress={() => setSelectedBucket(bucket)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.segmentChipText,
                          active && styles.segmentChipTextActive,
                        ]}
                      >
                        {getBucketLabel(bucket)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.exerciseList}>
                {selectedExercises.map((exercise) => (
                  <View key={exercise.id} style={styles.exerciseCard}>
                    <View style={styles.exerciseHead}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseMeta}>
                        {exercise.sets} sets · {exercise.reps}
                      </Text>
                    </View>
                    {exercise.notes ? (
                      <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.proUpsellCard}>
              <Text style={styles.proUpsellTitle}>Unlock Pro training plans</Text>
              <Text style={styles.proUpsellText}>
                Get goal-based exercise splits for maintain, lose, and gain
                programs with equipment-specific options.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push("/pass-selection")}
                activeOpacity={0.85}
              >
                <Ionicons name="flash" size={16} color={colors.accentInk} />
                <Text style={styles.primaryBtnText}>Upgrade to Pro</Text>
              </TouchableOpacity>
            </View>
          )}
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
    padding: space.lg,
    marginBottom: space.lg,
    overflow: "hidden",
    position: "relative",
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
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.lg,
  },
  passEyebrow: {
    ...type.label,
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  passName: {
    ...type.display,
    color: colors.text,
    fontSize: 20,
    letterSpacing: -0.2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: "rgba(93,255,161,0.1)",
    borderColor: "rgba(93,255,161,0.4)",
  },
  statusInactive: {
    backgroundColor: "rgba(255,72,72,0.1)",
    borderColor: "rgba(255,72,72,0.4)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    ...type.label,
    color: colors.text,
    fontSize: 10,
  },
  qrWrap: { alignItems: "center", marginVertical: space.md },
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
    marginVertical: space.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: { ...type.label, color: colors.textMuted, fontSize: 11 },
  detailValue: { ...type.numeric, color: colors.text, fontSize: 14 },
  emptyState: {
    alignItems: "center",
    paddingVertical: space.xxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  emptyTitle: {
    ...type.display,
    color: colors.text,
    fontSize: 22,
    marginBottom: space.xs,
  },
  emptyText: {
    ...type.bodyMuted,
    textAlign: "center",
    fontSize: 13,
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
  stateSub: { ...type.bodyMuted, fontSize: 14, marginTop: space.md },
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
  amountChip: {
    ...type.numeric,
    fontSize: 20,
    color: colors.accent,
    marginTop: space.md,
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    marginTop: space.lg,
    alignSelf: "flex-start",
  },
  ghostBtnText: { ...type.label, color: colors.text, fontSize: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: space.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
    marginTop: space.lg,
  },
  emptyScanBtn: {
    alignSelf: "center",
  },
  primaryBtnText: {
    ...type.label,
    color: colors.accentInk,
    fontSize: 13,
    fontWeight: "800",
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
  planSection: {
    marginTop: space.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.xl,
  },
  planEyebrow: {
    ...type.eyebrow,
    color: colors.accent,
    marginBottom: space.xs,
  },
  planTitle: {
    ...type.display,
    color: colors.text,
    fontSize: 28,
    marginBottom: space.lg,
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginBottom: space.md,
  },
  segmentChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  segmentChipActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(215,254,52,0.12)",
  },
  segmentChipText: {
    ...type.label,
    color: colors.textMuted,
    fontSize: 10,
  },
  segmentChipTextActive: {
    color: colors.accent,
  },
  exerciseList: {
    marginTop: space.sm,
    gap: space.sm,
  },
  exerciseCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.md,
  },
  exerciseHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
  },
  exerciseName: {
    ...type.body,
    color: colors.text,
    fontWeight: "700",
    flex: 1,
  },
  exerciseMeta: {
    ...type.label,
    color: colors.accent,
    fontSize: 10,
  },
  exerciseNotes: {
    ...type.bodyMuted,
    marginTop: 6,
    fontSize: 12,
  },
  proUpsellCard: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.lg,
  },
  proUpsellTitle: {
    ...type.display,
    color: colors.text,
    fontSize: 20,
    marginBottom: space.sm,
  },
  proUpsellText: {
    ...type.bodyMuted,
    fontSize: 13,
  },
});
