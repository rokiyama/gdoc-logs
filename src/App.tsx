import { useGoogleLogin } from "@react-oauth/google";
import {
  CalendarPlus,
  FileText,
  LogOut,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ComposeOverlay } from "@/components/ComposeOverlay";
import { TodaysDiary } from "@/components/TodaysDiary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  AuthExpiredError,
  appendHeadingToDoc,
  findH2Headings,
  readDoc,
} from "@/lib/google-docs";
import { openGooglePicker } from "@/lib/google-picker";

const SCOPES = "https://www.googleapis.com/auth/documents";

/** "2026-02-22" 形式の今日の日付文字列を返す */
function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ビルド情報文字列を組み立てる（CI でのみ値が入る） */
function getBuildInfo(): string | null {
  const hash = import.meta.env.VITE_GIT_COMMIT_HASH;
  const commitDate = import.meta.env.VITE_GIT_COMMIT_DATE;
  const buildDate = import.meta.env.VITE_BUILD_DATE;
  if (!hash && !buildDate) return null;

  const parts: string[] = [];
  if (hash) parts.push(hash);
  if (commitDate) {
    const d = new Date(commitDate);
    parts.push(
      d.toLocaleDateString("ja-JP") +
        " " +
        d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
    );
  }
  if (buildDate) {
    const d = new Date(buildDate);
    const built =
      "build: " +
      d.toLocaleDateString("ja-JP") +
      " " +
      d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    parts.push(built);
  }
  return parts.join(" · ");
}

const buildInfo = getBuildInfo();

export default function App() {
  const { accessToken, expiresAt, setToken, clearToken } = useAuth();
  const { selectedDoc, selectDoc } = useSelectedDoc();
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [currentHeading, setCurrentHeading] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [addingHeading, setAddingHeading] = useState(false);
  const [duplicateWarningDate, setDuplicateWarningDate] = useState<
    string | null
  >(null);
  // 手動リロード時のみトーストを出すためのフラグ
  const isManualRefresh = useRef(false);

  // 認証エラー（401/403）またはタイマー期限切れ時の共通ハンドラ
  const handleAuthExpired = useCallback(() => {
    clearToken();
    setCurrentHeading(null);
    toast.error("認証の有効期限が切れました。再度サインインしてください。");
  }, [clearToken]);

  // トークン期限切れをタイマーで自動検知してログイン画面に戻す
  useEffect(() => {
    if (!accessToken || !expiresAt) return;
    const remaining = expiresAt - Date.now();
    const id = setTimeout(handleAuthExpired, Math.max(0, remaining));
    return () => clearTimeout(id);
  }, [accessToken, expiresAt, handleAuthExpired]);

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
    setLastSyncedAt(new Date());
    if (isManualRefresh.current) {
      isManualRefresh.current = false;
      toast.success("更新しました");
    }
  }, []);

  // 手動同期
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
        import.meta.env.VITE_GOOGLE_API_KEY,
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

  // 今日の日付で H2 見出しを追加
  async function handleAddTodayHeading() {
    if (!accessToken || !selectedDoc) return;
    const todayDate = getTodayDateString();
    setAddingHeading(true);
    try {
      const doc = await readDoc(selectedDoc.id, accessToken);
      const headings = findH2Headings(doc);
      if (headings.includes(todayDate)) {
        setDuplicateWarningDate(todayDate);
        return;
      }
      await appendHeadingToDoc(selectedDoc.id, todayDate, accessToken);
      toast.success(`見出し「${todayDate}」を追加しました`);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      if (e instanceof AuthExpiredError) {
        handleAuthExpired();
      } else {
        toast.error(
          e instanceof Error ? e.message : "見出しの追加に失敗しました",
        );
      }
    } finally {
      setAddingHeading(false);
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
          {/* 左: 空き（同期ボタンはメニューへ移動） */}
          <div />

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
                <DropdownMenuContent align="end" className="w-64">
                  {selectedDoc && (
                    <DropdownMenuLabel
                      className="text-muted-foreground max-w-64 truncate
                        font-normal"
                    >
                      {selectedDoc.name}
                    </DropdownMenuLabel>
                  )}
                  <DropdownMenuItem onClick={() => void handlePickDoc()}>
                    <FileText className="size-4" />
                    {selectedDoc ? "ドキュメントを変更" : "ドキュメントを選択"}
                  </DropdownMenuItem>
                  {selectedDoc && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => void handleAddTodayHeading()}
                        disabled={addingHeading}
                      >
                        <CalendarPlus className="size-4" />
                        今日の見出しを追加
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                      >
                        <RefreshCw
                          className={
                            refreshing ? "size-4 animate-spin" : "size-4"
                          }
                        />
                        同期
                        {lastSyncedAt && (
                          <span
                            className="text-muted-foreground ml-auto text-xs"
                          >
                            {lastSyncedAt.toLocaleTimeString("ja-JP", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.reload()}>
                    <RotateCcw className="size-4" />
                    ページをリロード
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
                  {buildInfo && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel
                        className="text-muted-foreground font-normal"
                      >
                        <span className="font-mono text-xs">{buildInfo}</span>
                      </DropdownMenuLabel>
                    </>
                  )}
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
            onAuthExpired={handleAuthExpired}
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
          onAuthExpired={handleAuthExpired}
        />
      )}

      {/* 重複見出し警告ダイアログ */}
      <Dialog
        open={duplicateWarningDate !== null}
        onOpenChange={(open) => {
          if (!open) setDuplicateWarningDate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>見出しが既に存在します</DialogTitle>
            <DialogDescription>
              「{duplicateWarningDate}」の見出しは既にドキュメントに存在します。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDuplicateWarningDate(null)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
