import { useGoogleLogin } from "@react-oauth/google";
import {
  FileText,
  LogOut,
  MoreHorizontal,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ComposeOverlay } from "@/components/ComposeOverlay";
import { TodaysDiary } from "@/components/TodaysDiary";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedDoc } from "@/hooks/useSelectedDoc";
import { openGooglePicker } from "@/lib/google-picker";

const SCOPES = "https://www.googleapis.com/auth/documents";

export default function App() {
  const { accessToken, setToken, clearToken } = useAuth();
  const { selectedDoc, selectDoc } = useSelectedDoc();
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [currentHeading, setCurrentHeading] = useState<string | null>(null);
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

  // ドキュメント選択（Picker）
  async function handlePickDoc() {
    if (!accessToken) return;
    try {
      const file = await openGooglePicker(
        accessToken,
        import.meta.env.VITE_GOOGLE_API_KEY as string,
      );
      if (file) {
        setCurrentHeading(null);
        selectDoc(file.id, file.name);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "ドキュメントを選択できませんでした",
      );
    }
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
      className="bg-background relative flex h-dvh flex-col
        pb-[env(safe-area-inset-bottom)]"
    >
      {/* ヘッダー */}
      <header
        className="absolute inset-x-0 top-0 z-10 px-2
          pt-[env(safe-area-inset-top)]"
      >
        <div className="grid min-h-14 grid-cols-3 items-center py-1">
          {/* 左: リロードボタン */}
          <div className="flex justify-start">
            {accessToken && selectedDoc && (
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/40 rounded-full shadow-md
                  backdrop-blur-xs"
                onClick={handleManualRefresh}
                aria-label="最新のデータを取得"
              >
                <RefreshCw
                  className={refreshing ? "size-5 animate-spin" : "size-5"}
                />
              </Button>
            )}
          </div>

          {/* 中央: タイトル + サブタイトル */}
          <div
            className="bg-background/40 flex flex-col items-center
              justify-center rounded-full px-4 py-1 shadow-md backdrop-blur-sm"
          >
            <span className="text-sm font-semibold whitespace-nowrap">
              gdoc-logs
            </span>
            {currentHeading && (
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {currentHeading}のログ
              </span>
            )}
          </div>

          {/* 右: ミートボールメニュー or サインインボタン */}
          <div className="flex justify-end">
            {accessToken ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/40 rounded-full shadow-md
                      backdrop-blur-xs"
                    aria-label="メニューを開く"
                  >
                    <MoreHorizontal className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {selectedDoc && (
                    <DropdownMenuLabel
                      className="text-muted-foreground max-w-56 truncate
                        font-normal"
                    >
                      {selectedDoc.name}
                    </DropdownMenuLabel>
                  )}
                  <DropdownMenuItem onClick={() => void handlePickDoc()}>
                    <FileText className="size-4" />
                    {selectedDoc ? "ドキュメントを変更" : "ドキュメントを選択"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      clearToken();
                      setCurrentHeading(null);
                    }}
                  >
                    <LogOut className="size-4" />
                    サインアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => login()} size="sm">
                Googleでログイン
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* メインコンテンツ（ヘッダーは absolute なので flex-1 で全体を占有） */}
      <main className="min-h-0 flex-1">
        {!accessToken ? (
          <p
            className="text-muted-foreground px-4
              pt-[calc(4rem+env(safe-area-inset-top))] pb-6 text-sm"
          >
            Google でサインインすると Google Docs に追記できます。
          </p>
        ) : !selectedDoc ? (
          <p
            className="text-muted-foreground px-4
              pt-[calc(4rem+env(safe-area-inset-top))] pb-6 text-sm"
          >
            メニューからドキュメントを選択してください。
          </p>
        ) : (
          <TodaysDiary
            docId={selectedDoc.id}
            accessToken={accessToken}
            refreshKey={refreshKey}
            onLoaded={handleLoaded}
            onHeadingChange={setCurrentHeading}
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
