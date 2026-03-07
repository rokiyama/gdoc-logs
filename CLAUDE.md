# CLAUDE.md

## コマンド実行

Node.js のバージョン管理に nvm を使用している。コマンドを実行する前に必ず nvm を初期化すること。

```bash
source ~/.nvm/nvm.sh && nvm use && <command>
```

例:
- lint: `source ~/.nvm/nvm.sh && nvm use && pnpm lint`
- dev: `source ~/.nvm/nvm.sh && nvm use && pnpm dev`
- build: `source ~/.nvm/nvm.sh && nvm use && pnpm build`
