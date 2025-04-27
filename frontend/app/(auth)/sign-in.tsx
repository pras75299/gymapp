import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { gymApi } from "../../src/api/gymApi";

export default function SignInScreen() {
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const { signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const completeSignIn = await signIn?.create({
        identifier: email,
        password,
      });
      if (completeSignIn?.createdSessionId) {
        await setActive?.({ session: completeSignIn.createdSessionId });

        // Check for stored pass ID and redirect path
        const [storedPassId, redirectPath] = await AsyncStorage.multiGet([
          "selectedPassId",
          "redirectAfterAuth",
        ]);

        if (storedPassId[1]) {
          try {
            // Clear the stored values immediately to prevent race conditions
            await AsyncStorage.multiRemove([
              "selectedPassId",
              "redirectAfterAuth",
            ]);

            // Get the user ID from AuthContext
            if (!userId) {
              throw new Error("User ID not found");
            }

            // Proceed with payment flow
            const order = await gymApi.purchasePass(storedPassId[1], userId);

            // Ensure we're still signed in before proceeding
            if (!isSignedIn) {
              throw new Error("Authentication lost during payment process");
            }

            router.replace({
              pathname: "/payment",
              params: {
                passId: order.passId,
                orderId: order.orderId,
                amount: order.amount,
                currency: order.currency,
                keyId: order.keyId,
              },
            });
          } catch (paymentError) {
            console.error("Payment process error:", paymentError);
            // Show error to user and redirect to home
            Alert.alert(
              "Payment Error",
              "There was an error processing your payment. Please try again.",
              [{ text: "OK", onPress: () => router.replace("/") }]
            );
          }
        } else {
          // No stored pass ID, redirect to home
          router.replace("/");
        }
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/background-gym.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your gym passes
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => router.push("/sign-in-with-oauth")}
            >
              <Ionicons name="logo-google" size={24} color="#fff" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  form: {
    width: "100%",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    color: "white",
  },
  signInButton: {
    backgroundColor: "#4285F4",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  signInButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  dividerText: {
    color: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 10,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4285F4",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  googleButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  backButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    padding: 15,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
});
