import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SelectedDoc } from "@/hooks/useSelectedDoc";
import { appendTextToDoc } from "@/lib/google-docs";

interface Props {
  accessToken: string;
  selectedDoc: SelectedDoc;
  onClose: () => void;
  onSuccess: () => void;
}

export function ComposeOverlay({
  accessToken,
  selectedDoc,
  onClose,
  onSuccess,
}: Props) {
  const DRAFT_KEY = "gdoc_logs_draft";
  const [text, setText] = useState(
    () => localStorage.getItem(DRAFT_KEY) ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = text.trim().length > 0 && !submitting;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await appendTextToDoc(selectedDoc.id, text.trim(), accessToken);
      localStorage.removeItem(DRAFT_KEY);
      toast.success("追記しました");
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "追記に失敗しました";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      {/* 固定ヘッダー */}
      <header
        className="flex h-14 shrink-0 items-center justify-between border-b px-4
          pt-[env(safe-area-inset-top)]"
      >
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          キャンセル
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="relative rounded-full px-5"
        >
          {submitting && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-4 animate-spin" />
            </span>
          )}
          <span className={submitting ? "invisible" : undefined}>送信</span>
        </Button>
      </header>

      {/* テキストエリア（高さ固定） */}
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          if (value) {
            localStorage.setItem(DRAFT_KEY, value);
          } else {
            localStorage.removeItem(DRAFT_KEY);
          }
        }}
        placeholder="ログを入力…"
        className="h-[50vh] flex-none resize-none overflow-y-auto rounded-none
          border-none p-4 text-base shadow-none focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            void handleSubmit();
          }
        }}
      />
    </div>
  );
}
