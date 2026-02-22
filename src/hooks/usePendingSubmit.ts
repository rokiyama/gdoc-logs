import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { SelectedDoc } from "@/hooks/useSelectedDoc";
import { AuthExpiredError, appendTextToDoc } from "@/lib/google-docs";
import { clearDraft } from "@/lib/storage";

interface Options {
  accessToken: string | null;
  selectedDoc: SelectedDoc | null;
  onAuthExpired: () => void;
  /** 送信成功後に呼ばれる（日記の再フェッチ用） */
  onSuccess: () => void;
}

interface UsePendingSubmitResult {
  submitting: boolean;
  handleOptimisticSubmit: (text: string) => void;
}

export function usePendingSubmit({
  accessToken,
  selectedDoc,
  onAuthExpired,
  onSuccess,
}: Options): UsePendingSubmitResult {
  const [submitting, setSubmitting] = useState(false);

  const handleOptimisticSubmit = useCallback(
    (text: string) => {
      setSubmitting(true);
      void appendTextToDoc(selectedDoc!.id, text, accessToken!)
        .then(() => {
          clearDraft();
          onSuccess();
        })
        .catch((err: unknown) => {
          if (err instanceof AuthExpiredError) {
            onAuthExpired();
          } else {
            toast.error("追記に失敗しました");
          }
        })
        .finally(() => setSubmitting(false));
    },
    [selectedDoc, accessToken, onAuthExpired, onSuccess],
  );

  return { submitting, handleOptimisticSubmit };
}
