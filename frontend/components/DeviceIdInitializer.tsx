import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";

interface DeviceIdInitializerProps {
    children: React.ReactNode;
}

// Initialize device ID once when the module is loaded
const initializeDeviceId = async () => {
    try {
        let deviceId = await AsyncStorage.getItem("deviceId");
        if (!deviceId) {
            deviceId = randomUUID();
            await AsyncStorage.setItem("deviceId", deviceId);
            console.log("Generated new device ID:", deviceId);
        }
        return deviceId;
    } catch (error) {
        console.error("Error initializing device ID:", error);
        return null;
    }
};

// Start initialization immediately
const deviceIdPromise = initializeDeviceId();

export function DeviceIdInitializer({ children }: DeviceIdInitializerProps) {
    return <>{children}</>;
}

// Export a function to get the device ID
export const getDeviceId = async () => {
    return deviceIdPromise;
}; 