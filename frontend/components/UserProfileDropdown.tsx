import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClerk, useUser } from '@clerk/clerk-expo';
import { useAuth } from '../contexts/AuthContext';

export function UserProfileDropdown() {
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const { signOut } = useClerk();
    const router = useRouter();
    const [dropdownVisible, setDropdownVisible] = useState(false);

    if (!isSignedIn) return null;

    const handleSignOut = async () => {
        try {
            await signOut();
            setDropdownVisible(false);
            router.replace('/sign-in');
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const handleProfilePress = () => {
        setDropdownVisible((v) => !v);
    };

    return (
        <View style={styles.absoluteContainer}>
            <TouchableOpacity style={styles.profileCircle} onPress={handleProfilePress}>
                {user?.imageUrl ? (
                    <Image source={{ uri: user.imageUrl }} style={styles.profileImage} />
                ) : (
                    <Text style={styles.profileInitials}>
                        {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                    </Text>
                )}
            </TouchableOpacity>
            <Modal
                visible={dropdownVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDropdownVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
                    <View style={styles.dropdownMenu}>
                        <Text style={styles.dropdownName}>{user?.fullName || user?.username || 'User'}</Text>
                        <TouchableOpacity style={styles.dropdownSignOut} onPress={handleSignOut}>
                            <Ionicons name="log-out-outline" size={18} color="#ff4444" />
                            <Text style={styles.dropdownSignOutText}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
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
    absoluteContainer: {
        position: 'absolute',
        top: 60,
        right: 10,
        zIndex: 100,
        alignItems: 'flex-end',
    },
});
