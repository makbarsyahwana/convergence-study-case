"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, type User } from "@/lib/api-client";
import { getToken, setToken, clearToken } from "@/lib/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  hasSubscription: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (t: string) => {
    const res = await api.getProfile(t);
    if (res.ok) {
      setUser(res.data);
    } else {
      clearToken();
      setTokenState(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const stored = getToken();
    if (stored) {
      setTokenState(stored);
      fetchProfile(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (!res.ok) throw new Error((res.data as any)?.message || "Login failed");
    const t = res.data.accessToken;
    setToken(t);
    setTokenState(t);
    await fetchProfile(t);
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const res = await api.register(data);
    if (!res.ok)
      throw new Error((res.data as any)?.message || "Registration failed");
    const t = res.data.accessToken;
    setToken(t);
    setTokenState(t);
    await fetchProfile(t);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (token) await fetchProfile(token);
  };

  const isAdmin =
    user?.roles?.some((r) => r.role.name === "ADMIN") ?? false;
  const hasSubscription = user?.hasActiveSubscription ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        hasSubscription,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
