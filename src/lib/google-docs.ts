// ---- Google Docs REST API の型定義 ----

export interface TextRun {
  content: string;
  textStyle: Record<string, unknown>;
}

export interface ParagraphElement {
  startIndex: number;
  endIndex: number;
  textRun?: TextRun;
}

export interface Paragraph {
  elements: ParagraphElement[];
  paragraphStyle: {
    namedStyleType: string;
    direction?: string;
  };
}

export interface StructuralElement {
  startIndex: number;
  endIndex: number;
  paragraph?: Paragraph;
}

export interface GDocsDocument {
  documentId: string;
  title: string;
  body: {
    content: StructuralElement[];
  };
}

// ---- API 関数 ----

/**
 * ドキュメントの末尾にテキストを追記する。
 * text が改行で終わっていない場合は自動で追加する。
 */
export async function appendTextToDoc(
  docId: string,
  text: string,
  accessToken: string,
): Promise<void> {
  const textToInsert = text.endsWith("\n") ? text : `${text}\n`;
  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              text: textToInsert,
              endOfSegmentLocation: { segmentId: "" },
            },
          },
        ],
      }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Docs API error ${res.status}: ${JSON.stringify(err)}`);
  }
}

/**
 * ドキュメント全体を取得する（Step 2 で使用）。
 */
export async function readDoc(
  docId: string,
  accessToken: string,
): Promise<GDocsDocument> {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Docs API error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/**
 * ドキュメント内の最後の H2 見出し以降のテキストを段落ごとの配列で返す（Step 2 で使用）。
 * H2 が存在しない場合は空配列を返す。
 */
export function extractContentAfterLastH2(doc: GDocsDocument): string[] {
  const elements = doc.body.content;

  let lastH2Index = -1;
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].paragraph?.paragraphStyle?.namedStyleType === "HEADING_2") {
      lastH2Index = i;
    }
  }

  if (lastH2Index === -1) return [];

  const result: string[] = [];
  for (let i = lastH2Index + 1; i < elements.length; i++) {
    const el = elements[i];
    if (!el.paragraph) continue;
    const text = el.paragraph.elements
      .map((pe) => pe.textRun?.content ?? "")
      .join("")
      .replace(/\n$/, "");
    if (text.trim().length > 0) {
      result.push(text);
    }
  }
  return result;
}
