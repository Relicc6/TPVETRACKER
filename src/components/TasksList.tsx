'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react'
import type { Task, TaskStatus, TaskProgressMap } from '@/types/tarkov'
import { loadTaskProgress, saveTaskProgress } from '@/lib/progress'

const STATUS_CYCLE: TaskStatus[] = ['not_started', 'in_progress', 'completed']

const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const STATUS_CLASS: Record<TaskStatus, string> = {
  not_started: 'badge-not-started',
  in_progress: 'badge-in-progress',
  completed: 'badge-completed',
}

interface TaskCardProps {
  task: Task
  status: TaskStatus
  onCycle: () => void
}

function TaskCard({ task, status, onCycle }: TaskCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`card transition-all duration-150 ${
        status === 'completed' ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onCycle}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            status === 'completed'
              ? 'bg-tarkov-green border-tarkov-green'
              : status === 'in_progress'
              ? 'bg-tarkov-blue/30 border-tarkov-blue'
              : 'bg-transparent border-tarkov-border hover:border-tarkov-yellow'
          }`}
          title={`Mark as ${STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % 3]}`}
        >
          {status === 'completed' && (
            <svg
              viewBox="0 0 10 8"
              fill="none"
              className="w-3 h-3"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {status === 'in_progress' && (
            <div className="w-2 h-2 rounded-sm bg-blue-400" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`font-medium text-sm ${
                status === 'completed' ? 'line-through text-tarkov-muted' : 'text-tarkov-text'
              }`}
            >
              {task.name}
            </span>
            <span className={STATUS_CLASS[status]}>{STATUS_LABELS[status]}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-tarkov-muted">
            <span className="text-tarkov-yellow">{task.trader.name}</span>
            {task.map && <span>{task.map.name}</span>}
            {task.minPlayerLevel > 0 && <span>Lvl {task.minPlayerLevel}+</span>}
            {task.experience > 0 && (
              <span className="text-purple-400">{task.experience.toLocaleString()} XP</span>
            )}
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
                  <span>
                    {obj.description}
                    {obj.optional && (
                      <span className="ml-1 text-tarkov-muted/60">(optional)</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

const ALL = 'All'

export default function TasksList({ tasks }: { tasks: Task[] }) {
  const [progress, setProgress] = useState<TaskProgressMap>({})
  const [search, setSearch] = useState('')
  const [traderFilter, setTraderFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')

  useEffect(() => {
    setProgress(loadTaskProgress())
  }, [])

  const traders = useMemo(
    () => [ALL, ...Array.from(new Set(tasks.map(t => t.trader.name))).sort()],
    [tasks]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tasks.filter(t => {
      if (search && !t.name.toLowerCase().includes(q)) return false
      if (traderFilter !== ALL && t.trader.name !== traderFilter) return false
      const status = progress[t.id] ?? 'not_started'
      if (statusFilter !== 'all' && status !== statusFilter) return false
      return true
    })
  }, [tasks, search, traderFilter, statusFilter, progress])

  const completedCount = tasks.filter(t => (progress[t.id] ?? 'not_started') === 'completed').length

  function cycleStatus(taskId: string) {
    setProgress(prev => {
      const current = prev[taskId] ?? 'not_started'
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]
      const updated = { ...prev, [taskId]: next }
      saveTaskProgress(updated)
      return updated
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-tarkov-yellow font-mono">TASK TRACKER</h1>
          <p className="text-xs text-tarkov-muted mt-0.5">
            {completedCount} / {tasks.length} completed
          </p>
        </div>

        <div className="w-full bg-tarkov-surface rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-tarkov-yellow rounded-full transition-all duration-500"
            style={{ width: tasks.length ? `${(completedCount / tasks.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tarkov-muted" />
          <input
            className="input pl-9"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tarkov-muted pointer-events-none" />
          <select
            className="input pl-9 pr-8 appearance-none cursor-pointer"
            value={traderFilter}
            onChange={e => setTraderFilter(e.target.value)}
          >
            {traders.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <select
          className="input appearance-none cursor-pointer"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <p className="text-xs text-tarkov-muted">
        Showing {filtered.length} of {tasks.length} tasks — click the checkbox to cycle status
      </p>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card text-center text-tarkov-muted py-10 text-sm">No tasks found.</div>
        ) : (
          filtered.map(task => (
            <TaskCard
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
