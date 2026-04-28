import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { gymApi } from "../src/api/gymApi";
import {
  QR_CODE_VALIDATION_DOMAIN,
  ERROR_MESSAGES,
} from "../src/constants/app";
import { logger } from "../src/utils/logger";
import { colors, radius, space, type, layout } from "../src/theme";

const getAllowedValidationHosts = (): string[] => {
  const configuredHosts = QR_CODE_VALIDATION_DOMAIN.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).hostname.toLowerCase();
      } catch {
        return value;
      }
    });

  return Array.from(new Set(configuredHosts));
};

const isAllowedValidationHost = (hostname: string): boolean => {
  const normalizedHostname = hostname.trim().toLowerCase();
  const allowedHosts = getAllowedValidationHosts();
  return allowedHosts.includes(normalizedHostname);
};

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, [permission]);

  useEffect(() => {
    setScanned(false);
    setError(null);
    setResult(null);
    isProcessingRef.current = false;
  }, []);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setScanned(true);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const qrData = result.data.trim();
      const isUrl =
        qrData.startsWith("http://") || qrData.startsWith("https://");

      if (!isUrl) {
        logger.debug("Scanning gym QR code");
        try {
          await gymApi.getGymByQrIdentifier(qrData);
          router.replace({
            pathname: "/pass-selection",
            params: { qrIdentifier: qrData },
          });
          return;
        } catch (gymError) {
          throw gymError;
        }
      }

      let url: URL;
      try {
        url = new URL(qrData);
      } catch {
        throw new Error(ERROR_MESSAGES.INVALID_QR_FORMAT);
      }

      if (!isAllowedValidationHost(url.hostname)) {
        logger.warn("QR code from unknown source");
        throw new Error(ERROR_MESSAGES.INVALID_QR_SOURCE);
      }

      logger.debug("Validating pass QR code");
      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to validate pass");
      }

      setResult(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process QR code";
      setError(errorMessage);

      if (err instanceof Error) {
        const isTimeout =
          errorMessage.includes("timeout") ||
          errorMessage.includes("Connection timeout");
        const isNetworkError =
          errorMessage.includes("Unable to connect") ||
          errorMessage.includes("network");

        if (isTimeout || isNetworkError) {
          logger.warn("QR code validation timeout/network error", err);
        } else {
          logger.error("QR code validation error", err);
        }
      } else {
        logger.error("QR code validation error", err);
      }

      setScanned(false);
      isProcessingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.permissionScreen}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.permissionTitle}>Camera</Text>
        <Text style={styles.permissionMessage}>
          Requesting camera permission…
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <View style={styles.permissionIcon}>
          <Ionicons name="camera-outline" size={32} color={colors.accent} />
        </View>
        <Text style={styles.permissionTitle}>Camera blocked</Text>
        <Text style={styles.permissionMessage}>
          Enable camera access in your device settings to scan QR codes.
        </Text>
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.ghostBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      <View style={styles.viewfinderMask}>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <View style={styles.scanLine} />
        </View>
      </View>

      <View style={styles.bottomCard} pointerEvents="box-none">
        <Text style={styles.eyebrow}>Step 01 / 03</Text>
        <Text style={styles.helper}>
          Align the QR code inside the frame.
        </Text>
        <Text style={styles.helperSub}>
          Holds steady? You&apos;ll be on your pass selection in a moment.
        </Text>
      </View>

      {loading && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.modalTitle}>Verifying</Text>
            <Text style={styles.modalText}>Reading the QR code…</Text>
          </View>
        </View>
      )}

      {error && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconError}>
              <Ionicons name="alert" size={26} color={colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Couldn&apos;t scan</Text>
            <Text style={styles.modalText}>{error}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setScanned(false);
                setError(null);
                isProcessingRef.current = false;
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {result && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconError,
                {
                  borderColor: result.valid ? colors.success : colors.danger,
                  backgroundColor: result.valid
                    ? "rgba(93,255,161,0.1)"
                    : "rgba(255,72,72,0.12)",
                },
              ]}
            >
              <Ionicons
                name={result.valid ? "checkmark" : "close"}
                size={26}
                color={result.valid ? colors.success : colors.danger}
              />
            </View>
            <Text style={styles.modalTitle}>
              {result.valid ? "Valid pass" : "Invalid pass"}
            </Text>
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
              <DetailRow label="Status" value={result.passDetails.status} last />
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setScanned(false);
                setResult(null);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Scan another</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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

const FRAME = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  permissionScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: layout.screenPadding,
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  permissionTitle: {
    ...type.display,
    color: colors.text,
    fontSize: 28,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  permissionMessage: {
    ...type.bodyMuted,
    textAlign: "center",
    maxWidth: 280,
  },
  ghostBtn: {
    marginTop: space.xl,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
  },
  ghostBtnText: {
    ...type.label,
    color: colors.text,
  },
  viewfinderMask: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  viewfinder: {
    width: FRAME,
    height: FRAME,
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: colors.accent,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: "absolute",
    left: 8,
    right: 8,
    top: "50%",
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.7,
  },
  bottomCard: {
    position: "absolute",
    left: layout.screenPadding,
    right: layout.screenPadding,
    bottom: 40,
    padding: space.lg,
    backgroundColor: "rgba(11,11,12,0.85)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.accent,
    marginBottom: space.sm,
  },
  helper: {
    ...type.body,
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  helperSub: {
    ...type.bodyMuted,
    marginTop: 4,
    fontSize: 13,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: layout.screenPadding,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: "center",
  },
  modalIconError: {
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
  modalTitle: {
    ...type.display,
    color: colors.text,
    fontSize: 22,
    marginTop: space.sm,
    marginBottom: space.xs,
    textAlign: "center",
  },
  modalText: {
    ...type.bodyMuted,
    textAlign: "center",
    marginBottom: space.lg,
  },
  detailsBlock: {
    width: "100%",
    marginBottom: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  primaryBtn: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  primaryBtnText: {
    ...type.label,
    color: colors.accentInk,
    fontSize: 14,
    fontWeight: "800",
  },
});
