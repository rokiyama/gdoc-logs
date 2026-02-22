import { useState } from "react";
import { toast } from "sonner";

import {
  AuthExpiredError,
  appendHeadingToDoc,
  findH2Headings,
  readDoc,
} from "@/lib/google-docs";

function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Options {
  accessToken: string | null;
  docId: string | null;
  onAuthExpired: () => void;
  /** 見出し追加成功後に呼ばれる（再フェッチ用） */
  onSuccess: () => void;
}

interface UseAddHeadingResult {
  addingHeading: boolean;
  /** null のとき非表示、string のとき重複日付として警告ダイアログを開く */
  duplicateWarningDate: string | null;
  clearDuplicateWarning: () => void;
  handleAddTodayHeading: () => Promise<void>;
}

export function useAddHeading({
  accessToken,
  docId,
  onAuthExpired,
  onSuccess,
}: Options): UseAddHeadingResult {
  const [addingHeading, setAddingHeading] = useState(false);
  const [duplicateWarningDate, setDuplicateWarningDate] = useState<
    string | null
  >(null);

  async function handleAddTodayHeading() {
    if (!accessToken || !docId) return;
    const todayDate = getTodayDateString();
    setAddingHeading(true);
    try {
      const doc = await readDoc(docId, accessToken);
      const headings = findH2Headings(doc);
      if (headings.includes(todayDate)) {
        setDuplicateWarningDate(todayDate);
        return;
      }
      await appendHeadingToDoc(docId, todayDate, accessToken);
      toast.success(`見出し「${todayDate}」を追加しました`);
      onSuccess();
    } catch (e) {
      if (e instanceof AuthExpiredError) {
        onAuthExpired();
      } else {
        toast.error(
          e instanceof Error ? e.message : "見出しの追加に失敗しました",
        );
      }
    } finally {
      setAddingHeading(false);
    }
  }

  return {
    addingHeading,
    duplicateWarningDate,
    clearDuplicateWarning: () => setDuplicateWarningDate(null),
    handleAddTodayHeading,
  };
}
