import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from '../contexts/AuthContext';
import { useClerk, useUser } from '@clerk/clerk-expo';

export default function HomePage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setDropdownVisible(false);
      router.replace('/sign-in');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleScanPress = () => {
    router.push('/qr-scanner');
  };

  const handleProfilePress = () => {
    setDropdownVisible((v) => !v);
  };

  return (
    <ImageBackground
      source={require("../assets/images/background-gym.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Veers Gym</Text>
          </View>
          <Text style={styles.subtitle}>Scan QR code to get your gym pass</Text>

          <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
            <Ionicons name="qr-code-outline" size={24} color="white" />
            <Text style={styles.scanButtonText}>Scan QR Code</Text>
          </TouchableOpacity>

          {isSignedIn && (
            <TouchableOpacity
              style={[styles.scanButton, styles.myPassesButton]}
              onPress={() => router.push('/my-passes')}
            >
              <Ionicons name="card-outline" size={24} color="white" />
              <Text style={styles.scanButtonText}>My Passes</Text>
            </TouchableOpacity>
          )}
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
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: "white",
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 40,
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  myPassesButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
  },
  // Profile dropdown styles
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 20,
  },
  profileInitials: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdownMenu: {
    marginTop: 80,
    marginRight: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
    alignItems: 'flex-start',
  },
  dropdownName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  dropdownSignOut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dropdownSignOutText: {
    color: '#ff4444',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
  },
  authButton: {
    padding: 10,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    backgroundColor: '#4CAF50',
    marginLeft: 'auto',
    marginTop: 60,
    marginRight: 10,
    borderRadius: 10,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
  },
});
