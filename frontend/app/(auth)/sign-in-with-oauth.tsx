import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { useOAuth } from "@clerk/clerk-expo";
import { useWarmUpBrowser } from "../../src/hooks/useWarmUpBrowser";
import { Ionicons } from "@expo/vector-icons";

export default function SignInWithOAuthScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { isSignedIn } = useAuth();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [isLoading, setIsLoading] = useState(false);
  useWarmUpBrowser();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (searchParams?.code) {
        setIsLoading(true);
        try {
          const { createdSessionId, setActive } = await startOAuthFlow({
            redirectUrl:
              process.env.EXPO_PUBLIC_OAUTH_CALLBACK_URL ||
              "exp://localhost:19000/oauth-callback",
          });

          if (createdSessionId && setActive) {
            await setActive({ session: createdSessionId });
            router.replace("/");
          } else {
            router.replace("/sign-in");
          }
        } catch (err) {
          console.error("OAuth error:", err);
          router.replace("/sign-in");
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams]);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/");
    }
  }, [isSignedIn]);

  const onPress = async () => {
    setIsLoading(true);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl:
          process.env.EXPO_PUBLIC_OAUTH_CALLBACK_URL ||
          "exp://localhost:19000/oauth-callback",
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/");
      }
    } catch (err) {
      console.error("OAuth error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
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
            <TouchableOpacity style={styles.googleButton} onPress={onPress}>
              <Ionicons name="logo-google" size={24} color="#fff" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.emailButton}
              onPress={() => router.push("/sign-in")}
            >
              <Text style={styles.emailButtonText}>Sign in with Email</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
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
  emailButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  emailButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
});
