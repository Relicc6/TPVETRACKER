'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Search, Shield } from 'lucide-react'
import type { Task, TaskProgressMap } from '@/types/tarkov'
import { loadTaskProgress, saveTaskProgress } from '@/lib/progress'

const STATUS_CYCLE = ['not_started', 'in_progress', 'completed'] as const

interface KappaTaskCardProps {
  task: Task
  status: string
  onCycle: () => void
}

function KappaTaskCard({ task, status, onCycle }: KappaTaskCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`card transition-all duration-150 ${status === 'completed' ? 'opacity-40' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Trader portrait */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-tarkov-surface border border-tarkov-border/50">
          {task.trader.imageLink ? (
            <Image
              src={task.trader.imageLink}
              alt={task.trader.name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-tarkov-muted text-xs font-bold">
              {task.trader.name[0]}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`font-medium text-sm ${status === 'completed' ? 'line-through text-tarkov-muted' : 'text-tarkov-text'}`}>
              {task.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-tarkov-muted">
            <span className="text-tarkov-yellow font-medium">{task.trader.name}</span>
            {task.map && <span>{task.map.name}</span>}
            {task.minPlayerLevel > 0 && <span>Lvl {task.minPlayerLevel}+</span>}
            {task.experience > 0 && <span className="text-purple-400">{task.experience.toLocaleString()} XP</span>}
          </div>

          {task.objectives.length > 0 && (
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1 mt-2 text-xs text-tarkov-muted hover:text-tarkov-text transition-colors"
            >
              {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {task.objectives.length} objective{task.objectives.length !== 1 ? 's' : ''}
            </button>
          )}

          {open && (
            <ul className="mt-2 space-y-1">
              {task.objectives.map(obj => (
                <li key={obj.id} className="flex items-start gap-2 text-xs text-tarkov-muted">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-tarkov-border flex-shrink-0" />
                  <span>{obj.description}{obj.optional && <span className="ml-1 opacity-60">(optional)</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Checkbox */}
        <button
          onClick={onCycle}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            status === 'completed'
              ? 'bg-tarkov-green border-tarkov-green'
              : status === 'in_progress'
              ? 'bg-tarkov-blue/30 border-tarkov-blue'
              : 'bg-transparent border-tarkov-border hover:border-tarkov-yellow'
          }`}
          title="Cycle status"
        >
          {status === 'completed' && (
            <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth="2">
              <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {status === 'in_progress' && <div className="w-2 h-2 rounded-sm bg-blue-400" />}
        </button>
      </div>
    </div>
  )
}

const TRADERS = ['All', 'Prapor', 'Therapist', 'Skier', 'Peacekeeper', 'Mechanic', 'Ragman', 'Jaeger', 'Fence', 'Lightkeeper']

export default function KappaTracker({ tasks }: { tasks: Task[] }) {
  const [progress, setProgress] = useState<TaskProgressMap>({})
  const [search, setSearch] = useState('')
  const [traderFilter, setTraderFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('all')

  const kappaTasks = useMemo(() => tasks.filter(t => t.kappaRequired), [tasks])

  useEffect(() => {
    setProgress(loadTaskProgress())
  }, [])

  const completedCount = kappaTasks.filter(t => (progress[t.id] ?? 'not_started') === 'completed').length
  const pct = kappaTasks.length ? Math.round((completedCount / kappaTasks.length) * 100) : 0

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return kappaTasks.filter(t => {
      if (search && !t.name.toLowerCase().includes(q)) return false
      if (traderFilter !== 'All' && t.trader.name !== traderFilter) return false
      const status = progress[t.id] ?? 'not_started'
      if (statusFilter !== 'all' && status !== statusFilter) return false
      return true
    })
  }, [kappaTasks, search, traderFilter, statusFilter, progress])

  function cycleStatus(taskId: string) {
    setProgress(prev => {
      const current = (prev[taskId] ?? 'not_started') as typeof STATUS_CYCLE[number]
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]
      const updated = { ...prev, [taskId]: next }
      saveTaskProgress(updated)
      return updated
    })
  }

  const remaining = kappaTasks.filter(t => (progress[t.id] ?? 'not_started') !== 'completed')

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Shield size={20} className="text-tarkov-yellow mt-1 flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-tarkov-yellow font-mono">KAPPA TRACKER</h1>
          <p className="text-xs text-tarkov-muted mt-0.5">
            {completedCount} / {kappaTasks.length} tasks completed · {remaining.length} remaining for Kappa
          </p>
        </div>
      </div>

      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-tarkov-muted font-mono uppercase tracking-wider">Kappa Progress</span>
          <span className="text-tarkov-yellow font-mono font-bold">{pct}%</span>
        </div>
        <div className="w-full bg-tarkov-surface rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? '#4a8c5c' : '#c8a96e',
            }}
          />
        </div>
        {pct === 100 && (
          <p className="text-center text-green-400 text-sm font-semibold font-mono">
            🎉 KAPPA CONTAINER UNLOCKED
          </p>
        )}
      </div>

      {remaining.length > 0 && remaining.length <= 10 && (
        <div className="card border-tarkov-yellow/20">
          <p className="text-xs text-tarkov-muted font-mono uppercase tracking-wider mb-2">
            Almost there — {remaining.length} task{remaining.length !== 1 ? 's' : ''} left
          </p>
          <div className="flex flex-wrap gap-1.5">
            {remaining.slice(0, 10).map(t => (
              <span key={t.id} className="text-xs bg-tarkov-surface border border-tarkov-border rounded px-2 py-0.5 text-tarkov-text">
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tarkov-muted" />
          <input
            className="input pl-9"
            placeholder="Search Kappa tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input appearance-none cursor-pointer"
          value={traderFilter}
          onChange={e => setTraderFilter(e.target.value)}
        >
          {TRADERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          className="input appearance-none cursor-pointer"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <p className="text-xs text-tarkov-muted">
        Showing {filtered.length} of {kappaTasks.length} Kappa tasks
      </p>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card text-center text-tarkov-muted py-10 text-sm">No tasks found.</div>
        ) : (
          filtered.map(task => (
            <KappaTaskCard
              key={task.id}
              task={task}
              status={progress[task.id] ?? 'not_started'}
              onCycle={() => cycleStatus(task.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
