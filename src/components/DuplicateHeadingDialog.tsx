import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  /** null のとき非表示、string のとき対象の日付として警告を表示する */
  date: string | null;
  onClose: () => void;
}

export function DuplicateHeadingDialog({ date, onClose }: Props) {
  return (
    <Dialog
      open={date !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>見出しが既に存在します</DialogTitle>
          <DialogDescription>
            「{date}」の見出しは既にドキュメントに存在します。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
