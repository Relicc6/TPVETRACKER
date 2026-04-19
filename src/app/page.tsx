'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Target, Building2, TrendingUp, ChevronRight, Shield } from 'lucide-react'
import { loadTaskProgress, loadHideoutProgress, loadWatchedItems } from '@/lib/progress'

export default function Dashboard() {
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    tasksTotal: 0,
    hideoutProgress: 0,
    watchedItems: 0,
  })

  useEffect(() => {
    const taskProgress = loadTaskProgress()
    const hideoutProgress = loadHideoutProgress()
    const watched = loadWatchedItems()
    const statuses = Object.values(taskProgress)
    setStats({
      tasksCompleted: statuses.filter(s => s === 'completed').length,
      tasksTotal: statuses.length,
      hideoutProgress: Object.values(hideoutProgress).filter(l => l > 0).length,
      watchedItems: Object.values(watched).filter(Boolean).length,
    })
  }, [])

  const pct = stats.tasksTotal ? Math.round((stats.tasksCompleted / stats.tasksTotal) * 100) : 0

  const cards = [
    {
      href: '/tasks',
      icon: Target,
      label: 'Task Tracker',
      description: 'Track quest progress across all traders',
      stat: stats.tasksTotal ? `${stats.tasksCompleted} / ${stats.tasksTotal}` : '—',
      substat: 'tasks completed',
      gradient: 'from-tarkov-yellow/10 to-transparent',
      border: 'hover:border-tarkov-yellow/50',
      iconColor: 'text-tarkov-yellow',
      bg: 'bg-tarkov-yellow/10',
    },
    {
      href: '/hideout',
      icon: Building2,
      label: 'Hideout',
      description: 'Upgrade stations and track requirements',
      stat: stats.hideoutProgress > 0 ? `${stats.hideoutProgress}` : '—',
      substat: 'stations with progress',
      gradient: 'from-blue-500/10 to-transparent',
      border: 'hover:border-blue-500/50',
      iconColor: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      href: '/kappa',
      icon: Shield,
      label: 'Kappa',
      description: 'Container unlock quest tracker',
      stat: '—',
      substat: 'tasks required',
      gradient: 'from-purple-500/10 to-transparent',
      border: 'hover:border-purple-500/50',
      iconColor: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      href: '/prices',
      icon: TrendingUp,
      label: 'Flea Market',
      description: 'Live prices and item watchlist',
      stat: stats.watchedItems > 0 ? `${stats.watchedItems}` : '—',
      substat: 'items watched',
      gradient: 'from-green-500/10 to-transparent',
      border: 'hover:border-green-500/50',
      iconColor: 'text-green-400',
      bg: 'bg-green-500/10',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-tarkov-border bg-tarkov-card">
        <div className="absolute inset-0 bg-gradient-to-br from-tarkov-yellow/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-tarkov-yellow/3 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        <div className="relative px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-tarkov-yellow/10 border border-tarkov-yellow/20 flex items-center justify-center">
              <Target size={20} className="text-tarkov-yellow" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-tarkov-yellow font-mono tracking-widest">TPVE TRACKER</h1>
              <p className="text-tarkov-muted text-xs">Tarkov PVE — Tasks · Hideout · Flea Market</p>
            </div>
          </div>

          {stats.tasksTotal > 0 && (
            <div className="mt-6 max-w-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-tarkov-muted font-mono uppercase tracking-wider">Overall task progress</span>
                <span className="text-tarkov-yellow font-mono font-bold text-sm">{pct}%</span>
              </div>
              <div className="w-full bg-tarkov-surface rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-tarkov-yellow-dark to-tarkov-yellow rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-tarkov-muted mt-1.5">
                {stats.tasksCompleted} of {stats.tasksTotal} tasks completed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ href, icon: Icon, label, description, stat, substat, gradient, border, iconColor, bg }) => (
          <Link
            key={href}
            href={href}
            className={`group relative overflow-hidden rounded-xl border border-tarkov-border ${border} bg-tarkov-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={18} className={iconColor} />
                </div>
                <ChevronRight size={14} className="text-tarkov-border group-hover:text-tarkov-muted transition-colors mt-1" />
              </div>
              <p className={`text-2xl font-bold font-mono ${iconColor} mb-0.5`}>{stat}</p>
              <p className="text-xs text-tarkov-muted">{substat}</p>
              <div className="mt-3 pt-3 border-t border-tarkov-border/50">
                <p className="text-xs font-medium text-tarkov-text">{label}</p>
                <p className="text-xs text-tarkov-muted mt-0.5">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick start */}
      <div className="rounded-xl border border-tarkov-border bg-tarkov-card p-6">
        <h2 className="text-xs font-mono uppercase tracking-widest text-tarkov-muted mb-4">Getting Started</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { step: '01', text: 'Set your player level in the Tasks page to lock/unlock tasks automatically.' },
            { step: '02', text: 'Upload a screenshot of your task journal — Claude will detect active tasks.' },
            { step: '03', text: 'Track Kappa container progress on the dedicated Kappa page.' },
            { step: '04', text: 'Search flea market items and star them to build a price watchlist.' },
          ].map(({ step, text }) => (
            <div key={step} className="flex gap-3">
              <span className="text-tarkov-yellow font-mono font-bold text-sm flex-shrink-0 mt-0.5">{step}</span>
              <p className="text-sm text-tarkov-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
