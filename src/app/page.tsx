'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Target, Building2, TrendingUp, ChevronRight } from 'lucide-react'
import { loadTaskProgress, loadHideoutProgress, loadWatchedItems } from '@/lib/progress'

export default function Dashboard() {
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    tasksInProgress: 0,
    tasksTotal: 0,
    hideoutMaxed: 0,
    hideoutTotal: 0,
    watchedItems: 0,
  })

  useEffect(() => {
    const taskProgress = loadTaskProgress()
    const hideoutProgress = loadHideoutProgress()
    const watched = loadWatchedItems()

    const statuses = Object.values(taskProgress)
    const tasksCompleted = statuses.filter(s => s === 'completed').length
    const tasksInProgress = statuses.filter(s => s === 'in_progress').length

    const hideoutLevels = Object.values(hideoutProgress)
    const hideoutMaxed = hideoutLevels.filter(l => l > 0).length

    setStats({
      tasksCompleted,
      tasksInProgress,
      tasksTotal: statuses.length,
      hideoutMaxed,
      hideoutTotal: hideoutLevels.length,
      watchedItems: Object.values(watched).filter(Boolean).length,
    })
  }, [])

  const cards = [
    {
      href: '/tasks',
      icon: Target,
      label: 'Task Tracker',
      description: 'Track quest progress across all traders',
      stat: stats.tasksTotal
        ? `${stats.tasksCompleted} / ${stats.tasksTotal} completed`
        : 'No tasks tracked yet',
      color: 'text-tarkov-yellow',
      border: 'hover:border-tarkov-yellow/40',
    },
    {
      href: '/hideout',
      icon: Building2,
      label: 'Hideout Tracker',
      description: 'Monitor upgrade levels and requirements',
      stat: stats.hideoutTotal
        ? `${stats.hideoutMaxed} stations with progress`
        : 'No stations tracked yet',
      color: 'text-blue-400',
      border: 'hover:border-blue-400/40',
    },
    {
      href: '/prices',
      icon: TrendingUp,
      label: 'Flea Market',
      description: 'Live prices and item watchlist',
      stat: stats.watchedItems
        ? `${stats.watchedItems} items watched`
        : 'No items watched yet',
      color: 'text-green-400',
      border: 'hover:border-green-400/40',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-tarkov-yellow font-mono tracking-wide">
          TPVE TRACKER
        </h1>
        <p className="text-tarkov-muted text-sm mt-1">
          Tarkov PVE — Tasks · Hideout · Flea Market
        </p>
      </div>

      {stats.tasksTotal > 0 && (
        <div className="card">
          <p className="text-xs text-tarkov-muted mb-2 font-mono uppercase tracking-wider">
            Overall Task Progress
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-tarkov-surface rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-tarkov-yellow rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round((stats.tasksCompleted / stats.tasksTotal) * 100)}%`,
                }}
              />
            </div>
            <span className="text-sm text-tarkov-text font-mono tabular-nums">
              {Math.round((stats.tasksCompleted / stats.tasksTotal) * 100)}%
            </span>
          </div>
          {stats.tasksInProgress > 0 && (
            <p className="text-xs text-tarkov-muted mt-2">
              {stats.tasksInProgress} task{stats.tasksInProgress !== 1 ? 's' : ''} in progress
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ href, icon: Icon, label, description, stat, color, border }) => (
          <Link
            key={href}
            href={href}
            className={`card border-tarkov-border ${border} transition-all duration-150 group block`}
          >
            <div className="flex items-start justify-between mb-3">
              <Icon size={20} className={color} />
              <ChevronRight
                size={14}
                className="text-tarkov-muted group-hover:text-tarkov-text transition-colors"
              />
            </div>
            <h2 className={`font-semibold text-base ${color}`}>{label}</h2>
            <p className="text-tarkov-muted text-xs mt-1">{description}</p>
            <p className="text-tarkov-text text-sm mt-3 font-mono">{stat}</p>
          </Link>
        ))}
      </div>

      <div className="card border-tarkov-border/50">
        <h3 className="text-tarkov-muted text-xs font-mono uppercase tracking-wider mb-3">
          Getting Started
        </h3>
        <ol className="space-y-2 text-sm text-tarkov-text list-decimal list-inside">
          <li>
            Browse{' '}
            <Link href="/tasks" className="text-tarkov-yellow hover:underline">
              Tasks
            </Link>{' '}
            and mark them as in-progress or completed
          </li>
          <li>
            Track your{' '}
            <Link href="/hideout" className="text-tarkov-yellow hover:underline">
              Hideout
            </Link>{' '}
            upgrade levels and see what you need next
          </li>
          <li>
            Search items on the{' '}
            <Link href="/prices" className="text-tarkov-yellow hover:underline">
              Flea Market
            </Link>{' '}
            and watch their prices
          </li>
          <li>
            <Link href="/auth" className="text-tarkov-yellow hover:underline">
              Sign in
            </Link>{' '}
            to sync progress across devices via Supabase
          </li>
        </ol>
      </div>
    </div>
  )
}
