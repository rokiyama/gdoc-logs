# セッション引き継ぎメモ

---

## 作業ルール

- ある程度まとまった作業が完了したら、こまめに git コミットすること。

---

## アプリ概要

Google Docs をつぶやき日記として使う個人用 SPA。
ユーザーが H2 見出しで日付（`2026-02-21` 形式）を手動入力し、アプリはテキストを末尾に追記するだけ。

- **リポジトリ名**: `gdoc-logs`
- **GitHub Pages URL**: `https://<user>.github.io/gdoc-logs/`
- **技術スタック**: Vite + TypeScript + React / Tailwind CSS v4 + shadcn/ui / pnpm / Node 24

---

## 全体ロードマップ

### Step 1: 追記機能 ✅ 完了

- Google OAuth2 ログイン（`documents` スコープ）
- Google Picker でドキュメントを選択（選択内容を localStorage に永続化）
- テキスト入力 → Google Docs 末尾に追記

**実装済みファイル**

- `src/main.tsx` — `<GoogleOAuthProvider>` ラッパー
- `src/App.tsx` — 認証ゲート + レイアウト
- `src/hooks/useAuth.ts` — access_token の React state 管理
- `src/hooks/useSelectedDoc.ts` — 選択ドキュメント（localStorage 永続化）
- `src/lib/storage.ts` — localStorage ヘルパー
- `src/lib/google-drive.ts` — `listDocs()`（現在は未使用、Picker に移行済み）
- `src/lib/google-docs.ts` — `appendTextToDoc()` / `readDoc()` / `extractContentAfterLastH2()`（後2つは stub）
- `src/lib/google-picker.ts` — Google Picker を開くユーティリティ
- `src/components/AuthButton.tsx` — Google ログイン/ログアウトボタン
- `src/components/DocSelector.tsx` — Picker を開くボタン（ドロップダウンではない）
- `src/components/EntryForm.tsx` — テキスト入力 + 追記ボタン（Cmd+Enter 対応）

**OAuth スコープ**

- `https://www.googleapis.com/auth/documents`
  - 注意: `drive.file` スコープは Docs API batchUpdate で 404 が返り使用不可（既に確認済み）

**追記の API 呼び出し**

```
POST https://docs.googleapis.com/v1/documents/{docId}:batchUpdate
{
  "requests": [{
    "insertText": {
      "text": "<text>\n",
      "endOfSegmentLocation": { "segmentId": "" }
    }
  }]
}
```

**必要な環境変数**

```
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com  # OAuth クライアント ID
VITE_GOOGLE_API_KEY=...                               # Google Picker 用 API キー
```

---

### Step 1-2: ESLint + Prettier 設定 ✅ 完了

- `prettier.config.js` — sort-imports / tailwindcss / classnames / merge プラグイン。`singleQuote` は未設定（デフォルトのダブルクォート）
- `.prettierignore` — `dist`, `node_modules`, `pnpm-lock.yaml` を除外
- `eslint.config.js` — react / better-tailwindcss / eslint-config-prettier を追加。`src/components/ui/**` は shadcn/ui 生成コードのため一部ルールをオフ
- `tsconfig.app.json` — `noUnusedLocals` / `noUnusedParameters` を削除（ESLint の warn に委譲）
- `package.json` — `format` / `format:check` スクリプトを追加

**ハマりポイント**

- `prettier-plugin-classnames` + `singleQuote: true` の組み合わせで shadcn/ui の `button.tsx` のネストしたクォートをパースできずクラッシュ。`singleQuote` を削除することで解消。
- ESLint flat config では、ルールオーバーライドブロックをメインブロックの**後**に置かないと上書きされない。

---

### Step 1-3: GitHub Actions + GitHub Pages デプロイ ✅ 完了

**事前にユーザーが手動で行う作業（完了済み）**

