import { useGoogleLogin } from "@react-oauth/google";
import { Menu, Pencil, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ComposeOverlay } from "@/components/ComposeOverlay";
import { DocSelector } from "@/components/DocSelector";
import { TodaysDiary } from "@/components/TodaysDiary";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedDoc } from "@/hooks/useSelectedDoc";

const SCOPES = "https://www.googleapis.com/auth/documents";

export default function App() {
  const { accessToken, setToken, clearToken } = useAuth();
  const { selectedDoc, selectDoc } = useSelectedDoc();
  const [menuOpen, setMenuOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // 手動リロード時のみトーストを出すためのフラグ
  const isManualRefresh = useRef(false);

  const login = useGoogleLogin({
    onSuccess: (response) =>
      setToken(response.access_token, response.expires_in),
    onError: () => console.error("Google login failed"),
    scope: SCOPES,
  });

  function handlePostSuccess() {
    setComposeOpen(false);
    setRefreshKey((k) => k + 1);
  }

  // TodaysDiary のロード完了時に呼ばれる
  const handleLoaded = useCallback(() => {
    setRefreshing(false);
    if (isManualRefresh.current) {
      isManualRefresh.current = false;
      toast.success("更新しました");
    }
  }, []);

  // 手動リロード
  function handleManualRefresh() {
    isManualRefresh.current = true;
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

  return (
    <div
      className="bg-background flex h-dvh flex-col
        pb-[env(safe-area-inset-bottom)]"
    >
      {/* ヘッダー */}
      <header
        className="bg-background sticky top-0 z-10 flex h-14 shrink-0
          items-center justify-between border-b px-4
          pt-[env(safe-area-inset-top)]"
      >
        <h1 className="text-base font-semibold">gdoc-logs</h1>
        {accessToken ? (
          <div className="flex items-center">
            {selectedDoc && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleManualRefresh}
                aria-label="最新のデータを取得"
              >
                <RefreshCw
                  className={refreshing ? "size-5 animate-spin" : "size-5"}
                />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(true)}
              aria-label="メニューを開く"
            >
              <Menu className="size-5" />
            </Button>
          </div>
        ) : (
          <Button onClick={() => login()}>Sign in with Google</Button>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="relative min-h-0 flex-1">
        {!accessToken ? (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            Google でサインインすると Google Docs に追記できます。
          </p>
        ) : !selectedDoc ? (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            メニューからドキュメントを選択してください。
          </p>
        ) : (
          <TodaysDiary
            docId={selectedDoc.id}
            accessToken={accessToken}
            refreshKey={refreshKey}
            onLoaded={handleLoaded}
          />
        )}
      </main>

      {/* FAB（投稿ボタン） */}
      <Button
        onClick={() => setComposeOpen(true)}
        disabled={!accessToken || !selectedDoc}
        className="fixed right-5
          bottom-[calc(1.25rem+env(safe-area-inset-bottom))] size-14
          rounded-full shadow-lg"
        aria-label="投稿する"
      >
        <Pencil className="size-5" />
      </Button>

      {/* ハンバーガーメニュー（Sheet） */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle>設定</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6 px-1">
            <DocSelector
              accessToken={accessToken ?? ""}
              apiKey={import.meta.env.VITE_GOOGLE_API_KEY}
              selectedDoc={selectedDoc}
              onSelect={(id, name) => {
                selectDoc(id, name);
                setMenuOpen(false);
              }}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                clearToken();
                setMenuOpen(false);
              }}
            >
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 投稿オーバーレイ */}
      {composeOpen && accessToken && selectedDoc && (
        <ComposeOverlay
          accessToken={accessToken}
          selectedDoc={selectedDoc}
          onClose={() => setComposeOpen(false)}
          onSuccess={handlePostSuccess}
        />
      )}

      <Toaster />
    </div>
  );
}
