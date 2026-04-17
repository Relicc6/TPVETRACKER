'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import type { HideoutStation, HideoutProgressMap } from '@/types/tarkov'
import { loadHideoutProgress, saveHideoutProgress } from '@/lib/progress'
import { formatTime } from '@/lib/tarkov-api'

interface StationCardProps {
  station: HideoutStation
  currentLevel: number
  onLevelChange: (level: number) => void
}

function StationCard({ station, currentLevel, onLevelChange }: StationCardProps) {
  const [open, setOpen] = useState(false)
  const maxLevel = station.levels.length
  const nextLevel = station.levels.find(l => l.level === currentLevel + 1)
  const isMaxed = currentLevel >= maxLevel

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${isMaxed ? 'text-green-400' : 'text-tarkov-text'}`}>
              {station.name}
            </span>
            {isMaxed && (
              <span className="text-xs px-2 py-0.5 rounded bg-tarkov-green-dark border border-tarkov-green/40 text-green-300">
                MAXED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1">
              {Array.from({ length: maxLevel }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onLevelChange(i + 1 === currentLevel ? i : i + 1)}
                  className={`w-6 h-6 rounded text-xs font-mono font-bold transition-colors ${
                    i < currentLevel
                      ? 'bg-tarkov-green text-white'
                      : i === currentLevel
                      ? 'bg-tarkov-yellow/20 border border-tarkov-yellow text-tarkov-yellow'
                      : 'bg-tarkov-surface border border-tarkov-border text-tarkov-muted hover:border-tarkov-yellow/40'
                  }`}
                  title={`Level ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <span className="text-xs text-tarkov-muted font-mono">
              {currentLevel} / {maxLevel}
            </span>
          </div>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="text-tarkov-muted hover:text-tarkov-text transition-colors p-1"
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!isMaxed && nextLevel && !open && (
        <div className="mt-3 pt-3 border-t border-tarkov-border">
          <p className="text-xs text-tarkov-muted mb-1.5">
            Next: Level {nextLevel.level}
            {nextLevel.constructionTime > 0 && (
              <span className="ml-2 text-tarkov-yellow">
                {formatTime(nextLevel.constructionTime)}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {nextLevel.itemRequirements.map((req, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-tarkov-surface rounded px-2 py-1">
                {req.item.iconLink && (
                  <Image
                    src={req.item.iconLink}
                    alt={req.item.shortName}
                    width={20}
                    height={20}
                    className="object-contain"
                    unoptimized
                  />
                )}
                <span className="text-xs text-tarkov-text">{req.item.shortName}</span>
                <span className="text-xs text-tarkov-yellow font-mono">×{req.count}</span>
              </div>
            ))}
            {nextLevel.stationLevelRequirements.map((req, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 bg-tarkov-blue/10 border border-tarkov-blue/30 rounded px-2 py-1"
              >
                <span className="text-xs text-blue-300">
                  {req.station.name} Lvl {req.level}
                </span>
              </div>
            ))}
            {nextLevel.traderRequirements.map((req, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 bg-purple-900/20 border border-purple-700/30 rounded px-2 py-1"
              >
                <span className="text-xs text-purple-300">
                  {req.trader.name} LL{req.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="mt-3 pt-3 border-t border-tarkov-border space-y-3">
          {station.levels.map(lvl => (
            <div
              key={lvl.id}
              className={`rounded p-3 ${
                lvl.level <= currentLevel
                  ? 'bg-tarkov-green-dark/20 border border-tarkov-green/20'
                  : 'bg-tarkov-surface border border-tarkov-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-semibold font-mono ${
                    lvl.level <= currentLevel ? 'text-green-400' : 'text-tarkov-muted'
                  }`}
                >
                  LEVEL {lvl.level}
                  {lvl.level <= currentLevel && ' ✓'}
                </span>
                {lvl.constructionTime > 0 && (
                  <span className="text-xs text-tarkov-yellow">{formatTime(lvl.constructionTime)}</span>
                )}
              </div>

              {lvl.itemRequirements.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {lvl.itemRequirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-tarkov-card rounded px-2 py-0.5">
                      {req.item.iconLink && (
                        <Image
                          src={req.item.iconLink}
                          alt={req.item.shortName}
                          width={16}
                          height={16}
                          className="object-contain"
                          unoptimized
                        />
                      )}
                      <span className="text-xs text-tarkov-text">{req.item.shortName}</span>
                      <span className="text-xs text-tarkov-yellow font-mono">×{req.count}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {lvl.stationLevelRequirements.map((req, idx) => (
                  <span
                    key={idx}
                    className="text-xs text-blue-300 bg-tarkov-blue/10 border border-tarkov-blue/20 rounded px-1.5 py-0.5"
                  >
                    {req.station.name} Lvl {req.level}
                  </span>
                ))}
                {lvl.traderRequirements.map((req, idx) => (
                  <span
                    key={idx}
                    className="text-xs text-purple-300 bg-purple-900/10 border border-purple-700/20 rounded px-1.5 py-0.5"
                  >
                    {req.trader.name} LL{req.value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HideoutTracker({ stations }: { stations: HideoutStation[] }) {
  const [progress, setProgress] = useState<HideoutProgressMap>({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'maxed'>('all')

  useEffect(() => {
    setProgress(loadHideoutProgress())
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return stations.filter(s => {
      if (search && !s.name.toLowerCase().includes(q)) return false
      const lvl = progress[s.id] ?? 0
      if (filter === 'in_progress' && (lvl === 0 || lvl >= s.levels.length)) return false
      if (filter === 'maxed' && lvl < s.levels.length) return false
      return true
    })
  }, [stations, search, filter, progress])

  const maxedCount = stations.filter(s => (progress[s.id] ?? 0) >= s.levels.length).length

  function setLevel(stationId: string, level: number) {
    setProgress(prev => {
      const updated = { ...prev, [stationId]: level }
      saveHideoutProgress(updated)
      return updated
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-tarkov-yellow font-mono">HIDEOUT TRACKER</h1>
        <p className="text-xs text-tarkov-muted mt-0.5">
          {maxedCount} / {stations.length} stations maxed
        </p>
      </div>

      <div className="w-full bg-tarkov-surface rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-tarkov-yellow rounded-full transition-all duration-500"
          style={{ width: stations.length ? `${(maxedCount / stations.length) * 100}%` : '0%' }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tarkov-muted" />
          <input
            className="input pl-9"
            placeholder="Search stations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input appearance-none cursor-pointer"
          value={filter}
          onChange={e => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">All stations</option>
          <option value="in_progress">In Progress</option>
          <option value="maxed">Maxed</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card text-center text-tarkov-muted py-10 text-sm">No stations found.</div>
        ) : (
          filtered.map(station => (
            <StationCard
              key={station.id}
              station={station}
              currentLevel={progress[station.id] ?? 0}
              onLevelChange={level => setLevel(station.id, level)}
            />
          ))
        )}
      </div>
    </div>
  )
}
