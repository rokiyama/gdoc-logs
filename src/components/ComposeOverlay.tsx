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
  const [text, setText] = useState("");
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
          className="rounded-full px-5"
        >
          {submitting ? "送信中..." : "送信"}
        </Button>
      </header>

      {/* テキストエリア（高さ固定） */}
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
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
