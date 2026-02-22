import { useCallback, useState } from "react";

export interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
  setToken: (token: string, expiresIn?: number) => void;
  clearToken: () => void;
}

const STORAGE_KEY = "gdoc_logs_token";

interface StoredToken {
  token: string;
  expiresAt: number; // Date.now() ms
}

function loadStored(): StoredToken | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored: StoredToken = JSON.parse(raw) as StoredToken;
    if (Date.now() >= stored.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export function useAuth(): AuthState {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => loadStored()?.token ?? null,
  );
  const [expiresAt, setExpiresAt] = useState<number | null>(
    () => loadStored()?.expiresAt ?? null,
  );

  // expiresIn: 秒単位（Google API は通常 3600）
  const setToken = useCallback((token: string, expiresIn = 3600) => {
    const at = Date.now() + expiresIn * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt: at }));
    setAccessToken(token);
    setExpiresAt(at);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
    setExpiresAt(null);
  }, []);

  return { accessToken, expiresAt, setToken, clearToken };
}
