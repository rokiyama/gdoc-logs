# セッション引き継ぎメモ

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

**やること**

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

## Step 1-2: ESLint + Prettier 設定 ✅ 完了

**作成・変更したファイル**

- `prettier.config.js`（新規）— sort-imports / tailwindcss / classnames / merge プラグイン。`singleQuote` は未設定（デフォルトのダブルクォート）
- `.prettierignore`（新規）— `dist`, `node_modules`, `pnpm-lock.yaml` を除外
- `eslint.config.js`（更新）— react / better-tailwindcss / eslint-config-prettier を追加。`src/components/ui/**` に対しては `react-refresh/only-export-components`, `no-unknown-classes`, `enforce-canonical-classes` をオフ（shadcn/ui 生成コードのため）
- `tsconfig.app.json`（更新）— `noUnusedLocals` / `noUnusedParameters` を削除（ESLint の warn に委譲）
- `package.json`（更新）— `format` / `format:check` スクリプトを追加

**ハマりポイント**

- `prettier-plugin-classnames` + `singleQuote: true` の組み合わせで、shadcn/ui の `button.tsx` にある `[&_svg:not([class*='size-'])]` のようなネストしたクォートをパースできずクラッシュ。`singleQuote` を削除（デフォルトのダブルクォートを使用）することで解消。
- ESLint flat config では、ルールオーバーライドブロックをメインブロックの**後**に置かないと上書きされない。

**コミット**

```
72fd5fd chore: add ESLint and Prettier configuration
97fc682 style: format all files with Prettier
2b99bba style: remove singleQuote, reformat all files including ui/ with Prettier
```

---

### Step 1-3: GitHub Actions + GitHub Pages デプロイ（未着手）

**事前にユーザーが手動で行う作業**

1. Google Cloud Console → OAuth クライアントの「承認済みの JavaScript 生成元」に追加:
   - `https://<GitHubユーザー名>.github.io`
2. GitHub リポジトリ Settings > Pages > Source: **GitHub Actions** を選択
3. GitHub リポジトリ Settings > Secrets and variables > Actions に追加:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_API_KEY`

**作成するファイル: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - uses: pnpm/action-setup@v4
        with: { version: latest }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
          VITE_GOOGLE_API_KEY: ${{ secrets.VITE_GOOGLE_API_KEY }}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./dist }
  deploy:
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

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

---

## git log（直近）

```
2b99bba style: remove singleQuote, reformat all files including ui/ with Prettier
97fc682 style: format all files with Prettier
72fd5fd chore: add ESLint and Prettier configuration
34cfc61 fix: use documents scope instead of drive.file for Docs API
f8d8253 refactor: narrow OAuth scope to drive.file via Google Picker
f03d37b feat: implement Step 1 - append text to Google Docs
c3118d2 setup: add Tailwind CSS v4, shadcn/ui, @react-oauth/google
1be6057 create vite app
```
