import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

interface AuthContextType {
  isSignedIn: boolean;
  userId: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isSignedIn: false,
  userId: null,
  isLoading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, userId, getToken, signOut: clerkSignOut } = useClerkAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isSignedIn && userId) {
          const token = await getToken();
          await SecureStore.setItemAsync('auth_token', token || '');
        } else {
          await SecureStore.deleteItemAsync('auth_token');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [isSignedIn, userId, getToken]);

  const signOut = async () => {
    try {
      await clerkSignOut();
      await SecureStore.deleteItemAsync('auth_token');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        userId: userId || null,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 