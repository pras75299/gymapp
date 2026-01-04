import { useOAuth } from '@clerk/clerk-expo';
import { useWarmUpBrowser } from '../../src/hooks/useWarmUpBrowser';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { logger } from '../../src/utils/logger';

export default function OAuthCallback() {
    useWarmUpBrowser();
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' as const });
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasHandledAuth = useRef(false);

    useEffect(() => {
        // Prevent multiple executions - only run once on mount
        if (hasHandledAuth.current) {
            return;
        }

        const handleAuth = async () => {
            hasHandledAuth.current = true;
            try {
                const { createdSessionId, setActive } = await startOAuthFlow({
                    redirectUrl: 'https://gymapp-coral.vercel.app/oauth-callback',
                });
                if (createdSessionId) {
                    setActive?.({ session: createdSessionId });
                    router.replace('/');
                }
            } catch (err) {
                logger.error('OAuth error', err);
                setError('Failed to authenticate with Google');
                router.replace('/sign-in');
            } finally {
                setLoading(false);
            }
        };

        handleAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array - only run once on mount

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