import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { gymApi } from "../src/api/gymApi";
import { PAYMENT_MANUAL_CLOSE_TIMEOUT, PAYMENT_TIMEOUT, PAYMENT_SUCCESS_REDIRECT_DELAY, ERROR_MESSAGES } from "../src/constants/app";
import { logger } from "../src/utils/logger";
import { useAuth } from "../src/contexts/AuthContext";

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
  
  // Use refs to track timers for proper cleanup
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const paymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    validateAndInitializePayment();

    closeTimerRef.current = setTimeout(() => {
      setShowManualClose(true);
    }, PAYMENT_MANUAL_CLOSE_TIMEOUT);

    paymentTimeoutRef.current = setTimeout(() => {
      if (!paymentCompleted) {
        logger.warn('Payment timeout reached');
        router.replace({
          pathname: "/my-passes",
          params: { paymentError: ERROR_MESSAGES.PAYMENT_TIMEOUT },
        });
      }
    }, PAYMENT_TIMEOUT);

    return () => {
      // Cleanup all timers on unmount
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const validateAndInitializePayment = () => {
    const { passId, amount, currency, orderId, keyId } = params;

    if (!passId || !amount || !currency || !orderId || !keyId) {
      logger.error('Missing payment parameters', { passId, amount, currency, orderId, keyId });
      router.replace({
        pathname: "/my-passes",
        params: { paymentError: "Missing payment parameters" },
      });
      return;
    }

    // Validate passId is not empty
    if (passId.trim() === "") {
      logger.error('Empty passId provided');
      router.replace({
        pathname: "/my-passes",
        params: { paymentError: "Invalid payment parameters" },
      });
      return;
    }

    // Store the pass ID for later use
    setPurchasedPassId(passId);

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        </head>
        <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
          <script>
            function handlePaymentSuccess(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                data: response
              }));
            }

            const options = {
              key: '${keyId}',
              amount: ${parseFloat(amount) * 100},
              currency: '${currency}',
              name: "Gym Pass",
              order_id: '${orderId}',
              handler: handlePaymentSuccess,
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
                passId: '${passId}'
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

  const handlePaymentResponse = async (event: any) => {
    try {
      const response = JSON.parse(event.nativeEvent.data);
      logger.info('Payment response received', { type: response.type });

      if (response.type === "success") {
        try {
          const deviceId = await AsyncStorage.getItem("deviceId");
          if (!deviceId) {
            throw new Error(ERROR_MESSAGES.DEVICE_ID_REQUIRED);
          }

          if (!purchasedPassId || purchasedPassId.trim() === "") {
            throw new Error("Pass ID not available");
          }

          if (!userId) {
            throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED);
          }

          // 1. First verify payment with backend using stored pass ID
          logger.info('Verifying payment with backend', { passId: purchasedPassId, userId });
          await gymApi.confirmPayment(
            purchasedPassId,
            response.data.razorpay_payment_id,
            userId
          );
          logger.info('Payment verified successfully');

          // 2. After verification success, store details
          await AsyncStorage.multiSet([
            ["lastPurchasedPassId", purchasedPassId],
            ["paymentAmount", params.amount],
            ["paymentCurrency", params.currency],
          ]);

          // 3. Clear timers before showing success
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
          }
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
          }

          // 4. Show success screen
          setPaymentCompleted(true);
          setShowManualClose(false);

          // 5. Redirect after delay
          redirectTimerRef.current = setTimeout(() => {
            router.replace("/my-passes");
          }, PAYMENT_SUCCESS_REDIRECT_DELAY);

        } catch (error) {
          logger.error('Payment verification failed', error);
          router.replace({
            pathname: "/my-passes",
            params: { paymentError: ERROR_MESSAGES.PAYMENT_VERIFICATION_FAILED },
          });
        }
      } else if (response.type === "payment_failed") {
        logger.warn('Payment failed');
        router.replace({
          pathname: "/my-passes",
          params: { paymentError: ERROR_MESSAGES.PAYMENT_FAILED },
        });
      } else if (response.type === "modal_closed" && !paymentCompleted) {
        logger.info('Payment modal closed by user');
        router.back();
      }
    } catch (error) {
      logger.error('Payment processing error', error);
      router.replace({
        pathname: "/my-passes",
        params: { paymentError: ERROR_MESSAGES.PAYMENT_PROCESSING_FAILED },
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Processing payment...</Text>
      </View>
    );
  }

  if (paymentCompleted) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.successContainer}>
          <View style={styles.checkmarkContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.successTitle}>PAYMENT{'\n'}SUCCESSFUL</Text>
          <ActivityIndicator size="small" color="#4CAF50" style={styles.redirectSpinner} />
          <Text style={styles.redirectText}>Redirecting to your passes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        onMessage={handlePaymentResponse}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onNavigationStateChange={(navState) => {
          logger.debug('Navigation state changed', { url: navState.url });

          // Check for Razorpay callback URL with successful payment
          if (navState.url.includes('/callback/') && navState.url.includes('status=authorized')) {
            logger.info('Detected successful payment in callback URL');

            // Extract payment ID from URL
            const paymentId = navState.url.split('payments/')[1]?.split('/')[0];
            if (paymentId) {
              logger.info('Extracted payment ID from URL', { paymentId });

              // Simulate the payment success response
              handlePaymentResponse({
                nativeEvent: {
                  data: JSON.stringify({
                    type: 'success',
                    data: {
                      razorpay_payment_id: paymentId
                    }
                  })
                }
              });
            }
          }

          // Show manual close for bank pages
          if (navState.url.includes("axisbank") && !paymentCompleted) {
            setShowManualClose(true);
          }
        }}
        onError={(error) => {
          logger.error('WebView error', error);
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
            logger.info('Manual close button pressed');
            router.back();
          }}
        >
          <Text style={styles.closeButtonText}>Close Payment</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  checkmark: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: 20,
  },
  redirectSpinner: {
    marginBottom: 10,
  },
  redirectText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  webview: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
