import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DRAFT_KEY } from "@/lib/storage";

interface Props {
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function ComposeOverlay({ onClose, onSubmit }: Props) {
  const [text, setText] = useState(() => localStorage.getItem(DRAFT_KEY) ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [textareaHeight, setTextareaHeight] = useState<number | null>(null);

  const canSubmit = text.trim().length > 0;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const headerHeight = headerRef.current?.offsetHeight ?? 56;
      setTextareaHeight(vv.height - headerHeight);
    };
    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(text.trim());
  }

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      {/* 固定ヘッダー */}
      <header
        ref={headerRef}
        className="shrink-0 border-b pt-[env(safe-area-inset-top)]"
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Button variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-full px-5"
          >
            送信
          </Button>
        </div>
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
        style={
          textareaHeight !== null
            ? { height: `${textareaHeight}px` }
            : undefined
        }
        className="h-[calc(100dvh-3.5rem)] flex-none resize-none overflow-y-auto
          rounded-none border-none p-4 text-base shadow-none
          focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleSubmit();
          }
        }}
      />
    </div>
  );
}
