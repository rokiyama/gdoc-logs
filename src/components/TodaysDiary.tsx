import { useEffect, useState } from "react";

import { extractContentAfterLastH2, readDoc } from "@/lib/google-docs";
import type { GDocsDocument } from "@/lib/google-docs";

interface Props {
  docId: string;
  accessToken: string;
}

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

export function TodaysDiary({ docId, accessToken }: Props) {
  const [heading, setHeading] = useState("");
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    readDoc(docId, accessToken)
      .then((doc) => {
        setHeading(getLastH2Text(doc));
        setParagraphs(extractContentAfterLastH2(doc));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      })
      .finally(() => setLoading(false));
  }, [docId, accessToken]);

  if (loading) {
    return (
      <p className="text-muted-foreground text-sm">読み込み中...</p>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (!heading) {
    return (
      <p className="text-muted-foreground text-sm">
        H2 見出しが見つかりませんでした。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm font-medium">{heading}</p>
      {paragraphs.length === 0 ? (
        <p className="text-muted-foreground text-sm">まだ記録がありません。</p>
      ) : (
        <ul className="space-y-1">
          {paragraphs.map((p, i) => (
            <li key={i} className="text-sm">
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
