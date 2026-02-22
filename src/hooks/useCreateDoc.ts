import { useState } from "react";
import { toast } from "sonner";

import { AuthExpiredError, createGoogleDoc } from "@/lib/google-docs";

interface Options {
  accessToken: string | null;
  onAuthExpired: () => void;
  onDocCreated: (id: string, name: string) => void;
}

interface UseCreateDocResult {
  creating: boolean;
  handleCreateDoc: (title: string) => Promise<void>;
}

export function useCreateDoc({
  accessToken,
  onAuthExpired,
  onDocCreated,
}: Options): UseCreateDocResult {
  const [creating, setCreating] = useState(false);

  async function handleCreateDoc(title: string) {
    if (!accessToken) return;
    setCreating(true);
    try {
      const doc = await createGoogleDoc(title, accessToken);
      toast.success(`ドキュメント「${doc.title}」を作成しました`);
      onDocCreated(doc.id, doc.title);
    } catch (e) {
      if (e instanceof AuthExpiredError) {
        onAuthExpired();
      } else {
        toast.error(
          e instanceof Error ? e.message : "ドキュメントの作成に失敗しました",
        );
      }
    } finally {
      setCreating(false);
    }
  }

  return { creating, handleCreateDoc };
}
