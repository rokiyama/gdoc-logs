const SELECTED_DOC_KEY = "gdoc-logs:selectedDocId";
const SELECTED_DOC_NAME_KEY = "gdoc-logs:selectedDocName";

export function getSelectedDoc(): { id: string; name: string } | null {
  const id = localStorage.getItem(SELECTED_DOC_KEY);
  const name = localStorage.getItem(SELECTED_DOC_NAME_KEY);
  return id && name ? { id, name } : null;
}

export function setSelectedDoc(id: string, name: string): void {
  localStorage.setItem(SELECTED_DOC_KEY, id);
  localStorage.setItem(SELECTED_DOC_NAME_KEY, name);
}

export function clearSelectedDoc(): void {
  localStorage.removeItem(SELECTED_DOC_KEY);
  localStorage.removeItem(SELECTED_DOC_NAME_KEY);
}
