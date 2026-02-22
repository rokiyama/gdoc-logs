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

// ---- エラークラス ----

export class AuthExpiredError extends Error {
  constructor() {
    super("認証の有効期限が切れました。再度サインインしてください。");
    this.name = "AuthExpiredError";
  }
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
  if (res.status === 401 || res.status === 403) {
    throw new AuthExpiredError();
  }
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
  if (res.status === 401 || res.status === 403) {
    throw new AuthExpiredError();
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Docs API error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/**
 * ドキュメント内のすべての H2 見出しテキストを配列で返す。
 */
export function findH2Headings(doc: GDocsDocument): string[] {
  const headings: string[] = [];
  for (const el of doc.body.content) {
    if (el.paragraph?.paragraphStyle?.namedStyleType === "HEADING_2") {
      const text = el.paragraph.elements
        .map((pe) => pe.textRun?.content ?? "")
        .join("")
        .replace(/\n$/, "")
        .trim();
      if (text) headings.push(text);
    }
  }
  return headings;
}

/**
 * ドキュメントの末尾に H2 見出しを追記する。
 * 同じ見出しが既にあるかどうかの判定は呼び出し元で行う。
 */
export async function appendHeadingToDoc(
  docId: string,
  dateText: string,
  accessToken: string,
): Promise<void> {
  // 末尾インデックスを取得するためにドキュメントを読む
  const doc = await readDoc(docId, accessToken);
  const content = doc.body.content;
  // 最後の構造要素の endIndex = ドキュメントの総文字数
  // endOfSegmentLocation は末尾の terminal \n の直前に挿入される
  // 挿入後、heading 段落 "{dateText}\n" は [lastEndIndex, lastEndIndex + dateText.length + 1] を占める
  const lastEndIndex = content[content.length - 1].endIndex;
  const headingStart = lastEndIndex;
  const headingEnd = lastEndIndex + dateText.length + 1;

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
              text: `\n${dateText}\n`,
              endOfSegmentLocation: { segmentId: "" },
            },
          },
          {
            updateParagraphStyle: {
              paragraphStyle: { namedStyleType: "HEADING_2" },
              fields: "namedStyleType",
              range: {
                startIndex: headingStart,
                endIndex: headingEnd,
              },
            },
          },
        ],
      }),
    },
  );
  if (res.status === 401 || res.status === 403) {
    throw new AuthExpiredError();
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Docs API error ${res.status}: ${JSON.stringify(err)}`);
  }
}

/**
 * 新しい Google Docs ドキュメントを作成する。
 */
export async function createGoogleDoc(
  title: string,
  accessToken: string,
): Promise<{ id: string; title: string }> {
  const res = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new AuthExpiredError();
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Docs API error ${res.status}: ${JSON.stringify(err)}`);
  }
  const doc = (await res.json()) as { documentId: string; title: string };
  return { id: doc.documentId, title: doc.title };
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
