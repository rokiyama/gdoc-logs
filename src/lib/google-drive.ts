export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export async function listDocs(accessToken: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.document' and trashed=false",
    orderBy: "modifiedTime desc",
    fields: "files(id,name,modifiedTime)",
    pageSize: "50",
  });
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Drive API error ${res.status}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return (data.files ?? []) as DriveFile[];
}
