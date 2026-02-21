import { useCallback, useState } from "react";

export interface AuthState {
  accessToken: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export function useAuth(): AuthState {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const setToken = useCallback((token: string) => {
    setAccessToken(token);
  }, []);

  const clearToken = useCallback(() => {
    setAccessToken(null);
  }, []);

  return { accessToken, setToken, clearToken };
}
