import React, { useState, useEffect } from "react";
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

declare global {
  interface Window {
    ReactNativeWebView: {
      postMessage: (message: string) => void;
    };
  }
}

export default function PaymentScreen() {
  const router = useRouter();
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

  useEffect(() => {
    validateAndInitializePayment();

    const closeTimer = setTimeout(() => {
      setShowManualClose(true);
    }, 30000);

    const paymentTimeout = setTimeout(() => {
      if (!paymentCompleted) {
        router.replace({
          pathname: "/my-passes",
          params: { paymentError: "Payment timeout" },
        });
      }
    }, 300000);

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(paymentTimeout);
    };
  }, []);

  const validateAndInitializePayment = () => {
    const { passId, amount, currency, orderId, keyId } = params;

    if (!passId || !amount || !currency || !orderId || !keyId) {
      router.replace({
        pathname: "/my-passes",
        params: { paymentError: "Missing payment parameters" },
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
      console.log("[Payment] Received payment response:", response.type);

      if (response.type === "success") {
        try {
          const deviceId = await AsyncStorage.getItem("deviceId");
          if (!deviceId) throw new Error("Device ID not found");

          // 1. First verify payment with backend using stored pass ID
          console.log("[Payment] Verifying payment with backend...");
          console.log("[Payment] Using pass ID:", purchasedPassId);
          await gymApi.confirmPayment(
            purchasedPassId,
            response.data.razorpay_payment_id,
            deviceId
          );
          console.log("[Payment] Payment verified successfully");

          // 2. After verification success, store details
          console.log("[Payment] Storing payment details...");
          await AsyncStorage.multiSet([
            ["lastPurchasedPassId", purchasedPassId],
            ["paymentAmount", params.amount],
            ["paymentCurrency", params.currency],
          ]);
          console.log("[Payment] Payment details stored");

          // 3. Show success screen
          console.log("[Payment] Showing success screen");
          setPaymentCompleted(true);
          setShowManualClose(false);

          // 4. Redirect after delay
          console.log("[Payment] Starting redirect timer");
          setTimeout(() => {
            console.log("[Payment] Redirecting to my-passes now");
            router.replace("/my-passes");
          }, 2000);

        } catch (error) {
          console.error("[Payment] Payment verification failed:", error);
          router.replace({
            pathname: "/my-passes",
            params: { paymentError: "Payment verification failed" },
          });
        }
      } else if (response.type === "payment_failed") {
        console.log("[Payment] Payment failed");
        router.replace({
          pathname: "/my-passes",
          params: { paymentError: "Payment failed" },
        });
      } else if (response.type === "modal_closed" && !paymentCompleted) {
        console.log("[Payment] Payment modal closed by user");
        router.back();
      }
    } catch (error) {
      console.error("[Payment] Payment processing error:", error);
      router.replace({
        pathname: "/my-passes",
        params: { paymentError: "Payment processing failed" },
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
          console.log("[Payment] Navigation state changed:", navState.url);
          
          // Check for Razorpay callback URL with successful payment
          if (navState.url.includes('/callback/') && navState.url.includes('status=authorized')) {
            console.log("[Payment] Detected successful payment in callback URL");
            
            // Extract payment ID from URL
            const paymentId = navState.url.split('payments/')[1]?.split('/')[0];
            if (paymentId) {
              console.log("[Payment] Extracted payment ID:", paymentId);
              
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
          console.error("[Payment] WebView Error:", error);
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
            console.log("[Payment] Manual close button pressed");
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
