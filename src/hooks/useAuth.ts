import { useGoogleLogin } from "@react-oauth/google";
import { useCallback, useEffect, useRef, useState } from "react";

import { SCOPES } from "@/lib/auth-config";

export interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
  setToken: (token: string, expiresIn?: number) => void;
  clearToken: () => void;
  getValidToken: () => Promise<string | null>;
}

const STORAGE_KEY = "gdoc_logs_token";
const FIVE_MINUTES_MS = 5 * 60 * 1000;

interface StoredToken {
  accessToken: string;
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
    () => loadStored()?.accessToken ?? null,
  );
  const [expiresAt, setExpiresAt] = useState<number | null>(
    () => loadStored()?.expiresAt ?? null,
  );

  // Promise ブリッジ用 ref
  const pendingResolveRef = useRef<((token: string | null) => void) | null>(
    null,
  );
  const inFlightRef = useRef<Promise<string | null> | null>(null);

  // expiresIn: 秒単位（Google API は通常 3600）
  const setToken = useCallback((token: string, expiresIn = 3600) => {
    const at = Date.now() + expiresIn * 1000;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: token, expiresAt: at }),
    );
    setAccessToken(token);
    setExpiresAt(at);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
    setExpiresAt(null);
  }, []);

  const silentLogin = useGoogleLogin({
    scope: SCOPES,
    prompt: "none",
    onSuccess: (response) => {
      setToken(response.access_token, response.expires_in);
      pendingResolveRef.current?.(response.access_token);
      pendingResolveRef.current = null;
      inFlightRef.current = null;
    },
    onError: () => {
      pendingResolveRef.current?.(null);
      pendingResolveRef.current = null;
      inFlightRef.current = null;
    },
    onNonOAuthError: () => {
      pendingResolveRef.current?.(null);
      pendingResolveRef.current = null;
      inFlightRef.current = null;
    },
  });

  const getValidToken = useCallback((): Promise<string | null> => {
    // トークンが 5 分以上有効 → そのまま返す
    if (accessToken && expiresAt && expiresAt - Date.now() > FIVE_MINUTES_MS) {
      return Promise.resolve(accessToken);
    }
    // サイレント再認証が進行中 → 同じ Promise を共有
    if (inFlightRef.current) return inFlightRef.current;

    // サイレント再認証を開始
    const promise = new Promise<string | null>((resolve) => {
      pendingResolveRef.current = resolve;
      silentLogin();
    }).then((token) => {
      // 失敗時はトークンをクリアして再ログインを促す
      if (token === null) clearToken();
      return token;
    });

    inFlightRef.current = promise;
    return promise;
  }, [accessToken, expiresAt, silentLogin, clearToken]);

  // 5 分間隔のバックグラウンドチェック
  useEffect(() => {
    if (!accessToken || !expiresAt) return;

    const id = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (
        remaining > 0 &&
        remaining < FIVE_MINUTES_MS &&
        !inFlightRef.current
      ) {
        // バックグラウンド更新: 失敗しても静かに処理（ログアウトしない）
        const promise = new Promise<string | null>((resolve) => {
          pendingResolveRef.current = resolve;
          silentLogin();
        }).catch(() => null);
        inFlightRef.current = promise;
      }
    }, FIVE_MINUTES_MS);

    return () => clearInterval(id);
  }, [accessToken, expiresAt, silentLogin]);

  return { accessToken, expiresAt, setToken, clearToken, getValidToken };
}
