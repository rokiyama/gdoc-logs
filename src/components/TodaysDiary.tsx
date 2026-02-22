import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  AuthExpiredError,
  extractContentAfterLastH2,
  readDoc,
} from "@/lib/google-docs";
import type { GDocsDocument } from "@/lib/google-docs";

interface Props {
  docId: string;
  accessToken: string;
  refreshKey: number;
  syncing?: boolean;
  onLoaded?: () => void;
  onHeadingChange?: (heading: string) => void;
  onAuthExpired?: () => void;
}

type FetchState =
  | null // 取得中
  | { ok: true; heading: string; paragraphs: string[] }
  | { ok: false; message: string };

function getLastH2Text(doc: GDocsDocument): string {
  let text = "";
  for (const el of doc.body.content) {
    if (el.paragraph?.paragraphStyle?.namedStyleType === "HEADING_2") {
      text = el.paragraph.elements
        .map((pe) => pe.textRun?.content ?? "")
        .join("")
        .replace(/\n$/, "");
    }
  }
  return text;
}

function LogList({ paragraphs }: { paragraphs: string[] }) {
  return (
    <ul className="space-y-1.5 px-4 pb-3">
      {paragraphs.map((p, i) => (
        <li key={i} className="text-sm/relaxed">
          {p}
        </li>
      ))}
    </ul>
  );
}

export function TodaysDiary({
  docId,
  accessToken,
  refreshKey,
  syncing,
  onLoaded,
  onHeadingChange,
  onAuthExpired,
}: Props) {
  const [state, setState] = useState<FetchState>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    readDoc(docId, accessToken)
      .then((doc) => {
        if (!cancelled) {
          const heading = getLastH2Text(doc);
          const paragraphs = extractContentAfterLastH2(doc);
          setState({ ok: true, heading, paragraphs });
          onHeadingChange?.(heading);
          onLoaded?.();
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          if (err instanceof AuthExpiredError) {
            onAuthExpired?.();
          } else {
            setState({
              ok: false,
              message:
                err instanceof Error ? err.message : "読み込みに失敗しました",
            });
          }
          onLoaded?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    docId,
    accessToken,
    refreshKey,
    onLoaded,
    onHeadingChange,
    onAuthExpired,
  ]);

  // データ読み込み後に最下部へスクロール
  useEffect(() => {
    if (state?.ok && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [state]);

  if (state === null) {
    return (
      <p
        className="text-muted-foreground px-4
          pt-[calc(4rem+env(safe-area-inset-top))] pb-3 text-sm"
      >
        読み込み中...
      </p>
    );
  }

  if (!state.ok) {
    return (
      <p
        className="text-destructive px-4
          pt-[calc(4rem+env(safe-area-inset-top))] pb-3 text-sm"
      >
        {state.message}
      </p>
    );
  }

  const { heading, paragraphs } = state;

  if (!heading) {
    return (
      <p
        className="text-muted-foreground px-4
          pt-[calc(4rem+env(safe-area-inset-top))] pb-3 text-sm"
      >
        H2 見出しが見つかりませんでした。
      </p>
    );
  }

  return (
    <div
      ref={listRef}
      className="h-full overflow-y-auto
        pt-[calc(4rem+env(safe-area-inset-top))]"
    >
      {paragraphs.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">
          まだ記録がありません。
        </p>
      ) : (
        <LogList paragraphs={paragraphs} />
      )}
      {syncing && (
        <div className="px-4 pb-3">
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        </div>
      )}
      {/* FAB（固定ボタン）に隠れないようスペーサー */}
      <div className="h-20" aria-hidden="true" />
    </div>
  );
}
