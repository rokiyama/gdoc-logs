# gdoc-logs

Google Docs をつぶやき日記として使う個人用 SPA。

## 機能

- Google OAuth でサインイン
- Google Picker でドキュメントを選択
- テキストを入力して選択中の Google Docs に追記

## 技術スタック

- Vite + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- `@react-oauth/google`（implicit flow）

## セットアップ

```bash
cp .env.example .env
# .env に VITE_GOOGLE_CLIENT_ID と VITE_GOOGLE_API_KEY を設定

pnpm install
pnpm dev
```

## デプロイ

GitHub Actions で GitHub Pages に自動デプロイ。