1. Google Cloud Console → OAuth クライアントの「承認済みの JavaScript 生成元」に `https://<GitHubユーザー名>.github.io` を追加
2. Google Cloud Console → API キーの「HTTPリファラーの制限」に `https://<user>.github.io/*` を追加
3. GitHub リポジトリ Settings > Pages > Source: **GitHub Actions** を選択
4. GitHub リポジトリ Settings > Secrets and variables > Actions > **Variables** タブ > Repository variables に追加:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_API_KEY`
   - ※ `VITE_*` はビルド時に JS バンドルに埋め込まれ公開されるため secrets ではなく variables で正しい

**作成ファイル: `.github/workflows/deploy.yml`**（`main` push または手動実行でデプロイ）

**動作確認済み**: PC・スマホ両方で正常動作、モバイルレイアウトも問題なし。

---

### Step 2: 今日の内容表示（未着手）

**やること**
`src/components/TodaysDiary.tsx` を新規作成し、`App.tsx` に追加するだけ。
`src/lib/google-docs.ts` に `readDoc` と `extractContentAfterLastH2` の stub が既にあるので、中身を実装する。

**アルゴリズム（最後の H2 以降のテキスト抽出）**

1. `GET https://docs.googleapis.com/v1/documents/{docId}` でドキュメント取得
2. `body.content` 配列を走査
3. `paragraph.paragraphStyle.namedStyleType === "HEADING_2"` の最後のインデックスを特定
4. それ以降の `paragraph` 要素を収集
5. 各 paragraph の `elements[].textRun.content` を結合（末尾 `\n` を除去）
6. 空でない文字列の配列を返す

**Google Docs JSON 構造（抜粋）**

```json
{
  "body": {
    "content": [
      {
        "paragraph": {
          "elements": [{ "textRun": { "content": "2026-02-21\n" } }],
          "paragraphStyle": { "namedStyleType": "HEADING_2" }
        }
      },
      {
        "paragraph": {
          "elements": [{ "textRun": { "content": "日記の内容\n" } }],
          "paragraphStyle": { "namedStyleType": "NORMAL_TEXT" }
        }
      }
    ]
  }
}
```

**実装する関数（`src/lib/google-docs.ts` の stub を完成させる）**

```typescript
export async function readDoc(
  docId: string,
  accessToken: string,
): Promise<GDocsDocument> {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Docs read error: ${res.status}`);
  return res.json();
}

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
      .map((pe: ParagraphElement) => pe.textRun?.content ?? "")
      .join("")
      .replace(/\n$/, "");
    if (text.trim()) result.push(text);
  }
  return result;
}
```

**TodaysDiary コンポーネント骨格（新規作成）**

```tsx
// src/components/TodaysDiary.tsx
function TodaysDiary({ docId, accessToken }: { docId: string; accessToken: string }) {
  const [heading, setHeading] = useState("");
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    readDoc(docId, accessToken)
      .then((doc) => {
        // 最後の H2 テキストを heading に設定
        // extractContentAfterLastH2(doc) を paragraphs に設定
      })
      .finally(() => setLoading(false));
  }, [docId, accessToken]);

  return (/* shadcn Card で表示 */);
}
```

**App.tsx への追加箇所**

- selectedDoc がある場合、`<EntryForm>` の下に `<TodaysDiary docId={selectedDoc.id} accessToken={accessToken} />` を追加

---

### Step 3: 音声入力（OpenAI Whisper API）（未着手）

**やること**
`EntryForm.tsx` に録音ボタンを追加するだけ。既存フォームの変更は最小限。

**必要な追加環境変数**

```
VITE_OPENAI_API_KEY=sk-...
```

⚠️ 個人用ツールのため client-side に API キーを置く。**公開リポジトリにしない**。

**実装フロー**

1. 「録音」ボタン押下 → `navigator.mediaDevices.getUserMedia({ audio: true })`
2. `MediaRecorder` で録音開始（`audio/webm` 形式）
3. 「停止」ボタン押下 → `ondataavailable` で `Blob` を収集
4. OpenAI API に送信:

   ```
   POST https://api.openai.com/v1/audio/transcriptions
   Content-Type: multipart/form-data
   Authorization: Bearer <VITE_OPENAI_API_KEY>

   file: <Blob> (filename: "audio.webm")
   model: whisper-1
   language: ja
   response_format: text
   ```

5. レスポンスのテキストを `<Textarea>` の value に設定（ユーザーが編集してから送信できる）

**VoiceButton コンポーネント骨格（EntryForm.tsx に組み込む）**

```tsx
function VoiceButton({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", blob, "audio.webm");
      formData.append("model", "whisper-1");
      formData.append("language", "ja");
      formData.append("response_format", "text");
      const res = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          },
          body: formData,
        },
      );
      const text = await res.text();
      onTranscript(text);
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={recording ? stopRecording : startRecording}
    >
      {recording ? "停止" : "録音"}
    </Button>
  );
}
```
