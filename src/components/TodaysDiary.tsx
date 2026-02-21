import { Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractContentAfterLastH2, readDoc } from "@/lib/google-docs";
import type { GDocsDocument } from "@/lib/google-docs";

interface Props {
  docId: string;
  accessToken: string;
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
    <ul className="space-y-1.5">
      {paragraphs.map((p, i) => (
        <li key={i} className="text-sm/relaxed">
          {p}
        </li>
      ))}
    </ul>
  );
}

export function TodaysDiary({ docId, accessToken }: Props) {
  const [state, setState] = useState<FetchState>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const compactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    readDoc(docId, accessToken)
      .then((doc) => {
        if (!cancelled) {
          setState({
            ok: true,
            heading: getLastH2Text(doc),
            paragraphs: extractContentAfterLastH2(doc),
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            ok: false,
            message:
              err instanceof Error ? err.message : "読み込みに失敗しました",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [docId, accessToken]);

  // コンパクト表示: データ読み込み後に最下部へスクロール
  useEffect(() => {
    if (state?.ok && compactRef.current) {
      compactRef.current.scrollTop = compactRef.current.scrollHeight;
    }
  }, [state]);

  if (state === null) {
    return <p className="text-muted-foreground text-sm">読み込み中...</p>;
  }

  if (!state.ok) {
    return <p className="text-destructive text-sm">{state.message}</p>;
  }

  const { heading, paragraphs } = state;

  if (!heading) {
    return (
      <p className="text-muted-foreground text-sm">
        H2 見出しが見つかりませんでした。
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-medium">{heading}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            onClick={() => setModalOpen(true)}
          >
            <Maximize2 className="size-3.5" />
            <span className="sr-only">全文を表示</span>
          </Button>
        </div>

        {paragraphs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            まだ記録がありません。
          </p>
        ) : (
          <div ref={compactRef} className="max-h-28 overflow-y-auto">
            <LogList paragraphs={paragraphs} />
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {paragraphs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                まだ記録がありません。
              </p>
            ) : (
              <LogList paragraphs={paragraphs} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
