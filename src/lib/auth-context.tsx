import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import axios from "axios";

import { authApi, tokenStore, type LoginRequest, type SignupRequest } from "./api";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:8080";



interface JwtPayload {
  sub?: string;
  username?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  [k: string]: unknown;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];

    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));

    return JSON.parse(json);
  } catch {
    return null;
  }
}

interface AuthState {
  isAuthenticated: boolean;
  user: JwtPayload | null;
  loading: boolean;

  login: (req: LoginRequest) => Promise<void>;

  signup: (req: SignupRequest) => Promise<void>;

  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      setUser(decodeJwt(token));
    }

    setLoading(false);
  }, []);

  const login = async ({
  username,
  password,
}: LoginRequest) => {

  try {
    console.log("MODE =", import.meta.env.MODE);
    console.log("API URL =", import.meta.env.VITE_API_BASE_URL);

    const response = await axios.post(
      `${BASE_URL}/auth/login`,

      {
        username,
        password,
      },

      {
        // VERY IMPORTANT
        withCredentials: true,
      }
    );

    console.log(
      "LOGIN RESPONSE:",
      response.data
    );

    const accessToken =
      response.data.data.accessToken;

    const refreshToken =
      response.data.data.refreshToken;

    tokenStore.set(
      accessToken,
      refreshToken
    );

    setUser(
      decodeJwt(accessToken)
    );

    console.log(
      "LOGIN SUCCESS"
    );

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    throw new Error(
      "Invalid credentials"
    );
  }
};

  const signup = async (req: SignupRequest) => {
    const res = await authApi.signup(req);

    tokenStore.set(res.accessToken, res.refreshToken);

    setUser(decodeJwt(res.accessToken));
  };
  const logout = () => {
    tokenStore.clear();

    localStorage.removeItem("accessToken");

    localStorage.removeItem("refreshToken");

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}
