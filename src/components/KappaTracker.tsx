'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, ChevronRight, Search, Shield } from 'lucide-react'
import type { Task, TaskProgressMap, TaskStatus } from '@/types/tarkov'
import { loadTaskProgress, saveTaskProgress, loadKappaItems, saveKappaItems } from '@/lib/progress'

const STATUS_CYCLE: TaskStatus[] = ['not_started', 'in_progress', 'completed']

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

// ── Prerequisite helpers (cascade completion) ──

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

function collectPrereqs(ids: string[], prereqMap: Map<string, string[]>): Set<string> {
  const result = new Set<string>()
  const queue = [...ids]
  while (queue.length) {
    const id = queue.pop()!
    const prereqs = prereqMap.get(id) ?? []
    for (const p of prereqs) {
      if (!result.has(p)) { result.add(p); queue.push(p) }
    }
  }
  return result
}

// ── Tree building (deduplicated — each task appears exactly once) ──

interface TreeNode {
  task: Task
  children: TreeNode[]
}

function buildKappaTree(kappaTasks: Task[]): TreeNode[] {
  const kappaIds = new Set(kappaTasks.map(t => t.id))
  const taskMap: Record<string, Task> = {}
  for (const t of kappaTasks) taskMap[t.id] = t

  // Build parent list per task
  const parentsOf: Record<string, string[]> = {}
  for (const task of kappaTasks) {
    for (const req of task.taskRequirements) {
      if (kappaIds.has(req.task.id) && req.status.some(s => s.includes('complet'))) {
        if (!parentsOf[task.id]) parentsOf[task.id] = []
        parentsOf[task.id].push(req.task.id)
      }
    }
  }

  // Compute chain depth so we can pick the "deepest" parent for tasks with multiple parents
  const depthCache: Record<string, number> = {}
  function getDepth(taskId: string, path: string[]): number {
    if (depthCache[taskId] !== undefined) return depthCache[taskId]
    if (path.includes(taskId)) return 0
    const parents = parentsOf[taskId] ?? []
    let max = -1
    for (const p of parents) max = Math.max(max, getDepth(p, [...path, taskId]))
    depthCache[taskId] = max + 1
    return depthCache[taskId]
  }
  for (const task of kappaTasks) getDepth(task.id, [])

  // Assign each task to exactly one parent (the deepest one — avoids duplicates)
  const canonicalChildren: Record<string, string[]> = {}
  for (const task of kappaTasks) {
    const parents = parentsOf[task.id] ?? []
    if (!parents.length) continue
    const primary = parents.reduce((best, p) =>
      (depthCache[p] ?? 0) >= (depthCache[best] ?? 0) ? p : best
    )
    if (!canonicalChildren[primary]) canonicalChildren[primary] = []
    canonicalChildren[primary].push(task.id)
  }

  const roots = kappaTasks.filter(t => !(parentsOf[t.id]?.length))

  function buildNode(taskId: string): TreeNode {
    const task = taskMap[taskId]
    const children = (canonicalChildren[taskId] ?? []).map(buildNode)
    return { task, children }
  }

  return roots.map(t => buildNode(t.id))
}

// ── Flat task card (for list view) ──

interface TaskCardProps {
  task: Task
  status: TaskStatus
  onCycle: () => void
}

