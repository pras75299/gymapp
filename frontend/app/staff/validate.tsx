import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { gymApi } from "../../src/api/gymApi";
import { logger } from "../../src/utils/logger";
import { colors, radius, space, type, layout } from "../../src/theme";

export default function ValidateQrScreen() {
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleValidate = async () => {
    if (!qrCode.trim()) {
      setError("Please enter a QR code");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await gymApi.validateQrCode(qrCode);
      setResult(response);
    } catch (err) {
      setError("Failed to validate QR code");
      logger.error("Validation error", err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setQrCode("");
    setResult(null);
    setError(null);
  };

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
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
              <Text style={styles.backChipText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.staffBadge}>
              <View style={styles.staffDot} />
              <Text style={styles.staffText}>STAFF MODE</Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>Entry control</Text>
          <Text style={styles.title}>
            Validate{"\n"}
            <Text style={styles.titleAccent}>pass.</Text>
          </Text>
          <Text style={styles.lede}>
            Enter the QR code value to verify a member's pass.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>QR code value</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste or enter QR value"
              placeholderTextColor={colors.textDim}
              value={qrCode}
              onChangeText={setQrCode}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleValidate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.accentInk} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Validate</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={colors.accentInk}
                  />
                </>
              )}
            </TouchableOpacity>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert" size={16} color={colors.danger} />
                <Text style={styles.errorBoxText}>{error}</Text>
              </View>
            )}

            {result && (
              <View
                style={[
                  styles.resultCard,
                  result.valid ? styles.resultValid : styles.resultInvalid,
                ]}
              >
                <View style={styles.resultHeader}>
                  <View
                    style={[
                      styles.resultBadge,
                      {
                        borderColor: result.valid
                          ? colors.success
                          : colors.danger,
                        backgroundColor: result.valid
                          ? "rgba(93,255,161,0.1)"
                          : "rgba(255,72,72,0.12)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={result.valid ? "checkmark" : "close"}
                      size={20}
                      color={result.valid ? colors.success : colors.danger}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultEyebrow}>Result</Text>
                    <Text
                      style={[
                        styles.resultTitle,
                        {
                          color: result.valid
                            ? colors.success
                            : colors.danger,
                        },
                      ]}
                    >
                      {result.valid ? "VALID PASS" : "INVALID PASS"}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsBlock}>
                  <DetailRow label="Pass" value={result.passDetails.passType} />
                  <DetailRow
                    label="Purchased"
                    value={new Date(
                      result.passDetails.purchaseDate
                    ).toLocaleDateString()}
                  />
                  <DetailRow
                    label="Expires"
                    value={new Date(
                      result.passDetails.expiryDate
                    ).toLocaleDateString()}
                  />
                  <DetailRow
                    label="Amount"
                    value={`${result.passDetails.amount} ${result.passDetails.currency}`}
                  />
                  <DetailRow
                    label="Status"
                    value={result.passDetails.status}
                    last
                  />
                </View>

                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={reset}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ghostBtnText}>Validate another</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  staffBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 6,
  },
  staffDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  staffText: {
    ...type.label,
    color: colors.accent,
    fontSize: 10,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.accent,
    marginBottom: space.md,
  },
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
    marginBottom: space.lg,
    fontFamily: type.numeric.fontFamily,
  },
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
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,72,72,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,72,72,0.4)",
    borderRadius: radius.sm,
    padding: space.md,
    marginTop: space.lg,
  },
  errorBoxText: {
    color: colors.danger,
    ...type.label,
    fontSize: 12,
    flex: 1,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.lg,
    marginTop: space.xl,
  },
  resultValid: { borderColor: "rgba(93,255,161,0.4)" },
  resultInvalid: { borderColor: "rgba(255,72,72,0.4)" },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  resultBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultEyebrow: {
    ...type.label,
    color: colors.textMuted,
    fontSize: 10,
  },
  resultTitle: {
    ...type.display,
    fontSize: 18,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: space.md,
  },
  detailsBlock: { marginBottom: space.md },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { ...type.label, color: colors.textMuted, fontSize: 11 },
  detailValue: {
    ...type.numeric,
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
    textAlign: "right",
    marginLeft: space.md,
  },
  ghostBtn: {
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    alignItems: "center",
    marginTop: space.sm,
  },
  ghostBtnText: {
    ...type.label,
    color: colors.text,
    fontSize: 12,
  },
});
