import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { gymApi } from "../api/gymApi";
import { logger } from "../utils/logger";

interface AuthContextType {
  isSignedIn: boolean;
  userId: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isSignedIn: false,
  userId: null,
  isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    isSignedIn = false,
    userId = null,
    isLoaded = false,
    getToken,
  } = useClerkAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    gymApi.setAuthTokenGetter(
      isSignedIn ? () => getToken() : null
    );
  }, [isSignedIn, getToken]);

  useEffect(() => {
    const upsertUser = async () => {
      if (isSignedIn && userId) {
        try {
          await gymApi.upsertUser({
            id: userId,
            email: user?.primaryEmailAddress?.emailAddress || undefined,
            name: user?.fullName || undefined,
            phoneNumber: user?.primaryPhoneNumber?.phoneNumber || undefined,
          });
        } catch (error) {
          logger.error("Error upserting user", error);
        }
      }
      setIsLoading(false);
    };

    upsertUser();
  }, [isSignedIn, userId, user]);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn,
        userId,
        isLoading: isLoading || !isLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
