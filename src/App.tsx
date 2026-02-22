import { useGoogleLogin } from "@react-oauth/google";
import { Loader2, Pencil } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppMenu } from "@/components/AppMenu";
import { ComposeOverlay } from "@/components/ComposeOverlay";
import { CreateDocDialog } from "@/components/CreateDocDialog";
import { DuplicateHeadingDialog } from "@/components/DuplicateHeadingDialog";
import { TodaysDiary } from "@/components/TodaysDiary";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useAddHeading } from "@/hooks/useAddHeading";
import { useAuth } from "@/hooks/useAuth";
import { useCreateDoc } from "@/hooks/useCreateDoc";
import { useDocSync } from "@/hooks/useDocSync";
import { usePendingSubmit } from "@/hooks/usePendingSubmit";
import { useSelectedDoc } from "@/hooks/useSelectedDoc";
import { openGooglePicker } from "@/lib/google-picker";

const SCOPES = "https://www.googleapis.com/auth/documents";

export default function App() {
  const { accessToken, expiresAt, setToken, clearToken } = useAuth();
  const { selectedDoc, selectDoc } = useSelectedDoc();
  const [composeOpen, setComposeOpen] = useState(false);
  const [currentHeading, setCurrentHeading] = useState<string | null>(null);

  const {
    refreshKey,
    refreshing,
    lastSyncedAt,
    handleLoaded,
    handleManualRefresh,
    refresh,
  } = useDocSync();

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

  const { submitting, handleOptimisticSubmit } = usePendingSubmit({
    accessToken,
    selectedDoc,
    onAuthExpired: handleAuthExpired,
    onSuccess: refresh,
  });

  const {
    addingHeading,
    duplicateWarningDate,
    clearDuplicateWarning,
    handleAddTodayHeading,
  } = useAddHeading({
    accessToken,
    docId: selectedDoc?.id ?? null,
    onAuthExpired: handleAuthExpired,
    onSuccess: refresh,
  });

  const [createDocDialogOpen, setCreateDocDialogOpen] = useState(false);
  const { creating, handleCreateDoc } = useCreateDoc({
    accessToken,
    onAuthExpired: handleAuthExpired,
    onDocCreated: (id, name) => {
      setCurrentHeading(null);
      selectDoc(id, name);
      setCreateDocDialogOpen(false);
    },
  });

  const login = useGoogleLogin({
    onSuccess: (response) =>
      setToken(response.access_token, response.expires_in),
    onError: () => console.error("Google login failed"),
    scope: SCOPES,
  });

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

  function handleSignOut() {
    clearToken();
    setCurrentHeading(null);
  }

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
          {/* 左: 空き */}
          <div />

          {/* 中央: タイトル + サブタイトル */}
          <div
            className="bg-background/80 flex flex-col items-center
              justify-center rounded-full px-4 py-1 shadow-xs backdrop-blur-md"
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

          {/* 右: メニュー（未ログイン時は空） */}
          <div className="flex justify-end">
            {accessToken && (
              <AppMenu
                selectedDoc={selectedDoc}
                refreshing={refreshing}
                addingHeading={addingHeading}
                lastSyncedAt={lastSyncedAt}
                onCreateDoc={() => setCreateDocDialogOpen(true)}
                onPickDoc={() => void handlePickDoc()}
                onAddTodayHeading={() => void handleAddTodayHeading()}
                onRefresh={handleManualRefresh}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="min-h-0 flex-1">
        {!accessToken ? (
          <div
            className="flex h-full flex-col items-center justify-center gap-6
              px-8 text-center"
          >
            <p className="text-muted-foreground text-sm">
              gdoc-logs は Google Docs
              のドキュメントに「つぶやき・メモ・できごと」を記録するアプリです。
              <br />
              Google でログインして、記録を始めましょう。
            </p>
            <Button onClick={() => login()}>Googleでログイン</Button>
          </div>
        ) : !selectedDoc ? (
          <div
            className="flex h-full flex-col items-center justify-center gap-4
              px-8 text-center"
          >
            <p className="text-muted-foreground text-sm">
              gdoc-logs は Google Docs
              のドキュメントに「つぶやき・メモ・できごと」を記録するアプリです。
              <br />
              メニューからドキュメントを作成・選択して、記録を始めましょう。
            </p>
          </div>
        ) : (
          <TodaysDiary
            docId={selectedDoc.id}
            accessToken={accessToken}
            refreshKey={refreshKey}
            syncing={refreshing}
            onLoaded={handleLoaded}
            onHeadingChange={setCurrentHeading}
            onAuthExpired={handleAuthExpired}
          />
        )}
      </main>

      {/* FAB（投稿ボタン） */}
      <Button
        onClick={() => setComposeOpen(true)}
        disabled={!accessToken || !selectedDoc || submitting}
        className="fixed right-5
          bottom-[calc(1.25rem+env(safe-area-inset-bottom))] size-14
          rounded-full shadow-lg"
        aria-label="投稿する"
      >
        {submitting ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Pencil className="size-5" />
        )}
      </Button>

      {/* 投稿オーバーレイ */}
      {composeOpen && accessToken && selectedDoc && (
        <ComposeOverlay
          onClose={() => setComposeOpen(false)}
          onSubmit={(text) => {
            setComposeOpen(false);
            handleOptimisticSubmit(text);
          }}
        />
      )}

      {/* 重複見出し警告ダイアログ */}
      <DuplicateHeadingDialog
        date={duplicateWarningDate}
        onClose={clearDuplicateWarning}
      />

      {/* 新規ドキュメント作成ダイアログ */}
      <CreateDocDialog
        open={createDocDialogOpen}
        creating={creating}
        onConfirm={(title) => void handleCreateDoc(title)}
        onClose={() => setCreateDocDialogOpen(false)}
      />

      <Toaster />
    </div>
  );
}
