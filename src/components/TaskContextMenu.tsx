'use client'

import { useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import type { Task } from '@/types/tarkov'

interface Props {
  task: Task
  x: number
  y: number
  onClose: () => void
}

export function wikiUrl(task: Task): string {
  return task.wikiLink ?? `https://escapefromtarkov.fandom.com/wiki/${encodeURIComponent(task.name.replace(/ /g, '_'))}`
}

export default function TaskContextMenu({ task, x, y, onClose }: Props) {
  useEffect(() => {
    function handle(e: MouseEvent | KeyboardEvent) {
      if ('key' in e) { if ((e as KeyboardEvent).key === 'Escape') onClose() }
      else onClose()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handle)
    }
  }, [onClose])

  const cx = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 800) - 200)
  const cy = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 90)

  return (
    <div
      className="fixed z-50 bg-tarkov-card border border-tarkov-border rounded-lg shadow-xl py-1"
      style={{ left: cx, top: cy, minWidth: '180px' }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 border-b border-tarkov-border">
        <p className="text-xs font-medium text-tarkov-text truncate max-w-[160px]">{task.name}</p>
        <p className="text-[10px] text-tarkov-yellow mt-0.5">{task.trader.name}</p>
      </div>
      <a
        href={wikiUrl(task)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="flex items-center gap-2 px-3 py-2 text-sm text-tarkov-text hover:bg-tarkov-surface hover:text-tarkov-yellow transition-colors"
      >
        <ExternalLink size={13} />
        View on Wiki
      </a>
    </div>
  )
}
