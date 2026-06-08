const currentHost =
  typeof window !== "undefined"
    ? window.location.hostname
    : "localhost";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  `http://localhost:8080`;

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

/* =======================================================
   TOKEN STORE
======================================================= */
export const tokenStore = {
  getAccess: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/* =======================================================
   TYPES
======================================================= */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  role?: "ADMIN" | "MEMBER" | "MANAGER";
}

/* =======================================================
   JWT TOKEN EXPIRY
======================================================= */
const EXPIRY_LEEWAY_MS = 30_000;

function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(
      atob(
        token
          .split(".")[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
      )
    );
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isExpiringSoon(token: string): boolean {
  const exp = getTokenExp(token);
  if (!exp) return false;
  return Date.now() >= exp - EXPIRY_LEEWAY_MS;
}

/* =======================================================
   REFRESH TOKEN LOGIC (WITH LAYERED DTO WRAPPER FALLBACKS)
======================================================= */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      console.log("CALLING REFRESH API...");
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("REFRESH STATUS:", response.status);
      if (!response.ok) {
        tokenStore.clear();
        return null;
      }

      const data = await response.json();
      console.log("REFRESH RESPONSE:", data);

      // ✅ FIXED: Deep structural payload fallback parsing logic
      const newAccessToken = data?.data?.accessToken || data?.accessToken || data?.data?.data?.accessToken;
      const newRefreshToken = data?.data?.refreshToken || data?.refreshToken || data?.data?.data?.refreshToken;

      if (!newAccessToken) {
        console.error("❌ TOKEN ROTATION ERROR: 'accessToken' key missing from JSON response layers:", data);
        return null;
      }

      console.log("✅ NEW TOKEN EXTRACTED -> UPDATING LOCAL STORAGE HOOKS.");
      tokenStore.set(newAccessToken, newRefreshToken || tokenStore.getRefresh() || "");
      return newAccessToken;
    } catch (error) {
      console.error("REFRESH FAILED:", error);
      tokenStore.clear();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/* =======================================================
   MAIN FETCH WRAPPER
======================================================= */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & {
    auth?: boolean;
    _retry?: boolean;
  } = {}
): Promise<T> {
  const { auth = true, headers, _retry = false, ...rest } = init;

  let accessToken = auth ? tokenStore.getAccess() : null;

  /* Proactive Refresh Interceptor */
  if (auth && accessToken && isExpiringSoon(accessToken)) {
    console.log("TOKEN EXPIRING -> REFRESH");
    accessToken = await refreshAccessToken();
  }

  /* Headers Interceptor Block */
  const requestHeaders: Record<string, string> = {
    ...(!(init.body instanceof FormData) && { "Content-Type": "application/json" }),
    ...(headers as Record<string, string>),
  };

  delete requestHeaders.Authorization;
  delete requestHeaders.authorization;

  if (auth && accessToken) {
    requestHeaders["Authorization"] = `Bearer ${accessToken}`;
  }

  /* Original Fetch Dispatch */
  let response = await fetch(
    path.startsWith("http") ? path : `${BASE_URL}${path}`,
    {
      ...rest,
      credentials: "include",
      headers: requestHeaders,
    }
  );

  /* =======================================================
      HANDLE 401 RETRY LOGIC (PANS CONFLICTING KEYS CLEAN)
     ======================================================= */
  if (response.status === 401 && auth && !_retry) {
    console.log("401 RECEIVED -> REFRESHING");
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      console.log("RETRYING WITH NEW TOKEN");

      // 1. Shallow copy the operational header collection reference
      const retryHeaders = { ...requestHeaders };

      // 2. Erase alternative configuration cases to prevent duplicates completely
      delete retryHeaders.Authorization;
      delete retryHeaders.authorization;

      // 3. Inject verified active fresh access credentials payload token
      retryHeaders["Authorization"] = `Bearer ${newAccessToken}`;

      response = await fetch(
        path.startsWith("http") ? path : `${BASE_URL}${path}`,
        {
          ...rest,
          credentials: "include",
          headers: retryHeaders,
          _retry: true, // Tag explicitly to prevent operational processing recursion loops
        } as any
      );
    } else {
      tokenStore.clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Session expired");
    }
  }

  /* Final Request Exception Interceptor */
  if (!response.ok) {
    const errorText = await response.text();
    console.error("FINAL RESPONSE ERROR:", errorText);
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  const responseText = await response.text();
  if (!responseText) return {} as T;

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error("JSON PARSE ERROR:", error);
    throw new Error("Invalid JSON response");
  }
}

/* =======================================================
   AUTH REST API MAPPINGS
======================================================= */
export const authApi = {
  login: async (body: LoginRequest) => {
    const response = await apiFetch<{ data: LoginResponse }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    });
    return response.data;
  },

  signup: async (body: SignupRequest) => {
    const response = await apiFetch<{ data: LoginResponse }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    });
    return response.data;
  },
};