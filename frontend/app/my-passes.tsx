import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Text,
  Alert,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { gymApi } from "../src/api/gymApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PurchasedPass } from "../src/types";
import { useLocalSearchParams } from "expo-router";

export default function MyPassesScreen() {
  const [activePasses, setActivePasses] = useState<PurchasedPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string | null>(null);
  const [paymentCurrency, setPaymentCurrency] = useState<string | null>(null);
  const params = useLocalSearchParams();

  const clearPassData = async () => {
    try {
      await AsyncStorage.multiRemove([
        "lastPurchasedPassId",
        "paymentAmount",
        "paymentCurrency",
        "activePasses"
      ]);
      console.log("[MyPasses] Cleared all pass data from AsyncStorage");
    } catch (error) {
      console.error("[MyPasses] Error clearing pass data:", error);
    }
  };

  const fetchPasses = useCallback(async () => {
    try {
      const deviceId = await AsyncStorage.getItem("deviceId");
      if (!deviceId) {
        setError("Device ID not found");
        return;
      }

      const passes = await gymApi.getActivePasses(deviceId);
      setActivePasses(passes);

      // If no passes are found in the database but we have data in AsyncStorage
      if (passes.length === 0) {
        const storedPasses = await AsyncStorage.getItem("activePasses");
        if (storedPasses) {
          console.log("[MyPasses] Found stale pass data in AsyncStorage, clearing...");
          await clearPassData();
        }
      }

      // Clear any pending payment data after successful fetch
      const lastPassId = await AsyncStorage.getItem("lastPurchasedPassId");
      if (lastPassId) {
        const newPass = passes.find((pass) => pass.id === lastPassId);
        if (newPass && newPass.paymentStatus === "succeeded") {
          await AsyncStorage.multiRemove([
            "lastPurchasedPassId",
            "paymentAmount",
            "paymentCurrency",
          ]);
        }
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching passes:", err);
      setError("Failed to load passes. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setVerifyingPayment(false);
    }
  }, []);

  useEffect(() => {
    fetchPasses();
    // Poll for updates every 5 seconds until we have passes
    const pollInterval = setInterval(() => {
      if (activePasses.length === 0) {
        fetchPasses();
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [fetchPasses]);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading passes...</Text>
      </View>
    );
  }

  // Handle payment verification state
  const pendingVerification = verifyingPayment || params?.paymentProcessing;
  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <View style={styles.paymentStatusContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.paymentStatusText}>
            Verifying your payment...
          </Text>
          {paymentAmount && paymentCurrency && (
            <Text style={styles.paymentDetails}>
              {paymentCurrency} {paymentAmount}
            </Text>
          )}
          <Text style={styles.paymentStatusSubText}>
            This may take a few moments
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchPasses}>
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Handle payment error
  if (params?.paymentError) {
    return (
      <View style={styles.container}>
        <View style={styles.paymentStatusContainer}>
          <Text style={styles.errorText}>{params.paymentError}</Text>
          <Text style={styles.subText}>
            Please check your passes or try again later
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchPasses}>
            <Text style={styles.refreshButtonText}>Refresh Passes</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {activePasses.length > 0 ? (
        activePasses.map((pass) => (
          <View key={pass.id} style={styles.passCard}>
            <Text style={styles.passName}>{pass.passType.name}</Text>
            {pass.qrCodeValue && (
              <View style={styles.qrContainer}>
                <QRCode
                  value={pass.qrCodeValue}
                  size={200}
                  backgroundColor="white"
                  color="#000"
                />
                <Text style={styles.qrLabel}>Your Entry QR Code</Text>
              </View>
            )}
            <Text style={styles.expiryDate}>
              Expires: {new Date(pass.expiryDate).toLocaleDateString()}
            </Text>
            <Text style={[styles.status, pass.isActive ? styles.activeStatus : styles.inactiveStatus]}>
              {pass.isActive ? "Active" : "Expired"}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.noPasses}>No active passes found</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  passCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 60,
  },
  passName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    marginTop: 16,
  },
  qrContainer: {
    alignItems: "center",
    marginVertical: 0,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 8,
  },
  expiryDate: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    textAlign: "center",
  },
  status: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
    textAlign: "center",
  },
  activeStatus: {
    color: "#4CAF50",
  },
  inactiveStatus: {
    color: "#F44336",
  },
  noPasses: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 20,
    color: "#666",
    fontSize: 16,
  },
  errorText: {
    color: "#F44336",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  refreshButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  paymentStatusContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 100,
  },
  paymentStatusText: {
    marginTop: 20,
    fontSize: 18,
    color: "#333",
  },
  paymentDetails: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  paymentStatusSubText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  subText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  qrLabel: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
