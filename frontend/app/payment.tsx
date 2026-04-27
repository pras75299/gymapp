import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview/lib/WebViewTypes";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { gymApi } from "../src/api/gymApi";
import {
  PAYMENT_MANUAL_CLOSE_TIMEOUT,
  PAYMENT_TIMEOUT,
  PAYMENT_SUCCESS_REDIRECT_DELAY,
  ERROR_MESSAGES,
} from "../src/constants/app";
import { logger } from "../src/utils/logger";
import { useAuth } from "../src/contexts/AuthContext";
import { colors, radius, space, type, layout } from "../src/theme";

declare global {
  interface Window {
    ReactNativeWebView: {
      postMessage: (message: string) => void;
    };
  }
}

export default function PaymentScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const params = useLocalSearchParams<{
    passId: string;
    amount: string;
    currency: string;
    orderId: string;
    keyId: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState("");
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [showManualClose, setShowManualClose] = useState(false);
  const [purchasedPassId, setPurchasedPassId] = useState<string>("");
  const isSafeId = (value: string) => /^[a-zA-Z0-9_:-]{3,128}$/.test(value);
  const isSafeCurrency = (value: string) => /^[A-Z]{3}$/.test(value);
  const escapeForJsString = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r?\n/g, "");
  const handledSuccessRef = useRef(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    validateAndInitializePayment();

    closeTimerRef.current = setTimeout(() => {
      setShowManualClose(true);
    }, PAYMENT_MANUAL_CLOSE_TIMEOUT);

    paymentTimeoutRef.current = setTimeout(() => {
      if (!paymentCompleted) {
        logger.warn("Payment timeout reached");
        router.replace({
          pathname: "/my-passes",
          params: { paymentError: ERROR_MESSAGES.PAYMENT_TIMEOUT },
        });
      }
    }, PAYMENT_TIMEOUT);

    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const validateAndInitializePayment = () => {
    const { passId, amount, currency, orderId, keyId } = params;

    if (!userId) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (!passId || !amount || !currency || !orderId || !keyId) {
      logger.error("Missing payment parameters", {
        passId,
        amount,
        currency,
        orderId,
        keyId,
      });
      router.replace({
        pathname: "/my-passes",
        params: { paymentError: "Missing payment parameters" },
      });
      return;
    }

    const trimmedPassId = passId.trim();
    const trimmedOrderId = orderId.trim();
    const trimmedKeyId = keyId.trim();
    const normalizedCurrency = currency.trim().toUpperCase();
    const numericAmount = Number(amount);

    if (
      !isSafeId(trimmedPassId) ||
      !isSafeId(trimmedOrderId) ||
      !isSafeId(trimmedKeyId) ||
      !isSafeCurrency(normalizedCurrency) ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      logger.error("Invalid payment parameters");
      router.replace({
        pathname: "/my-passes",
        params: { paymentError: "Invalid payment parameters" },
      });
      return;
    }

    setPurchasedPassId(trimmedPassId);

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        </head>
        <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0B0B0C;">
          <script>
            function handlePaymentSuccess(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                data: response
              }));
            }

            const options = {
              key: '${escapeForJsString(trimmedKeyId)}',
              amount: ${Math.round(numericAmount * 100)},
              currency: '${escapeForJsString(normalizedCurrency)}',
              name: "Gym Pass",
              order_id: '${escapeForJsString(trimmedOrderId)}',
              handler: handlePaymentSuccess,
              theme: { color: '#0B0B0C' },
              modal: {
                ondismiss: function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: "modal_closed"
                  }));
                },
                escape: false,
                confirm_close: true,
                handleback: false
              },
              notes: {
                passId: '${escapeForJsString(trimmedPassId)}'
              }
            };

            const rzp = new Razorpay(options);
            rzp.open();

            rzp.on('payment.failed', function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "payment_failed",
                data: response
              }));
            });
          </script>
        </body>
      </html>
    `;

    setHtmlContent(content);
    setLoading(false);
  };

  const handlePaymentResponse = async (event: WebViewMessageEvent) => {
    try {
      const response = JSON.parse(event.nativeEvent.data);
      logger.info("Payment response received", { type: response.type });

      if (response.type === "success") {
        if (handledSuccessRef.current) {
          logger.warn("Duplicate payment success event ignored");
          return;
        }
        handledSuccessRef.current = true;
        if (
          !response?.data?.razorpay_payment_id ||
          !isSafeId(response.data.razorpay_payment_id)
        ) {
          throw new Error("Invalid payment response");
        }

        try {
          const deviceId = await AsyncStorage.getItem("deviceId");
          if (!deviceId) throw new Error(ERROR_MESSAGES.DEVICE_ID_REQUIRED);
          if (!purchasedPassId || purchasedPassId.trim() === "") {
            throw new Error("Pass ID not available");
          }
          if (!userId) throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED);

          logger.info("Verifying payment with backend", {
            passId: purchasedPassId,
            userId,
          });
          await gymApi.confirmPayment(
            purchasedPassId,
            response.data.razorpay_payment_id,
            userId
          );
          logger.info("Payment verified successfully");

          await AsyncStorage.multiSet([
            ["lastPurchasedPassId", purchasedPassId],
            ["paymentAmount", params.amount],
            ["paymentCurrency", params.currency],
          ]);

          if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
          if (paymentTimeoutRef.current)
            clearTimeout(paymentTimeoutRef.current);

          setPaymentCompleted(true);
          setShowManualClose(false);

          redirectTimerRef.current = setTimeout(() => {
            router.replace("/my-passes");
          }, PAYMENT_SUCCESS_REDIRECT_DELAY);
        } catch (error) {
          handledSuccessRef.current = false;
          logger.error("Payment verification failed", error);
          router.replace({
            pathname: "/my-passes",
            params: { paymentError: ERROR_MESSAGES.PAYMENT_VERIFICATION_FAILED },
          });
        }
      } else if (response.type === "payment_failed") {
        logger.warn("Payment failed");
        handledSuccessRef.current = false;
        router.replace({
          pathname: "/my-passes",
          params: { paymentError: ERROR_MESSAGES.PAYMENT_FAILED },
        });
      } else if (response.type === "modal_closed" && !paymentCompleted) {
        handledSuccessRef.current = false;
        logger.info("Payment modal closed by user");
        router.back();
      }
    } catch (error) {
      handledSuccessRef.current = false;
      logger.error("Payment processing error", error);
      router.replace({
        pathname: "/my-passes",
        params: { paymentError: ERROR_MESSAGES.PAYMENT_PROCESSING_FAILED },
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.stateScreen}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.eyebrow}>Step 03 / 03</Text>
        <Text style={styles.stateTitle}>Opening{"\n"}checkout…</Text>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
        <Text style={styles.stateSub}>
          Securing your transaction with Razorpay
        </Text>
      </View>
    );
  }

  if (paymentCompleted) {
    return (
      <View style={styles.stateScreen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.successBadge}>
          <Ionicons name="checkmark" size={36} color={colors.accentInk} />
        </View>
        <Text style={styles.eyebrow}>Confirmed</Text>
        <Text style={styles.stateTitle}>
          Payment{"\n"}
          <Text style={styles.titleAccent}>received.</Text>
        </Text>
        <View style={styles.redirectRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.stateSub}>
            Generating your entry QR code…
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <WebView
        source={{ html: htmlContent }}
        onMessage={handlePaymentResponse}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["https://*", "about:blank"]}
        startInLoadingState
        onNavigationStateChange={(navState) => {
          logger.debug("Navigation state changed", { url: navState.url });
          if (
            navState.url.includes("/callback/") &&
            navState.url.includes("status=authorized")
          ) {
            logger.info("Detected successful payment in callback URL");
            const paymentId = navState.url.split("payments/")[1]?.split("/")[0];
            if (paymentId) {
              logger.info("Extracted payment ID from URL", { paymentId });
              handlePaymentResponse({
                nativeEvent: {
                  data: JSON.stringify({
                    type: "success",
                    data: { razorpay_payment_id: paymentId },
                  }),
                },
              } as WebViewMessageEvent);
            }
          }
          if (navState.url.includes("axisbank") && !paymentCompleted) {
            setShowManualClose(true);
          }
        }}
        onError={(error) => {
          logger.error("WebView error", error);
          router.replace({
            pathname: "/my-passes",
            params: { paymentError: "Payment error occurred" },
          });
        }}
      />

      {showManualClose && !paymentCompleted && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            logger.info("Manual close button pressed");
            router.back();
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={16} color={colors.text} />
          <Text style={styles.closeButtonText}>Close payment</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  webview: { flex: 1, backgroundColor: colors.bg },
  stateScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.topPadding + 24,
    paddingBottom: 60,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.accent,
    marginBottom: space.md,
  },
  stateTitle: {
    ...type.display,
    color: colors.text,
    fontSize: 48,
    lineHeight: 46,
    marginBottom: space.xxl,
  },
  titleAccent: { color: colors.accent, fontStyle: "italic" },
  stateSub: {
    ...type.bodyMuted,
    fontSize: 14,
    marginLeft: space.md,
  },
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
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xl,
  },
  redirectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: space.md,
  },
  closeButton: {
    position: "absolute",
    bottom: 30,
    right: layout.screenPadding,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    gap: 6,
  },
  closeButtonText: {
    ...type.label,
    color: colors.text,
    fontSize: 12,
  },
});