function KappaTaskCard({ task, status, onCycle }: TaskCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`card transition-all duration-150 ${status === 'completed' ? 'opacity-40' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-tarkov-surface border border-tarkov-border/50">
          {task.trader.imageLink ? (
            <Image src={task.trader.imageLink} alt={task.trader.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-tarkov-muted text-xs font-bold">{task.trader.name[0]}</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`font-medium text-sm ${status === 'completed' ? 'line-through text-tarkov-muted' : 'text-tarkov-text'}`}>
              {task.name}
            </span>
            <span className={STATUS_CLASS[status]}>{STATUS_LABELS[status]}</span>
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

// ── Tree node component (compact single-line row) ──

function KappaTreeNode({ node, progress, onCycle }: {
  node: TreeNode
  progress: TaskProgressMap
  onCycle: (id: string) => void
}) {
  const status = (progress[node.task.id] ?? 'not_started') as TaskStatus
  // Completed tasks start collapsed; incomplete start expanded
  const [expanded, setExpanded] = useState(status !== 'completed')

  const dot: Record<TaskStatus, string> = {
    completed: 'bg-tarkov-green',
    in_progress: 'bg-blue-400',
    not_started: 'bg-tarkov-border',
    locked: 'bg-tarkov-border/30',
  }

  return (
    <div>
      <div className={`flex items-center gap-2 py-1.5 px-2 rounded group hover:bg-tarkov-surface/60 transition-colors ${status === 'completed' ? 'opacity-40' : ''}`}>
        {/* Expand / collapse or leaf indicator */}
        <div className="w-4 flex-shrink-0 flex items-center justify-center">
          {node.children.length > 0 ? (
            <button onClick={() => setExpanded(e => !e)} className="text-tarkov-muted hover:text-tarkov-yellow transition-colors">
              {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
          ) : (
            <div className="w-1 h-1 rounded-full bg-tarkov-border/40 mx-auto" />
          )}
        </div>

        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot[status]}`} />

        {/* Task name */}
        <span className={`text-sm flex-1 min-w-0 truncate ${status === 'completed' ? 'line-through text-tarkov-muted' : 'text-tarkov-text'}`}>
          {node.task.name}
        </span>

        {/* Trader name */}
        <span className="text-xs text-tarkov-yellow/70 flex-shrink-0 hidden sm:block">{node.task.trader.name}</span>

        {/* Checkbox — always visible when done/in-progress, hover-only otherwise */}
        <button
          onClick={() => onCycle(node.task.id)}
          className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
            status === 'completed'
              ? 'bg-tarkov-green border-tarkov-green'
              : status === 'in_progress'
              ? 'bg-blue-400/30 border-blue-400'
              : 'border-tarkov-border hover:border-tarkov-yellow opacity-0 group-hover:opacity-100'
          }`}
          title="Cycle status"
        >
          {status === 'completed' && (
            <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5" stroke="currentColor" strokeWidth="2">
              <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {status === 'in_progress' && <div className="w-1.5 h-1.5 rounded-sm bg-blue-400" />}
        </button>
      </div>

      {expanded && node.children.length > 0 && (
        <div className="ml-4 pl-3 border-l border-tarkov-border/30">
          {node.children.map(child => (
            <KappaTreeNode key={child.task.id} node={child} progress={progress} onCycle={onCycle} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Collector Items tab ──

function CollectorItemsTab({ task, collected, onToggle }: {
  task: Task | undefined
  collected: Record<string, boolean>
  onToggle: (id: string) => void
}) {
  if (!task) {
    return (
      <div className="card text-center text-tarkov-muted py-10 text-sm">
        <Shield size={24} className="mx-auto mb-2 opacity-30" />
        <p>Collector task not found.</p>
      </div>
    )
  }

  const objectives = task.objectives
  const collectedCount = objectives.filter(o => collected[o.id]).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-tarkov-muted">{collectedCount} / {objectives.length} items collected</p>
        <div className="w-32 h-1.5 bg-tarkov-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-tarkov-yellow rounded-full transition-all"
            style={{ width: objectives.length ? `${(collectedCount / objectives.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {objectives.length === 0 ? (
        <div className="card text-center text-tarkov-muted py-6 text-sm">
          No item data available. This may load after a page refresh.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {objectives.map(obj => {
            const item = obj.items?.[0]
            const done = !!collected[obj.id]
            return (
              <button
                key={obj.id}
                onClick={() => onToggle(obj.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  done
                    ? 'bg-tarkov-green-dark/10 border-tarkov-green/20 opacity-60'
                    : 'bg-tarkov-card border-tarkov-border hover:border-tarkov-yellow/40'
                }`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded bg-tarkov-surface border border-tarkov-border/50 flex items-center justify-center overflow-hidden">
                  {item?.iconLink ? (
                    <Image src={item.iconLink} alt={item.name ?? ''} width={40} height={40} className="object-contain p-0.5" unoptimized />
                  ) : (
                    <span className="text-tarkov-muted text-[10px] font-mono text-center px-1 leading-tight">
                      {item?.shortName ?? '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${done ? 'line-through text-tarkov-muted' : 'text-tarkov-text'}`}>
                    {item?.name ?? obj.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {obj.count && obj.count > 1 && (
                      <span className="text-xs text-tarkov-yellow font-mono">×{obj.count}</span>
                    )}
                    {obj.foundInRaid && (
                      <span className="text-xs text-blue-400">FiR</span>
                    )}
                  </div>
                </div>
                {done && (
                  <svg viewBox="0 0 10 8" fill="none" className="w-4 h-4 text-green-400 flex-shrink-0" stroke="currentColor" strokeWidth="2">
                    <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── KappaTracker ──

type KappaTab = 'tasks' | 'tree' | 'collector'

const TRADERS = ['All', 'Prapor', 'Therapist', 'Skier', 'Peacekeeper', 'Mechanic', 'Ragman', 'Jaeger', 'Fence', 'Lightkeeper']

export default function KappaTracker({ tasks }: { tasks: Task[] }) {
  const [progress, setProgress] = useState<TaskProgressMap>({})
  const [collectedItems, setCollectedItems] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState<KappaTab>('tasks')
  const [search, setSearch] = useState('')
  const [traderFilter, setTraderFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('all')

  const kappaTasks = useMemo(() => tasks.filter(t => t.kappaRequired), [tasks])
  const kappaTree = useMemo(() => buildKappaTree(kappaTasks), [kappaTasks])
  const collectorTask = useMemo(() => kappaTasks.find(t => t.name === 'Collector'), [kappaTasks])

  useEffect(() => {
    setProgress(loadTaskProgress())
    setCollectedItems(loadKappaItems())
  }, [])

  const completedCount = kappaTasks.filter(t => (progress[t.id] ?? 'not_started') === 'completed').length
  const pct = kappaTasks.length ? Math.round((completedCount / kappaTasks.length) * 100) : 0
  const remaining = kappaTasks.filter(t => (progress[t.id] ?? 'not_started') !== 'completed')

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
      const current = (prev[taskId] ?? 'not_started') as TaskStatus
      const idx = STATUS_CYCLE.indexOf(current)
      const next = STATUS_CYCLE[((idx === -1 ? 0 : idx) + 1) % STATUS_CYCLE.length]
      const updated = { ...prev, [taskId]: next }
      if (next === 'completed') {
        const prereqMap = buildPrereqMap(tasks)
        const prereqs = collectPrereqs([taskId], prereqMap)
        prereqs.forEach(prereqId => {
          if (updated[prereqId] !== 'completed') updated[prereqId] = 'completed'
        })
      }
      saveTaskProgress(updated)
      return updated
    })
  }

  function toggleCollected(objId: string) {
    setCollectedItems(prev => {
      const updated = { ...prev, [objId]: !prev[objId] }
      saveKappaItems(updated)
      return updated
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Shield size={20} className="text-tarkov-yellow mt-1 flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-tarkov-yellow font-mono">KAPPA TRACKER</h1>
          <p className="text-xs text-tarkov-muted mt-0.5">
            {completedCount} / {kappaTasks.length} tasks completed · {remaining.length} remaining
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-tarkov-muted font-mono uppercase tracking-wider">Kappa Progress</span>
          <span className="text-tarkov-yellow font-mono font-bold">{pct}%</span>
        </div>
        <div className="w-full bg-tarkov-surface rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct === 100 ? '#4a8c5c' : '#c8a96e' }}
          />
        </div>
        {pct === 100 && (
          <p className="text-center text-green-400 text-sm font-semibold font-mono">KAPPA CONTAINER UNLOCKED</p>
        )}
      </div>

      {remaining.length > 0 && remaining.length <= 10 && (
        <div className="card border-tarkov-yellow/20">
          <p className="text-xs text-tarkov-muted font-mono uppercase tracking-wider mb-2">
            Almost there — {remaining.length} task{remaining.length !== 1 ? 's' : ''} left
          </p>
          <div className="flex flex-wrap gap-1.5">
            {remaining.map(t => (
              <span key={t.id} className="text-xs bg-tarkov-surface border border-tarkov-border rounded px-2 py-0.5 text-tarkov-text">
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-lg border border-tarkov-border overflow-hidden">
        {([['tasks', 'Task List'], ['tree', 'Dependency Tree'], ['collector', 'Collector Items']] as [KappaTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-tarkov-yellow text-tarkov-bg'
                : 'bg-tarkov-card text-tarkov-muted hover:text-tarkov-text hover:bg-tarkov-surface'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task List tab */}
      {tab === 'tasks' && (
        <>
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
            <select className="input appearance-none cursor-pointer" value={traderFilter} onChange={e => setTraderFilter(e.target.value)}>
              {TRADERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="input appearance-none cursor-pointer" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <p className="text-xs text-tarkov-muted">Showing {filtered.length} of {kappaTasks.length} Kappa tasks</p>
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="card text-center text-tarkov-muted py-10 text-sm">No tasks found.</div>
            ) : (
              filtered.map(task => (
                <KappaTaskCard
                  key={task.id}
                  task={task}
                  status={(progress[task.id] ?? 'not_started') as TaskStatus}
                  onCycle={() => cycleStatus(task.id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Dependency Tree tab */}
      {tab === 'tree' && (
        <div className="space-y-1">
          <p className="text-xs text-tarkov-muted mb-3">
            Prerequisite chains — completing a task unlocks its dependents. Click the arrow to collapse branches.
          </p>
          {kappaTree.length === 0 ? (
            <div className="card text-center text-tarkov-muted py-10 text-sm">No tree data available.</div>
          ) : (
            kappaTree.map(node => (
              <KappaTreeNode key={node.task.id} node={node} progress={progress} onCycle={cycleStatus} />
            ))
          )}
        </div>
      )}

      {/* Collector Items tab */}
      {tab === 'collector' && (
        <CollectorItemsTab
          task={collectorTask}
          collected={collectedItems}
          onToggle={toggleCollected}
        />
      )}
    </div>
  )
}
