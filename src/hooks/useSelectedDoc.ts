import { useCallback, useState } from "react";

import {
  clearSelectedDoc,
  getSelectedDoc,
  setSelectedDoc,
} from "@/lib/storage";

export interface SelectedDoc {
  id: string;
  name: string;
}

export function useSelectedDoc() {
  const [selectedDoc, setDoc] = useState<SelectedDoc | null>(() =>
    getSelectedDoc(),
  );

  const selectDoc = useCallback((id: string, name: string) => {
    setSelectedDoc(id, name);
    setDoc({ id, name });
  }, []);

  const clearDoc = useCallback(() => {
    clearSelectedDoc();
    setDoc(null);
  }, []);

  return { selectedDoc, selectDoc, clearDoc };
}
