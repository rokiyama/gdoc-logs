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
- `src/lib/google-docs.ts` — `appendTextToDoc()` / `readDoc()` / `extractContentAfterLastH2()`
- `src/lib/google-picker.ts` — Google Picker を開くユーティリティ
- `src/components/AuthButton.tsx` — Google ログイン/ログアウトボタン
- `src/components/DocSelector.tsx` — Picker を開くボタン
- `src/components/EntryForm.tsx` — テキスト入力 + 追記ボタン（Cmd+Enter 対応）

**OAuth スコープ**

- `https://www.googleapis.com/auth/documents`
  - 注意: `drive.file` スコープは Docs API batchUpdate で 404 が返り使用不可（既に確認済み）

**必要な環境変数**

```
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com  # OAuth クライアント ID
VITE_GOOGLE_API_KEY=...                               # Google Picker 用 API キー
```

---

### Step 1-2: ESLint + Prettier 設定 ✅ 完了

- `prettier.config.js` — sort-imports / tailwindcss / classnames / merge プラグイン。`singleQuote` は未設定（デフォルトのダブルクォート）
- `.prettierignore` — `dist`, `node_modules`, `pnpm-lock.yaml`, `.serena` を除外
- `eslint.config.js` — react / better-tailwindcss / eslint-config-prettier を追加。`src/components/ui/**` は shadcn/ui 生成コードのため一部ルールをオフ
- `tsconfig.app.json` — `noUnusedLocals` / `noUnusedParameters` を削除（ESLint の warn に委譲）
- `package.json` — `format` / `format:check` スクリプトを追加

**ハマりポイント**

- `prettier-plugin-classnames` + `singleQuote: true` の組み合わせで shadcn/ui の `button.tsx` のネストしたクォートをパースできずクラッシュ。`singleQuote` を削除することで解消。
- ESLint flat config では、ルールオーバーライドブロックをメインブロックの**後**に置かないと上書きされない。
- `react-hooks/set-state-in-effect` ルール: `useEffect` 内で `setState` を同期呼び出しするとエラー。state を判別共用体（`null | {ok:true,...} | {ok:false,...}`）にまとめ、setState は `.then()` / `.catch()` の非同期コールバック内のみで呼ぶことで解消。
- Tailwind v4 での短縮記法: `h-* w-*` → `size-*`、`text-sm leading-relaxed` → `text-sm/relaxed`（`leading-relaxed` 自体は v4 でも使用可能）

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

**`.github/workflows/deploy.yml`** — `main` push または手動実行でデプロイ。ステップ順: `format:check` → `lint` → `build`（いずれか失敗でデプロイ停止）

**動作確認済み**: PC・スマホ両方で正常動作、モバイルレイアウトも問題なし。

---

### Step 2: 直近のログ表示 ✅ 完了

- `src/components/TodaysDiary.tsx` — 新規作成
- `src/components/ui/dialog.tsx` — shadcn Dialog を追加

**表示仕様**

- App.tsx で「直近のログ」カードとして EntryForm の**上**に配置
- コンパクト表示: `max-h-28 overflow-y-auto`、データ読み込み後に最下部へ自動スクロール
- `Maximize2` アイコンボタン（ラベルなし）でモーダルを開き全文表示

**アルゴリズム**

1. `GET https://docs.googleapis.com/v1/documents/{docId}` でドキュメント取得
2. `body.content` を走査し `namedStyleType === "HEADING_2"` の最後のインデックスを特定
3. それ以降の paragraph の `textRun.content` を収集、末尾 `\n` を除去

---

### Step 2-2: モバイル UI 改善（未着手）

**課題**

- iOS PWA で画面下部がホームインジケーターに重なる
- Textarea が文字数に応じて伸縮して入力しづらい
- ドキュメント選択が常時表示されており邪魔

**新しい UI 構成**

```
メイン画面（ログイン済み）
┌────────────────────────────────┐  ← safe-area-top
│ gdoc-logs               [☰]  │  ← ヘッダー（ハンバーガーメニュー）
├────────────────────────────────┤
│                                │
│  TodaysDiary（全画面スクロール）│  ← 残余スペースをすべて使用
│  （デフォルトスクロール位置=最下部）
│                                │
│                        [✎ FAB]│  ← 右下固定（投稿ボタン）
└────────────────────────────────┘  ← safe-area-bottom

ハンバーガーメニュー（Sheet スライドイン）
- DocSelector（ドキュメント選択・変更）
- Sign out ボタン

投稿画面（FAB タップ後、フルスクリーンオーバーレイ）
┌────────────────────────────────┐
│ [キャンセル]    [送信]          │  ← 固定ヘッダー
├────────────────────────────────┤
│                                │
│  Textarea（高さ固定 ~50vh）    │  ← resize-none / overflow-y-auto
│                                │
└────────────────────────────────┘
```

**変更ファイル一覧**

- `index.html` — viewport meta に `viewport-fit=cover` を追加
- `src/index.css` — `.pt-safe` / `.pb-safe` ユーティリティを追加（`env(safe-area-inset-*)`）
- `src/components/ui/sheet.tsx` — shadcn Sheet を追加（`pnpm dlx shadcn@latest add sheet`）
- `src/components/TodaysDiary.tsx` — Dialog/モーダルを削除、全件表示に変更、`refreshKey: number` prop 追加
- `src/components/ComposeOverlay.tsx` — 新規作成。EntryForm のロジックを移植しフルスクリーン UI に変更
- `src/App.tsx` — `min-h-[100dvh]` + safe-area 対応レイアウト、Sheet メニュー、FAB、`refreshKey` state を実装
- `src/components/EntryForm.tsx` — ComposeOverlay に移植後、削除

**ハマりポイント（実装時の注意）**

- ドキュメント未選択時も同じレイアウトで表示し、本文エリアに「メニューからドキュメントを選択してください」と案内する
- 投稿成功後に TodaysDiary を再 fetch するため、App の `refreshKey` をインクリメントして prop 経由で渡す
- Textarea は高さ固定（`h-[50vh]`）・`resize-none`・`overflow-y-auto`。キーボード表示/非表示での高さ調整は行わない（複雑なため）

---

### Step 3: 音声入力（OpenAI Whisper API）（未着手）

**やること**
`EntryForm.tsx` に `VoiceButton` コンポーネントを追加するだけ。既存フォームの変更は最小限。

**必要な追加環境変数**

```
VITE_OPENAI_API_KEY=sk-...
```

⚠️ 個人用ツールのため client-side に API キーを置く。**公開リポジトリにしない**。

**実装フロー**

1. 「録音」ボタン押下 → `navigator.mediaDevices.getUserMedia({ audio: true })`
2. `MediaRecorder` で録音開始（`audio/webm` 形式）
3. 「停止」ボタン押下 → `ondataavailable` で `Blob` を収集
4. `POST https://api.openai.com/v1/audio/transcriptions` に送信
   - `model: whisper-1`, `language: ja`, `response_format: text`
   - `Authorization: Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
5. レスポンスのテキストを `<Textarea>` の value に設定（ユーザーが編集してから送信）

**EntryForm.tsx への組み込み**

- `VoiceButton` を同ファイル内に定義し、Textarea の下・送信ボタンの横に配置
- `onTranscript` コールバックで受け取ったテキストを `setText()` にセット
