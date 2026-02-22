import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  creating: boolean;
  onConfirm: (title: string) => void;
  onClose: () => void;
}

export function CreateDocDialog({ open, creating, onConfirm, onClose }: Props) {
  const [title, setTitle] = useState("");

  function handleConfirm() {
    if (!title.trim()) return;
    onConfirm(title.trim());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ドキュメントを新規作成</DialogTitle>
          <DialogDescription>
            新しい Google Docs ドキュメントのタイトルを入力してください。
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="ドキュメントのタイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
          }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm} disabled={!title.trim() || creating}>
            作成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
