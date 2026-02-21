import { useCallback, useState } from "react";

export interface AuthState {
  accessToken: string | null;
  setToken: (token: string, expiresIn?: number) => void;
  clearToken: () => void;
}

const STORAGE_KEY = "gdoc_logs_token";

interface StoredToken {
  token: string;
  expiresAt: number; // Date.now() ms
}

function loadToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored: StoredToken = JSON.parse(raw) as StoredToken;
    if (Date.now() >= stored.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored.token;
  } catch {
    return null;
  }
}

export function useAuth(): AuthState {
  const [accessToken, setAccessToken] = useState<string | null>(loadToken);

  // expiresIn: 秒単位（Google API は通常 3600）
  const setToken = useCallback((token: string, expiresIn = 3600) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt }));
    setAccessToken(token);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
  }, []);

  return { accessToken, setToken, clearToken };
}
