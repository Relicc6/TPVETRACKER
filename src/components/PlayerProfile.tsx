'use client'

import { User } from 'lucide-react'

interface PlayerProfileProps {
  level: number
  onChange: (level: number) => void
}

export default function PlayerProfile({ level, onChange }: PlayerProfileProps) {
  return (
    <div className="flex items-center gap-3 bg-tarkov-surface border border-tarkov-border rounded-lg px-4 py-2">
      <User size={14} className="text-tarkov-yellow flex-shrink-0" />
      <span className="text-xs text-tarkov-muted font-mono uppercase tracking-wider">Player Level</span>
      <input
        type="number"
        min={1}
        max={79}
        value={level}
        onChange={e => {
          const val = Math.max(1, Math.min(79, parseInt(e.target.value) || 1))
          onChange(val)
        }}
        className="w-16 bg-tarkov-card border border-tarkov-border text-tarkov-yellow font-mono font-bold
                   text-center rounded px-2 py-1 text-sm focus:outline-none focus:border-tarkov-yellow
                   transition-colors"
      />
      <span className="text-xs text-tarkov-muted">/ 79</span>
      <div className="flex-1 bg-tarkov-card rounded-full h-1.5 overflow-hidden ml-2">
        <div
          className="h-full bg-tarkov-yellow rounded-full transition-all duration-300"
          style={{ width: `${(level / 79) * 100}%` }}
        />
      </div>
    </div>
  )
}
