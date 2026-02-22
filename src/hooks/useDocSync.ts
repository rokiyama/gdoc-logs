import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface DocSyncResult {
  refreshKey: number;
  refreshing: boolean;
  lastSyncedAt: Date | null;
  /** ロード完了時に TodaysDiary から呼ぶ */
  handleLoaded: () => void;
  /** 手動同期（完了後に「更新しました」トーストを出す） */
  handleManualRefresh: () => void;
  /** プログラムからのサイレント更新（トーストなし） */
  refresh: () => void;
}

export function useDocSync(): DocSyncResult {
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const isManualRefresh = useRef(false);

  const handleLoaded = useCallback(() => {
    setRefreshing(false);
    setLastSyncedAt(new Date());
    if (isManualRefresh.current) {
      isManualRefresh.current = false;
      toast.success("更新しました");
    }
  }, []);

  function handleManualRefresh() {
    isManualRefresh.current = true;
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }

  function refresh() {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }

  // 画面復帰時（タブ切り替え・スリープ復帰）に最新データを取得
  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) {
        setRefreshing(true);
        setRefreshKey((k) => k + 1);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return {
    refreshKey,
    refreshing,
    lastSyncedAt,
    handleLoaded,
    handleManualRefresh,
    refresh,
  };
}
