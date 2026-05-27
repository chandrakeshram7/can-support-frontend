const currentHost =
  typeof window !== "undefined"
    ? window.location.hostname
    : "localhost";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  `http://${currentHost}:8080`;

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

/* =======================================================
   TOKEN STORE
======================================================= */

export const tokenStore = {
  getAccess: (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem(
      ACCESS_KEY
    );
  },

  getRefresh: (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem(
      REFRESH_KEY
    );
  },

  set: (
    accessToken: string,
    refreshToken: string
  ) => {
    localStorage.setItem(
      ACCESS_KEY,
      accessToken
    );

    localStorage.setItem(
      REFRESH_KEY,
      refreshToken
    );
  },

  clear: () => {
    localStorage.removeItem(
      ACCESS_KEY
    );

    localStorage.removeItem(
      REFRESH_KEY
    );
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

function getTokenExp(
  token: string
): number | null {
  try {
    const payload = JSON.parse(
      atob(
        token
          .split(".")[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
      )
    );

    return typeof payload.exp ===
      "number"
      ? payload.exp * 1000
      : null;
  } catch {
    return null;
  }
}

function isExpiringSoon(
  token: string
): boolean {
  const exp = getTokenExp(token);

  if (!exp) {
    return false;
  }

  return (
    Date.now() >=
    exp - EXPIRY_LEEWAY_MS
  );
}

/* =======================================================
   REFRESH TOKEN LOGIC
======================================================= */

let refreshInFlight:
  Promise<string | null> | null =
  null;

async function refreshAccessToken():
  Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      console.log(
        "CALLING REFRESH API..."
      );

      const response = await fetch(
        `${BASE_URL}/auth/refresh`,
        {
          method: "POST",

          /*
            IMPORTANT
            THIS IS THE FIX
          */
          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

      console.log(
        "REFRESH STATUS:",
        response.status
      );

      if (!response.ok) {
        tokenStore.clear();

        return null;
      }

      const data =
        await response.json();

      console.log(
        "REFRESH RESPONSE:",
        data
      );

      const newAccessToken =
        data.data?.accessToken;

      const newRefreshToken =
        data.data?.refreshToken;

      if (!newAccessToken) {
        return null;
      }

      tokenStore.set(
        newAccessToken,
        newRefreshToken
      );

      return newAccessToken;
    } catch (error) {
      console.error(
        "REFRESH FAILED:",
        error
      );

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
  const {
    auth = true,
    headers,
    _retry = false,
    ...rest
  } = init;

  let accessToken = auth
    ? tokenStore.getAccess()
    : null;

  /* =========================================
     PROACTIVE REFRESH
  ========================================= */

  if (
    auth &&
    accessToken &&
    isExpiringSoon(accessToken)
  ) {
    console.log(
      "TOKEN EXPIRING -> REFRESH"
    );

    accessToken =
      await refreshAccessToken();
  }

  /* =========================================
     HEADERS
  ========================================= */

  const requestHeaders: Record<
    string,
    string
  > = {
    "Content-Type":
      "application/json",

    ...(headers as Record<
      string,
      string
    >),
  };

  delete requestHeaders.Authorization;

  if (auth && accessToken) {
    requestHeaders.Authorization =
      `Bearer ${accessToken}`;
  }

  /* =========================================
     ORIGINAL REQUEST
  ========================================= */

  let response = await fetch(
    `${BASE_URL}${path}`,
    {
      ...rest,

      /*
        IMPORTANT
        INCLUDE COOKIES
      */
      credentials: "include",

      headers: requestHeaders,
    }
  );

  /* =========================================
     HANDLE 401
  ========================================= */

  if (
    response.status === 401 &&
    auth &&
    !_retry
  ) {
    console.log(
      "401 RECEIVED -> REFRESHING"
    );

    const newAccessToken =
      await refreshAccessToken();

    if (newAccessToken) {
      console.log(
        "RETRYING WITH NEW TOKEN"
      );

      response = await fetch(
        `${BASE_URL}${path}`,
        {
          ...rest,

          credentials: "include",

          headers: {
            ...requestHeaders,

            Authorization:
              `Bearer ${newAccessToken}`,
          },
        }
      );
    } else {
      tokenStore.clear();

      if (
        typeof window !==
        "undefined"
      ) {
        window.location.href =
          "/login";
      }

      throw new Error(
        "Session expired"
      );
    }
  }

  /* =========================================
     FINAL ERROR
  ========================================= */

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "FINAL RESPONSE ERROR:",
      errorText
    );

    throw new Error(
      errorText ||
        `Request failed: ${response.status}`
    );
  }

  /* =========================================
     SAFE JSON PARSE
  ========================================= */

  const responseText =
    await response.text();

  if (!responseText) {
    return {} as T;
  }

  try {
    return JSON.parse(
      responseText
    );
  } catch (error) {
    console.error(
      "JSON PARSE ERROR:",
      error
    );

    console.error(
      "RAW RESPONSE:",
      responseText
    );

    throw new Error(
      "Invalid JSON response"
    );
  }
}

/* =======================================================
   AUTH API
======================================================= */

export const authApi = {
  login: async (
    body: LoginRequest
  ) => {
    const response =
      await apiFetch<{
        data: LoginResponse;
      }>("/auth/login", {
        method: "POST",

        body: JSON.stringify(
          body
        ),

        auth: false,
      });

    return response.data;
  },

  signup: async (
    body: SignupRequest
  ) => {
    const response =
      await apiFetch<{
        data: LoginResponse;
      }>("/auth/signup", {
        method: "POST",

        body: JSON.stringify(
          body
        ),

        auth: false,
      });

    return response.data;
  },
};