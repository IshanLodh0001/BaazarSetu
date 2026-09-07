import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getMe } from "../services/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "auth_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (newToken) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);

    setToken(newToken);

    const result = await getMe(newToken);
    setUser(result.data);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);

    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);

        if (!storedToken) {
          return;
        }

        setToken(storedToken);

        const result = await getMe(storedToken);
        setUser(result.data);
      } catch (error) {
        console.log("Failed to restore authentication:", error);

        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}