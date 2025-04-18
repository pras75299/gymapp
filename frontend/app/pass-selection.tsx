import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { gymApi } from "../src/api/gymApi";
import type { PassType } from "../src/api/gymApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PassSelection() {
  const params = useLocalSearchParams<{ gymId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [passes, setPasses] = useState<PassType[]>([]);
  const [gymName, setGymName] = useState<string>("");
  const [hasActivePass, setHasActivePass] = useState(false);

  useEffect(() => {
    if (!params.gymId) {
      Alert.alert("Error", "No gym ID provided. Please scan a valid QR code.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
      return;
    }
    fetchPasses();
    checkActivePass();
  }, [params.gymId]);

  const checkActivePass = async () => {
    try {
      const deviceId = await AsyncStorage.getItem("deviceId");
      if (!deviceId) return;

      const activePasses = await gymApi.getActivePasses(deviceId);
      
      // If no active passes are found in the database but we have data in AsyncStorage
      if (activePasses.length === 0) {
        const storedPasses = await AsyncStorage.getItem("activePasses");
        if (storedPasses) {
          console.log("[PassSelection] Found stale pass data in AsyncStorage, clearing...");
          await AsyncStorage.multiRemove([
            "lastPurchasedPassId",
            "paymentAmount",
            "paymentCurrency",
            "activePasses"
          ]);
        }
      }
      
      setHasActivePass(activePasses.length > 0);
    } catch (error) {
      console.error("Error checking active passes:", error);
    }
  };

  const fetchPasses = async () => {
    try {
      const response = await gymApi.getGymByQrIdentifier(params.gymId);
      setGymName(response.name);
      setPasses(response.passes);
    } catch (error) {
      console.error("Error fetching passes:", error);
      Alert.alert("Error", "Could not load gym passes. Please try again.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePassSelection = async (pass: PassType) => {
    if (hasActivePass) {
      Alert.alert(
        "Active Pass Found",
        "You already have an active pass. Please wait until your current pass expires before purchasing a new one.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      console.log("[PassSelection] Initiating purchase for pass type:", pass.id);
      const result = await gymApi.purchasePass(pass.id);
      console.log("[PassSelection] Purchase initiated, got purchased pass ID:", result.passId);
      
      router.push({
        pathname: "/payment",
        params: {
          passId: result.passId,
          amount: result.amount.toString(),
          currency: result.currency,
          orderId: result.orderId,
          keyId: result.keyId,
        },
      });
    } catch (error) {
      console.error("[PassSelection] Error initiating purchase:", error);
      Alert.alert("Error", "Could not initiate purchase. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.gymName}>{gymName}</Text>
      {hasActivePass && (
        <View style={styles.activePassBanner}>
          <Text style={styles.activePassText}>
            You already have an active pass
          </Text>
        </View>
      )}
      {passes.map((pass) => (
        <TouchableOpacity
          key={pass.id}
          style={[
            styles.passCard,
            hasActivePass && styles.disabledPassCard,
          ]}
          onPress={() => handlePassSelection(pass)}
          disabled={hasActivePass}
        >
          <Text style={styles.passName}>{pass.name}</Text>
          <Text style={styles.passDuration}>{pass.duration} days</Text>
          <Text style={styles.passPrice}>
            {pass.currency} {pass.price}
          </Text>
          {hasActivePass && (
            <Text style={styles.disabledText}>
              Available after current pass expires
            </Text>
          )}
        </TouchableOpacity>
      ))}
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
  gymName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
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
  },
  disabledPassCard: {
    opacity: 0.6,
    backgroundColor: "#f0f0f0",
  },
  passName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  passDuration: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  passPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
  },
  disabledText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  activePassBanner: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  activePassText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
});
