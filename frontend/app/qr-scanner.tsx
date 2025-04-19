import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import { useRouter } from "expo-router";
import { gymApi } from "../src/api/gymApi";

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, [permission]);

  // Reset scanner state when component mounts
  useEffect(() => {
    setScanned(false);
    setError(null);
    setResult(null);
  }, []);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Check if it's a gym QR code (simple identifier)
      if (!result.data.includes('http')) {
        // It's a gym QR code, fetch gym details
        const gym = await gymApi.getGymByQrIdentifier(result.data);
        router.replace({
          pathname: "/pass-selection",
          params: { qrIdentifier: result.data }
        });
        return;
      }

      // Validate URL format
      let url: URL;
      try {
        url = new URL(result.data);
      } catch (err) {
        throw new Error('Invalid QR code format');
      }

      // Check if URL is from our backend
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      if (!url.origin.includes(apiUrl)) {
        throw new Error('Invalid QR code source');
      }

      // It's a pass QR code, validate it
      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate pass');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process QR code');
      console.error('Validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No access to camera</Text>
        <Text style={styles.submessage}>
          Please enable camera access in your device settings
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
        <Text style={styles.instructions}>
          Position the QR code within the frame
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Validating pass...</Text>
        </View>
      )}

      {error && (
        <View style={styles.resultContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => {
              setScanned(false);
              setError(null);
            }}
          >
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {result && (
        <View style={styles.resultContainer}>
          <Text style={[styles.resultTitle, result.valid ? styles.valid : styles.invalid]}>
            {result.valid ? 'Valid Pass' : 'Invalid Pass'}
          </Text>
          
          <View style={styles.detailsContainer}>
            <Text style={styles.detailText}>
              Pass Type: {result.passDetails.passType}
            </Text>
            <Text style={styles.detailText}>
              Purchase Date: {new Date(result.passDetails.purchaseDate).toLocaleDateString()}
            </Text>
            <Text style={styles.detailText}>
              Expiry Date: {new Date(result.passDetails.expiryDate).toLocaleDateString()}
            </Text>
            <Text style={styles.detailText}>
              Amount: {result.passDetails.amount} {result.passDetails.currency}
            </Text>
            <Text style={styles.detailText}>
              Status: {result.passDetails.status}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={() => {
              setScanned(false);
              setResult(null);
            }}
          >
            <Text style={styles.buttonText}>Scan Another Pass</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  message: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
  },
  submessage: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "transparent",
  },
  instructions: {
    color: "#fff",
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  resultContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  valid: {
    color: '#4CAF50',
  },
  invalid: {
    color: '#F44336',
  },
  detailsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
