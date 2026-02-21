import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { appendTextToDoc } from '@/lib/google-docs'
import type { SelectedDoc } from '@/hooks/useSelectedDoc'

interface Props {
  accessToken: string
  selectedDoc: SelectedDoc | null
}

export function EntryForm({ accessToken, selectedDoc }: Props) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = !!selectedDoc && text.trim().length > 0 && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !selectedDoc) return

    setSubmitting(true)
    try {
      await appendTextToDoc(selectedDoc.id, text.trim(), accessToken)
      setText('')
      toast.success('追記しました')
    } catch (err) {
      const message = err instanceof Error ? err.message : '追記に失敗しました'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="entry-text">つぶやき</Label>
        <Textarea
          id="entry-text"
          placeholder={
            selectedDoc
              ? 'ここに記録したいことを書く...'
              : 'まずドキュメントを選択してください'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!selectedDoc}
          rows={5}
          className="resize-none"
          onKeyDown={(e) => {
            // Cmd+Enter または Ctrl+Enter で送信
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              void handleSubmit(e as unknown as React.FormEvent)
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          Cmd+Enter または Ctrl+Enter で送信
        </p>
      </div>
      <Button type="submit" disabled={!canSubmit} className="w-full">
        {submitting ? '追記中...' : '追記する'}
      </Button>
    </form>
  )
}
