import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';
import { useAuth } from '../src/contexts/AuthContext';

export default function SignInScreen() {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const { isLoaded, signIn, setActive } = useSignIn();
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (isSignedIn) {
        router.replace('/');
    }

    const onSignInPress = async () => {
        if (!isLoaded) return;

        setLoading(true);
        setError(null);

        try {
            const completeSignIn = await signIn.create({
                identifier: emailAddress,
                password,
            });

            await setActive({ session: completeSignIn.createdSessionId });
            router.replace('/');
        } catch (err: any) {
            setError(err.errors?.[0]?.message || 'Failed to sign in');
            console.error('Sign in error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground
            source={require('../assets/images/background-gym.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <StatusBar barStyle="light-content" />
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to access your gym passes</Text>
                    </View>

                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            value={emailAddress}
                            onChangeText={setEmailAddress}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        {error && <Text style={styles.errorText}>{error}</Text>}
                        <TouchableOpacity
                            style={styles.signInButton}
                            onPress={onSignInPress}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.signInButtonText}>Sign In</Text>
                            )}
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
        width: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    form: {
        width: '100%',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        color: 'white',
        fontSize: 16,
    },
    errorText: {
        color: '#ff4444',
        marginBottom: 15,
        textAlign: 'center',
    },
    signInButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    signInButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        alignItems: 'center',
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});