# gdoc-logs プロジェクト概要

## 目的
Google Docs をつぶやき日記として使う個人用 SPA。
テキストを入力して Google Docs ファイルに追記するシンプルなツール。

## 技術スタック
- **ランタイム**: Node 24（.nvmrc 参照）
- **ビルド**: Vite 7 + TypeScript 5.9
- **UI フレームワーク**: React 19
- **スタイリング**: Tailwind CSS v4（@tailwindcss/vite プラグイン）+ shadcn/ui
- **認証**: @react-oauth/google（Google OAuth implicit flow）
- **API**: fetch() で Google Docs REST API / Google Drive API / Google Picker API を直呼び
- **パッケージマネージャ**: pnpm
- **デプロイ先**: GitHub Pages (`base: '/gdoc-logs/'`)

## ディレクトリ構造
```
src/
  App.tsx                  # ルートコンポーネント
  main.tsx                 # エントリポイント
  components/
    AuthButton.tsx         # Google ログイン/ログアウトボタン
    DocSelector.tsx        # Google Picker でドキュメント選択
    EntryForm.tsx          # テキスト追記フォーム
    ui/                    # shadcn/ui 生成コンポーネント
  hooks/
    useAuth.ts             # accessToken state 管理
    useSelectedDoc.ts      # 選択中ドキュメント state 管理
  lib/
    google-docs.ts         # Docs API 関数・Step2 パーサー
    google-drive.ts        # Drive ファイル一覧
    google-picker.ts       # Google Picker 初期化
    storage.ts             # localStorage ユーティリティ
    utils.ts               # cn() など共通ユーティリティ
```

## 環境変数（.env）
- `VITE_GOOGLE_CLIENT_ID` — OAuth クライアント ID
- `VITE_GOOGLE_API_KEY` — Google API キー（Picker 用）

## 実装ロードマップ
- Step 1: 追記のみ（基本実装済み）
- Step 2: 今日の内容表示（最後の H2 以降を読む）
- Step 3: 音声入力（OpenAI Whisper API）
- GitHub Actions + GitHub Pages デプロイ
