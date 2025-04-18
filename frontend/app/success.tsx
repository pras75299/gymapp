import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { gymApi, PassStatus } from "../src/api/gymApi";

export default function SuccessScreen() {
  const { passId } = useLocalSearchParams<{ passId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passStatus, setPassStatus] = useState<PassStatus | null>(null);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 10;

    const fetchPassStatus = async () => {
      try {
        const status = await gymApi.getPassStatus(passId);
        setPassStatus(status);

        if (status.status === "succeeded" && status.qrCodeValue) {
          setLoading(false);
          if (pollingInterval) clearInterval(pollingInterval);
        } else if (++attempts >= maxAttempts) {
          setError("Payment confirmation is taking longer than expected");
          setLoading(false);
          if (pollingInterval) clearInterval(pollingInterval);
        }
      } catch (error) {
        setError("Failed to load pass details");
        setLoading(false);
        if (pollingInterval) clearInterval(pollingInterval);
      }
    };

    fetchPassStatus();
    pollingInterval = setInterval(fetchPassStatus, 2000);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [passId]);

  const handleViewPasses = () => {
    router.replace("/my-passes");
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Confirming your payment...</Text>
        <Text style={styles.subText}>This may take a few moments</Text>
      </View>
    );
  }

  if (error || !passStatus) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error || "Something went wrong"}</Text>
        <TouchableOpacity style={styles.button} onPress={handleViewPasses}>
          <Text style={styles.buttonText}>View My Passes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (passStatus.status !== "succeeded" || !passStatus.qrCodeValue) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Payment processing...</Text>
        <Text style={styles.subText}>
          Please wait while we confirm your payment
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleViewPasses}>
          <Text style={styles.buttonText}>View My Passes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Successful!</Text>
      <View style={styles.qrContainer}>
        <QRCode
          value={passStatus.qrCodeValue}
          size={200}
          backgroundColor="white"
          color="#000"
        />
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.detailText}>
          Pass Type: {passStatus.passType?.name || 'Loading...'}
        </Text>
        <Text style={styles.detailText}>
          Expiry Date: {passStatus.expiryDate ? new Date(passStatus.expiryDate).toLocaleDateString() : 'Loading...'}
        </Text>
      </View>
      <Text style={styles.instructions}>
        Show this QR code at the gym entrance to gain access
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleViewPasses}>
        <Text style={styles.buttonText}>View All My Passes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#007AFF",
  },
  qrContainer: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  instructions: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginTop: 20,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 18,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 20,
  },
  subText: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
