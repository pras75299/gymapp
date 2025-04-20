import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { AuthProvider } from '../contexts/AuthContext';
import Constants from 'expo-constants';
import { DeviceIdInitializer } from '../components/DeviceIdInitializer';

// const tokenCache = {
//   async getToken(key: string) {
//     try {
//       return SecureStore.getItemAsync(key);
//     } catch (err) {
//       return null;
//     }
//   },
//   async saveToken(key: string, value: string) {
//     try {
//       return SecureStore.setItemAsync(key, value);
//     } catch (err) {
//       return;
//     }
//   },
// };

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  console.error('Clerk publishable key is missing!');
  throw new Error('Clerk publishable key is required');
}

export default function RootLayout() {
  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={clerkPublishableKey}
    >
      <AuthProvider>
        <SafeAreaProvider>
          <DeviceIdInitializer>
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
              <Stack.Screen
                name="sign-in"
                options={{
                  title: "Sign In",
                }}
              />
              <Stack.Screen
                name="sign-in-with-oauth"
                options={{
                  title: "Sign In with Google",
                }}
              />
            </Stack>
          </DeviceIdInitializer>
        </SafeAreaProvider>
      </AuthProvider>
    </ClerkProvider>
  );
}
