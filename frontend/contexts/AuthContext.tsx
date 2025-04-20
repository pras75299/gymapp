import { createContext, useContext } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

type AuthContextType = {
    isSignedIn: boolean;
    userId: string | null;
    isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { isSignedIn = false, userId = null, isLoaded = false } = useClerkAuth();

    return (
        <AuthContext.Provider value={{ isSignedIn, userId, isLoading: !isLoaded }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
} 