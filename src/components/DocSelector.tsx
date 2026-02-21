import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { listDocs, type DriveFile } from '@/lib/google-drive'
import type { SelectedDoc } from '@/hooks/useSelectedDoc'

interface Props {
  accessToken: string
  selectedDoc: SelectedDoc | null
  onSelect: (id: string, name: string) => void
}

export function DocSelector({ accessToken, selectedDoc, onSelect }: Props) {
  const [docs, setDocs] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    listDocs(accessToken)
      .then(setDocs)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load documents'),
      )
      .finally(() => setLoading(false))
  }, [accessToken])

  return (
    <div className="space-y-1.5">
      <Label htmlFor="doc-select">追記先のドキュメント</Label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Select
        value={selectedDoc?.id ?? ''}
        onValueChange={(id) => {
          const doc = docs.find((d) => d.id === id)
          if (doc) onSelect(doc.id, doc.name)
        }}
        disabled={loading}
      >
        <SelectTrigger id="doc-select" className="w-full">
          <SelectValue
            placeholder={loading ? '読み込み中...' : 'ドキュメントを選択'}
          />
        </SelectTrigger>
        <SelectContent>
          {docs.map((doc) => (
            <SelectItem key={doc.id} value={doc.id}>
              {doc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
