import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export default function RootLayout() {
  useEffect(() => {
    const initializeDeviceId = async () => {
      try {
        let deviceId = await AsyncStorage.getItem("deviceId");
        if (!deviceId) {
          deviceId = randomUUID();
          await AsyncStorage.setItem("deviceId", deviceId);
          console.log("Generated new device ID:", deviceId);
        }
      } catch (error) {
        console.error("Error initializing device ID:", error);
      }
    };

    initializeDeviceId();
  }, []);

  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: "Veer's Gym",
            }}
          />
          <Stack.Screen
            name="qr-scanner"
            options={{
              title: "Scan Gym QR",
            }}
          />
          <Stack.Screen
            name="pass-selection"
            options={{
              title: "Select Pass",
            }}
          />
          <Stack.Screen
            name="payment"
            options={{
              title: "Payment",
            }}
          />
          <Stack.Screen
            name="success"
            options={{
              title: "Pass Ready",
              headerBackVisible: false,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
