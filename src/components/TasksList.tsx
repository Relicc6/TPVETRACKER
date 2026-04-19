'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Search, Filter, Lock, Zap } from 'lucide-react'
import type { Task, TaskStatus, TaskProgressMap } from '@/types/tarkov'
import { loadTaskProgress, saveTaskProgress, loadPlayerLevel, savePlayerLevel } from '@/lib/progress'
import PlayerProfile from '@/components/PlayerProfile'
import ImageTaskImport from '@/components/ImageTaskImport'

const MANUAL_CYCLE: TaskStatus[] = ['not_started', 'in_progress', 'completed']

const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  locked: 'Locked',
}

const STATUS_CLASS: Record<TaskStatus, string> = {
  not_started: 'badge-not-started',
  in_progress: 'badge-in-progress',
  completed: 'badge-completed',
  locked: 'text-xs px-2 py-0.5 rounded bg-tarkov-surface border border-tarkov-border/50 text-tarkov-muted/60',
}

// Build map: taskId → array of prerequisite taskIds that must be "completed"
function buildPrereqMap(tasks: Task[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const task of tasks) {
    const prereqs = task.taskRequirements
      .filter(r => r.status.includes('complete') || r.status.includes('completed'))
      .map(r => r.task.id)
    if (prereqs.length) map.set(task.id, prereqs)
  }
  return map
}

// Recursively collect all transitive prerequisites of a set of task IDs
function collectPrereqs(ids: string[], prereqMap: Map<string, string[]>): Set<string> {
  const completed = new Set<string>()
  const queue = [...ids]
  while (queue.length) {
    const id = queue.pop()!
    const prereqs = prereqMap.get(id) ?? []
    for (const p of prereqs) {
      if (!completed.has(p)) {
        completed.add(p)
        queue.push(p)
      }
    }
  }
  return completed
}

// Auto-detect progress from player level + active tasks
function autoDetectProgress(
  tasks: Task[],
  playerLevel: number,
  activeTaskIds: string[],
  manualProgress: TaskProgressMap
): TaskProgressMap {
  const prereqMap = buildPrereqMap(tasks)

  // All prerequisites of active tasks are completed
  const autoCompleted = collectPrereqs(activeTaskIds, prereqMap)

  const result: TaskProgressMap = {}
  for (const task of tasks) {
    const manual = manualProgress[task.id]
    // Manual overrides always win
    if (manual && manual !== 'locked') {
      result[task.id] = manual
      continue
    }
    if (activeTaskIds.includes(task.id)) {
      result[task.id] = 'in_progress'
    } else if (autoCompleted.has(task.id)) {
      result[task.id] = 'completed'
    } else if (task.minPlayerLevel > playerLevel) {
      result[task.id] = 'locked'
    } else {
      result[task.id] = 'not_started'
    }
  }
  return result
}

interface TaskCardProps {
  task: Task
  status: TaskStatus
  onCycle: () => void
}

