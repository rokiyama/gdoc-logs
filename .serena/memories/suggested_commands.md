# Suggested Commands for gdoc-logs

## 開発
- `pnpm dev` — Vite 開発サーバー起動 (http://localhost:5173/gdoc-logs/)
- `pnpm build` — TypeScript チェック + Vite ビルド → dist/
- `pnpm preview` — ビルド成果物のプレビュー

## 品質チェック
- `pnpm lint` — ESLint 実行
- `pnpm format` — Prettier でフォーマット（書き換え）
- `pnpm format:check` — Prettier フォーマットチェックのみ

## shadcn/ui コンポーネント追加
- `pnpm dlx shadcn@latest add <component>` — shadcn/ui コンポーネントを src/components/ui/ に追加

## パッケージ管理
- `pnpm install` — 依存パッケージインストール
- `pnpm add <pkg>` — パッケージ追加
- `pnpm add -D <pkg>` — dev 依存として追加
