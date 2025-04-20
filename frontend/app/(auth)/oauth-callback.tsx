import { useOAuth } from '@clerk/clerk-expo';
import { useWarmUpBrowser } from '../../src/hooks/useWarmUpBrowser';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

useWarmUpBrowser();

export default function OAuthCallback() {
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' as const });
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleAuth = async () => {
            try {
                const { createdSessionId, setActive } = await startOAuthFlow({
                    redirectUrl: 'https://gymapp-coral.vercel.app/oauth-callback',
                });
                if (createdSessionId) {
                    setActive?.({ session: createdSessionId });
                    router.replace('/');
                }
            } catch (err) {
                console.error('OAuth error', err);
                setError('Failed to authenticate with Google');
                router.replace('/sign-in');
            } finally {
                setLoading(false);
            }
        };

        handleAuth();
    }, []);

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#4285F4" />
            ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 16,
        textAlign: 'center',
        padding: 20,
    },
}); 