function TaskCard({ task, status, onCycle }: TaskCardProps) {
  const [open, setOpen] = useState(false)
  const locked = status === 'locked'

  return (
    <div className={`card transition-all duration-150 ${status === 'completed' ? 'opacity-40' : ''} ${locked ? 'opacity-35' : ''}`}>
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
            <span className={`font-medium text-sm ${status === 'completed' ? 'line-through text-tarkov-muted' : locked ? 'text-tarkov-muted/60' : 'text-tarkov-text'}`}>
              {task.name}
            </span>
            <span className={STATUS_CLASS[status]}>{STATUS_LABELS[status]}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-tarkov-muted">
            <span className="text-tarkov-yellow font-medium">{task.trader.name}</span>
            {task.map && <span>{task.map.name}</span>}
            {task.minPlayerLevel > 0 && (
              <span className={locked ? 'text-red-400/70' : ''}>Lvl {task.minPlayerLevel}+</span>
            )}
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
                    {obj.optional && <span className="ml-1 text-tarkov-muted/60">(optional)</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Checkbox */}
        <button
          onClick={locked ? undefined : onCycle}
          disabled={locked}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            locked
              ? 'bg-tarkov-surface border-tarkov-border/40 cursor-not-allowed'
              : status === 'completed'
              ? 'bg-tarkov-green border-tarkov-green'
              : status === 'in_progress'
              ? 'bg-tarkov-blue/30 border-tarkov-blue'
              : 'bg-transparent border-tarkov-border hover:border-tarkov-yellow'
          }`}
          title={locked ? `Requires level ${task.minPlayerLevel}` : `Mark as ${MANUAL_CYCLE[(MANUAL_CYCLE.indexOf(status as typeof MANUAL_CYCLE[number]) + 1) % 3]}`}
        >
          {locked && <Lock size={9} className="text-tarkov-muted/60" />}
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

// Active task search/select dropdown
function ActiveTaskSearch({
  tasks,
  activeIds,
  onToggle,
}: {
  tasks: Task[]
  activeIds: string[]
  onToggle: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return tasks.filter(t => t.name.toLowerCase().includes(q)).slice(0, 8)
  }, [tasks, query])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const activeTasks = tasks.filter(t => activeIds.includes(t.id))

  return (
    <div className="space-y-2">
      <div ref={ref} className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tarkov-muted" />
        <input
          className="input pl-9"
          placeholder="Type a task name you currently have active..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {open && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-tarkov-card border border-tarkov-border rounded-lg shadow-xl overflow-hidden">
            {filtered.map(task => (
              <button
                key={task.id}
                onClick={() => { onToggle(task.id); setQuery(''); setOpen(false) }}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-tarkov-surface text-left transition-colors"
              >
                <div>
                  <span className="text-sm text-tarkov-text">{task.name}</span>
                  <span className="ml-2 text-xs text-tarkov-yellow">{task.trader.name}</span>
                </div>
                {activeIds.includes(task.id) && (
                  <span className="text-xs text-blue-400">active</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTasks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeTasks.map(task => (
            <button
              key={task.id}
              onClick={() => onToggle(task.id)}
              className="flex items-center gap-1.5 text-xs bg-tarkov-blue/20 border border-tarkov-blue/40 text-blue-300 rounded px-2 py-1 hover:bg-tarkov-red-dark/20 hover:border-tarkov-red/40 hover:text-red-300 transition-colors"
              title="Click to remove"
            >
              {task.name}
              <span>×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ALL = 'All'

export default function TasksList({ tasks }: { tasks: Task[] }) {
  const [playerLevel, setPlayerLevel] = useState(1)
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([])
  const [manualProgress, setManualProgress] = useState<TaskProgressMap>({})
  const [search, setSearch] = useState('')
  const [traderFilter, setTraderFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [showAutoDetect, setShowAutoDetect] = useState(false)

  useEffect(() => {
    setManualProgress(loadTaskProgress())
    setPlayerLevel(loadPlayerLevel())
  }, [])

  const progress = useMemo(
    () => autoDetectProgress(tasks, playerLevel, activeTaskIds, manualProgress),
    [tasks, playerLevel, activeTaskIds, manualProgress]
  )

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

  const completedCount = tasks.filter(t => progress[t.id] === 'completed').length
  const lockedCount = tasks.filter(t => progress[t.id] === 'locked').length

  function handleLevelChange(level: number) {
    setPlayerLevel(level)
    savePlayerLevel(level)
  }

  function toggleActiveTask(taskId: string) {
    setActiveTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    )
  }

  function cycleStatus(taskId: string) {
    const current = progress[taskId] ?? 'not_started'
    if (current === 'locked') return
    const idx = MANUAL_CYCLE.indexOf(current as typeof MANUAL_CYCLE[number])
    const next = MANUAL_CYCLE[((idx === -1 ? 0 : idx) + 1) % MANUAL_CYCLE.length]
    setManualProgress(prev => {
      const updated = { ...prev, [taskId]: next }
      saveTaskProgress(updated)
      return updated
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-tarkov-yellow font-mono">TASK TRACKER</h1>
        <p className="text-xs text-tarkov-muted mt-0.5">
          {completedCount} completed · {activeTaskIds.length} active · {lockedCount} locked
        </p>
      </div>

      <PlayerProfile level={playerLevel} onChange={handleLevelChange} />

      <div className="w-full bg-tarkov-surface rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-tarkov-yellow rounded-full transition-all duration-500"
          style={{ width: tasks.length ? `${(completedCount / tasks.length) * 100}%` : '0%' }}
        />
      </div>

      {/* Auto-detect panel */}
      <div className="card border-tarkov-border/60">
        <button
          onClick={() => setShowAutoDetect(o => !o)}
          className="flex items-center gap-2 w-full text-left"
        >
          <Zap size={14} className="text-tarkov-yellow" />
          <span className="text-sm font-medium text-tarkov-text">Auto-detect from active tasks</span>
          <span className="text-xs text-tarkov-muted ml-auto">
            {showAutoDetect ? 'hide' : 'show'}
          </span>
        </button>
        {showAutoDetect && (
          <div className="mt-3 pt-3 border-t border-tarkov-border space-y-3">
            <p className="text-xs text-tarkov-muted">
              Select the tasks currently in your journal — or upload a screenshot and Claude will detect them automatically.
              All prerequisite tasks will be marked as completed.
            </p>
            <ImageTaskImport
              tasks={tasks}
              onApply={(ids) => {
                ids.forEach(id => {
                  if (!activeTaskIds.includes(id)) toggleActiveTask(id)
                })
              }}
            />
            <ActiveTaskSearch tasks={tasks} activeIds={activeTaskIds} onToggle={toggleActiveTask} />
          </div>
        )}
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
            {traders.map(t => <option key={t} value={t}>{t}</option>)}
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
          <option value="locked">Locked</option>
        </select>
      </div>

      <p className="text-xs text-tarkov-muted">
        Showing {filtered.length} of {tasks.length} tasks · click checkbox to cycle status manually
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
