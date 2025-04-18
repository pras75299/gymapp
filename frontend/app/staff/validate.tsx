import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { gymApi } from '../../src/api/gymApi';

export default function ValidateQrScreen() {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleValidate = async () => {
    if (!qrCode.trim()) {
      setError('Please enter a QR code');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await gymApi.validateQrCode(qrCode);
      setResult(response);
    } catch (err) {
      setError('Failed to validate QR code');
      console.error('Validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Validate Pass</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter QR Code"
        value={qrCode}
        onChangeText={setQrCode}
        autoCapitalize="none"
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleValidate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Validate</Text>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
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
  error: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  detailsContainer: {
    marginTop: 10,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 5,
  },
}); 