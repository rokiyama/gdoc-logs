# コードスタイル・規約

## TypeScript
- strict モード有効（tsconfig.app.json 参照）
- 型アノテーション: 明示的型推論を基本とし、必要な箇所に型注釈
- `_` プレフィックス付き変数は未使用でも lint エラーにならない

## React
- 関数コンポーネント + React Hooks のみ（クラスコンポーネント不使用）
- JSX 自動インポート（React 17+ new JSX transform）
- Named export を基本とする（App.tsx のみ default export）

## Tailwind CSS
- Tailwind v4（CSS ベース設定、tailwind.config.js 不要）
- shadcn/ui の `cn()` 関数でクラス結合（`clsx` + `tailwind-merge`）
- `src/index.css` がエントリポイント

## インポート順（Prettier 自動整列）
1. サードパーティモジュール
2. `@/` パスエイリアス（src/ を指す）
3. 相対パス

## Prettier 設定
- plugins: sort-imports, tailwindcss, classnames, merge
- デフォルト設定（シングルクォートなし、セミコロンあり）

## ESLint
- TypeScript ESLint + React Hooks + react-refresh + better-tailwindcss
- `src/components/ui/` は shadcn/ui 生成ファイルのため一部ルール緩和

## タスク完了時にやること（task_completion.md 参照）
