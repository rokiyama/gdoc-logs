# セッション引き継ぎメモ

---

## 作業ルール

- ある程度まとまった作業が完了したら、こまめに git コミットすること。
- コミット前に必ず以下のコマンドをすべて通過させること（CI と同じチェック）:
  ```
  pnpm format:check && pnpm lint && pnpm tsc --noEmit && pnpm build
  ```
  フォーマットエラーは `pnpm format` で自動修正できる。

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

**主要ファイル**

- `src/main.tsx` — `<GoogleOAuthProvider>` ラッパー
- `src/App.tsx` — 認証ゲート + レイアウト
- `src/hooks/useAuth.ts` — access_token の React state 管理
- `src/hooks/useSelectedDoc.ts` — 選択ドキュメント（localStorage 永続化）
- `src/lib/storage.ts` — localStorage ヘルパー
- `src/lib/google-docs.ts` — `appendTextToDoc()` / `readDoc()` / `extractContentAfterLastH2()`
- `src/lib/google-picker.ts` — Google Picker を開くユーティリティ
- `src/components/DocSelector.tsx` — Picker を開くボタン
- `src/components/ComposeOverlay.tsx` — フルスクリーン投稿画面（Cmd+Enter 対応）

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
- `eslint.config.js` — react / better-tailwindcss / eslint-config-prettier を追加。`src/components/ui/**` は shadcn/ui 生成コードのため一部ルールをオフ
- `package.json` — `format` / `format:check` スクリプトを追加

**ハマりポイント**

- `prettier-plugin-classnames` + `singleQuote: true` の組み合わせで shadcn/ui の `button.tsx` のネストしたクォートをパースできずクラッシュ。`singleQuote` を削除することで解消。
- ESLint flat config では、ルールオーバーライドブロックをメインブロックの**後**に置かないと上書きされない。
- `react-hooks/set-state-in-effect` ルール: `useEffect` 内で `setState` を同期呼び出しするとエラー。setState は `.then()` / `.catch()` の非同期コールバック内のみで呼ぶ。
- `better-tailwindcss/no-unknown-classes` ルール: CSS `@layer utilities` で定義したカスタムクラス（`.pt-safe` など）は ESLint に未知クラスと判定されエラーになる。Tailwind の任意値構文 `pt-[env(safe-area-inset-top)]` を使うことで回避できる。
- Tailwind v4 での短縮記法: `h-* w-*` → `size-*`、`text-sm leading-relaxed` → `text-sm/relaxed`

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

---

### Step 2: 直近のログ表示 ✅ 完了

- `src/components/TodaysDiary.tsx` — ドキュメントを fetch して最後の H2 以降のログを全件表示。データ読み込み後に最下部へ自動スクロール。`refreshKey` prop の変化で再 fetch。

**アルゴリズム（`src/lib/google-docs.ts`）**

1. `GET https://docs.googleapis.com/v1/documents/{docId}` でドキュメント取得
2. `body.content` を走査し `namedStyleType === "HEADING_2"` の最後のインデックスを特定
3. それ以降の paragraph の `textRun.content` を収集、末尾 `\n` を除去

---

### Step 2-2: モバイル UI 改善 ✅ 完了

**現在の UI 構成**

```
メイン画面
┌────────────────────────────────┐  ← safe-area-top
│ gdoc-logs               [☰]  │  ← sticky ヘッダー
├────────────────────────────────┤
│                                │
│  TodaysDiary（全画面スクロール）│
│  （デフォルトスクロール位置=最下部）
│                                │
│                        [✎ FAB]│  ← 常時表示、未選択時は disabled
└────────────────────────────────┘  ← safe-area-bottom

ハンバーガーメニュー（Sheet）: DocSelector / Sign out
投稿画面（ComposeOverlay）: 固定ヘッダー [キャンセル][送信] + 高さ固定 Textarea
```

**ハマりポイント**

- `better-tailwindcss/no-unknown-classes` 対策として safe-area は `pt-[env(safe-area-inset-top)]` / `pb-[env(safe-area-inset-bottom)]` の任意値構文で記述（CSS カスタムクラス不使用）
- `react-hooks/set-state-in-effect`: refreshKey 変化時に `setState(null)` を effect の同期部分で呼ぶとエラー。前のデータを表示したままフェッチし、完了後に setState する方式で解消。

---

### Step 2-3: iOS メモアプリ風 UI リデザイン ✅ 完了

**変更内容**

- ヘッダーを半透明（`bg-background/80 backdrop-blur-md`）に変更
- ヘッダーを 3 カラムレイアウトに変更し、タイトルを中央寄せ
- ヘッダーサブタイトルに最終 H2 見出しの日付「`<日付>のログ`」を表示（`TodaysDiary` → `onHeadingChange` コールバックで伝播）
- ハンバーガーアイコン → ミートボールアイコン（`MoreHorizontal`）に変更
- Sheet（サイドメニュー）→ DropdownMenu（アイコン + ラベル形式）に差し替え
  - `FileText` + ドキュメント選択/変更
  - `LogOut` + サインアウト
  - 選択中ドキュメント名をラベルとして表示
- `DocSelector` ラベルを「追記先のドキュメント」→「選択中のドキュメント」に変更
- shadcn/ui `dropdown-menu` コンポーネントを追加

**ハマりポイント**

- `react-hooks/set-state-in-effect` ルール: `useEffect` 内で heading リセットを行うとエラー。各イベントハンドラ（`handlePickDoc` / サインアウト onClick）で直接 `setCurrentHeading(null)` を呼ぶ方式で解消。
- `react-hooks/exhaustive-deps`: `onHeadingChange` を `useEffect` の deps 配列に追加。

---

### Step 3: 音声入力（OpenAI Whisper API）（未着手）

**必要な追加環境変数**

```
VITE_OPENAI_API_KEY=sk-...
```

⚠️ 個人用ツールのため client-side に API キーを置く。**公開リポジトリにしない**。

**実装方針**

`ComposeOverlay.tsx` に `VoiceButton` コンポーネントを追加。Textarea の下・送信ボタンの横に配置し、`onTranscript` コールバックで受け取ったテキストを `setText()` にセット。

**実装フロー**

1. 「録音」ボタン押下 → `navigator.mediaDevices.getUserMedia({ audio: true })`
2. `MediaRecorder` で録音開始（`audio/webm` 形式）
3. 「停止」ボタン押下 → `ondataavailable` で `Blob` を収集
4. `POST https://api.openai.com/v1/audio/transcriptions` に送信
   - `model: whisper-1`, `language: ja`, `response_format: text`
   - `Authorization: Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
5. レスポンスのテキストを Textarea の value に設定（ユーザーが編集してから送信）
