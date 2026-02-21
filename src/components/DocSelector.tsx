import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { SelectedDoc } from "@/hooks/useSelectedDoc";
import { openGooglePicker } from "@/lib/google-picker";

interface Props {
  accessToken: string;
  apiKey: string;
  selectedDoc: SelectedDoc | null;
  onSelect: (id: string, name: string) => void;
}

export function DocSelector({
  accessToken,
  apiKey,
  selectedDoc,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick() {
    setLoading(true);
    setError(null);
    try {
      const file = await openGooglePicker(accessToken, apiKey);
      if (file) onSelect(file.id, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ピッカーを開けませんでした");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>選択中のドキュメント</Label>
      {selectedDoc && (
        <p className="truncate text-sm font-medium" title={selectedDoc.name}>
          {selectedDoc.name}
        </p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        variant="outline"
        onClick={() => void handlePick()}
        disabled={loading}
        className="w-full"
      >
        {loading
          ? "読み込み中..."
          : selectedDoc
            ? "ドキュメントを変更"
            : "ドキュメントを選択"}
      </Button>
    </div>
  );
}
