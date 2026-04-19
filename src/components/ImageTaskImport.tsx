'use client'

import { useState, useRef } from 'react'
import { Upload, ImageIcon, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react'
import type { Task } from '@/types/tarkov'

interface Match {
  task: Task
  confidence: 'high' | 'medium'
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

function matchTaskNames(detected: string[], tasks: Task[]): Match[] {
  const matches: Match[] = []
  const used = new Set<string>()

  for (const raw of detected) {
    const norm = normalize(raw)
    if (!norm) continue

    // Exact normalized match
    let found = tasks.find(t => normalize(t.name) === norm)
    if (found && !used.has(found.id)) {
      matches.push({ task: found, confidence: 'high' })
      used.add(found.id)
      continue
    }

    // Contains match (detected contains task name or vice versa)
    found = tasks.find(t => {
      const tn = normalize(t.name)
      return !used.has(t.id) && (norm.includes(tn) || tn.includes(norm))
    })
    if (found) {
      matches.push({ task: found, confidence: 'medium' })
      used.add(found.id)
    }
  }

  return matches
}

interface Props {
  tasks: Task[]
  onApply: (taskIds: string[]) => void
}

export default function ImageTaskImport({ tasks, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }

    setLoading(true)
    setError(null)
    setMatches(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)

      const base64 = dataUrl.split(',')[1]
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

      try {
        const res = await fetch('/api/analyze-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
        })

        const data = await res.json()

        if (!res.ok) {
          if (res.status === 503) {
            setError('Image analysis requires an ANTHROPIC_API_KEY in Vercel environment variables.')
          } else {
            setError(data.error ?? 'Failed to analyze image.')
          }
          return
        }

        const found = matchTaskNames(data.taskNames as string[], tasks)
        setMatches(found)
        if (found.length === 0) {
          setError('No matching tasks found. Make sure the screenshot shows task names clearly.')
        }
      } catch {
        setError('Network error while analyzing image.')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function apply() {
    if (!matches) return
    onApply(matches.map(m => m.task.id))
    setOpen(false)
    setMatches(null)
    setPreview(null)
    setError(null)
  }

  function reset() {
    setMatches(null)
    setPreview(null)
    setError(null)
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-tarkov-muted hover:text-tarkov-yellow border border-tarkov-border hover:border-tarkov-yellow/40 rounded px-3 py-1.5 transition-colors"
      >
        <ImageIcon size={13} />
        Import from screenshot
      </button>
    )
  }

  return (
    <div className="card border-tarkov-yellow/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-tarkov-yellow" />
          <span className="text-sm font-medium text-tarkov-text">Import from Screenshot</span>
        </div>
        <button onClick={() => { setOpen(false); reset() }} className="text-tarkov-muted hover:text-tarkov-text">
          <X size={14} />
        </button>
      </div>

      <p className="text-xs text-tarkov-muted">
        Take a screenshot of your Tarkov task list and upload it. Claude will detect the task names and auto-mark them as active.
      </p>

      {!preview && !loading && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-tarkov-border hover:border-tarkov-yellow/40 rounded-lg p-8 text-center cursor-pointer transition-colors"
        >
          <Upload size={24} className="mx-auto mb-2 text-tarkov-muted" />
          <p className="text-sm text-tarkov-muted">Drop screenshot here or click to upload</p>
          <p className="text-xs text-tarkov-muted/60 mt-1">PNG, JPG, WebP</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
          />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-8 text-tarkov-muted">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Analyzing screenshot with Claude Vision...</span>
        </div>
      )}

      {preview && !loading && (
        <div className="flex gap-3 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded border border-tarkov-border flex-shrink-0" />
          {matches !== null && matches.length > 0 && (
            <div className="flex-1 space-y-1 min-w-0">
              <p className="text-xs text-tarkov-muted mb-2">
                Found {matches.length} matching task{matches.length !== 1 ? 's' : ''}:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {matches.map(({ task, confidence }) => (
                  <div key={task.id} className="flex items-center gap-2 text-xs">
                    <CheckCircle size={11} className={confidence === 'high' ? 'text-green-400' : 'text-tarkov-yellow'} />
                    <span className="text-tarkov-text truncate">{task.name}</span>
                    <span className="text-tarkov-muted ml-auto flex-shrink-0">{task.trader.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-tarkov-red-dark/20 border border-tarkov-red/30 rounded p-3">
          <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {(preview || error) && !loading && (
        <div className="flex gap-2">
          {matches && matches.length > 0 && (
            <button onClick={apply} className="btn-primary flex items-center gap-1.5">
              <CheckCircle size={13} />
              Apply {matches.length} task{matches.length !== 1 ? 's' : ''}
            </button>
          )}
          <button onClick={reset} className="btn-ghost">
            Try another
          </button>
        </div>
      )}
    </div>
  )
}
