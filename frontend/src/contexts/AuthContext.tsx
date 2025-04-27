import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { gymApi } from "../api/gymApi";

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
  } = useClerkAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const upsertUser = async () => {
      if (isSignedIn && userId) {
        try {
          await gymApi.upsertUser({
            id: userId,
            email: undefined,
            name: undefined,
            phoneNumber: undefined,
          });
        } catch (error) {
          console.error("Error upserting user:", error);
        }
      }
      setIsLoading(false);
    };

    upsertUser();
  }, [isSignedIn, userId]);

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
