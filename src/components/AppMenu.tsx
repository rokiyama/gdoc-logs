import {
  CalendarPlus,
  FilePlus,
  FileText,
  LogOut,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** ビルド情報文字列を組み立てる（CI でのみ値が入る） */
function getBuildInfo(): string | null {
  const hash = import.meta.env.VITE_GIT_COMMIT_HASH;
  const buildDate = import.meta.env.VITE_BUILD_DATE;
  if (!hash && !buildDate) return null;

  const parts: string[] = [];
  if (hash) parts.push(hash);
  if (buildDate) {
    const d = new Date(buildDate);
    parts.push(
      d.toLocaleDateString("ja-JP") +
        " " +
        d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
    );
  }
  return parts.join(" · ");
}

const buildInfo = getBuildInfo();

interface SelectedDoc {
  id: string;
  name: string;
}

interface AppMenuProps {
  selectedDoc: SelectedDoc | null;
  refreshing: boolean;
  addingHeading: boolean;
  lastSyncedAt: Date | null;
  onCreateDoc: () => void;
  onPickDoc: () => void;
  onAddTodayHeading: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
}

export function AppMenu({
  selectedDoc,
  refreshing,
  addingHeading,
  lastSyncedAt,
  onCreateDoc,
  onPickDoc,
  onAddTodayHeading,
  onRefresh,
  onSignOut,
}: AppMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="bg-background/80 rounded-full shadow-xs backdrop-blur-md"
          aria-label="メニューを開く"
        >
          <MoreHorizontal className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {selectedDoc && (
          <DropdownMenuLabel
            className="text-muted-foreground max-w-64 truncate font-normal"
          >
            {selectedDoc.name}
          </DropdownMenuLabel>
        )}
        <DropdownMenuItem onClick={onCreateDoc}>
          <FilePlus className="size-4" />
          ドキュメントを新規作成
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPickDoc}>
          <FileText className="size-4" />
          {selectedDoc ? "ドキュメントを変更" : "ドキュメントを選択"}
        </DropdownMenuItem>
        {selectedDoc && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onAddTodayHeading}
              disabled={addingHeading}
            >
              <CalendarPlus className="size-4" />
              今日の見出しを追加
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRefresh} disabled={refreshing}>
              <RefreshCw
                className={refreshing ? "size-4 animate-spin" : "size-4"}
              />
              同期
              {lastSyncedAt && (
                <span className="text-muted-foreground ml-auto text-xs">
                  {lastSyncedAt.toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              )}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.reload()}>
          <RotateCcw className="size-4" />
          ページをリロード
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="size-4" />
          サインアウト
        </DropdownMenuItem>
        {buildInfo && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground font-normal">
              <span className="font-mono text-[10px]">
                Version: {buildInfo}
              </span>
            </DropdownMenuLabel>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
