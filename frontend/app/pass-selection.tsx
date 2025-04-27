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
import { gymApi } from "../src/api/gymApi";
import type { PassType } from "../src/api/gymApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../src/contexts/AuthContext";

export default function PassSelectionScreen() {
  const { qrIdentifier } = useLocalSearchParams<{ qrIdentifier: string }>();
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passes, setPasses] = useState<PassType[]>([]);
  const [hasActivePass, setHasActivePass] = useState(false);

  useEffect(() => {
    const fetchPasses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch gym details using QR identifier
        const gym = await gymApi.getGymByQrIdentifier(qrIdentifier);
        setPasses(gym.passes);

        // Check for active passes
        const deviceId = await AsyncStorage.getItem("deviceId");
        if (deviceId && userId) {
          const activePasses = await gymApi.getActivePasses(deviceId, userId);
          setHasActivePass(activePasses.length > 0);
        }
      } catch (err) {
        console.error("Error fetching passes:", err);
        setError("Failed to fetch passes");
      } finally {
        setLoading(false);
      }
    };

    fetchPasses();
  }, [qrIdentifier, userId]);

  const handlePassSelect = async (passId: string) => {
    try {
      // Check if user is authenticated using Clerk's isSignedIn
      if (!isSignedIn) {
        // Store the selected pass ID and current route before redirecting to sign-in
        await AsyncStorage.multiSet([
          ["selectedPassId", passId],
          ["redirectAfterAuth", "/payment"],
        ]);
        // Redirect to the existing sign-in page
        router.push("/sign-in");
        return;
      }

      if (!userId) {
        throw new Error("User ID not found");
      }

      const deviceId = await AsyncStorage.getItem("deviceId");
      if (!deviceId) {
        throw new Error("Device ID not found");
      }

      // Proceed with purchasing the pass if authenticated
      const order = await gymApi.purchasePass(passId, userId, deviceId);
      router.push({
        pathname: "/payment",
        params: {
          passId: order.passId,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          keyId: order.keyId,
        },
      });
    } catch (err) {
      console.error("Error purchasing pass:", err);
      setError("Failed to purchase pass");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading passes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/")}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Veer's Gym Passes</Text>
      </View>

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
          style={[styles.passCard, hasActivePass && styles.disabledPass]}
          onPress={() => handlePassSelect(pass.id)}
          disabled={hasActivePass}
        >
          <Text style={styles.passName}>{pass.name}</Text>
          <Text style={styles.passPrice}>
            {pass.price} {pass.currency}
          </Text>
          <Text style={styles.passDuration}>
            Valid for {pass.duration} {pass.duration === 1 ? "day" : "days"}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
    width: "100%",
  },
  backButton: {
    position: "absolute",
    left: 0,
    padding: 0,
    paddingRight: 10,
  },
  backButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 20,
    color: "#666",
    textAlign: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 20,
  },
  passCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  passName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  passPrice: {
    fontSize: 16,
    color: "#007AFF",
    marginBottom: 5,
  },
  passDuration: {
    fontSize: 14,
    color: "#666",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    color: "#007AFF",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  activePassBanner: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  activePassText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  disabledPass: {
    opacity: 0.6,
    pointerEvents: "none",
  },
});
