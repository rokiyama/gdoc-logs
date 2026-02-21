import { useGoogleLogin } from "@react-oauth/google";
import { Menu, Pencil } from "lucide-react";
import { useState } from "react";

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

  const login = useGoogleLogin({
    onSuccess: (response) => setToken(response.access_token),
    onError: () => console.error("Google login failed"),
    scope: SCOPES,
  });

  function handlePostSuccess() {
    setComposeOpen(false);
    setRefreshKey((k) => k + 1);
  }

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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="メニューを開く"
          >
            <Menu className="size-5" />
          </Button>
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
