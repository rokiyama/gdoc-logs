# タスク完了時のチェックリスト

コードを変更したら以下を実行してから完了とする。

1. `pnpm lint` — ESLint エラーがないか確認
2. `pnpm format:check` — Prettier フォーマットが正しいか確認
   - ズレがあれば `pnpm format` で修正
3. `pnpm build` — TypeScript コンパイルエラーとビルドエラーがないか確認

開発中の動作確認:
- `pnpm dev` でローカルサーバーを起動し、ブラウザで確認
