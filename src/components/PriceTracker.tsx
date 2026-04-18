'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Search, Star, StarOff, ExternalLink, RefreshCw, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import type { TarkovItem, WatchedItems } from '@/types/tarkov'
import { loadWatchedItems, saveWatchedItems } from '@/lib/progress'
import { formatPrice } from '@/lib/tarkov-api'

const POPULAR_QUERIES = ['bitcoin', 'graphics card', 'fuel conditioner', 'moonshine', 'ledx']
const REFRESH_MS = 5 * 60 * 1000

function PriceChange({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-tarkov-muted text-xs">—</span>
  const positive = pct >= 0
  return (
    <span className={`flex items-center gap-0.5 text-xs ${positive ? 'text-green-400' : 'text-red-400'}`}>
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function bestVendorSell(item: TarkovItem) {
  if (!item.sellFor.length) return null
  return item.sellFor.reduce((a, b) => (a.priceRUB > b.priceRUB ? a : b))
}

function bestVendorBuy(item: TarkovItem) {
  const vendors = item.buyFor.filter(v => v.vendor.name !== 'FleaMarket')
  if (!vendors.length) return null
  return vendors.reduce((a, b) => (a.priceRUB < b.priceRUB ? a : b))
}

interface ItemRowProps {
  item: TarkovItem
  watched: boolean
  onToggleWatch: () => void
}

function ItemRow({ item, watched, onToggleWatch }: ItemRowProps) {
  const sell = bestVendorSell(item)
  const buy = bestVendorBuy(item)

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {item.iconLink ? (
          <Image
            src={item.iconLink}
            alt={item.shortName}
            width={40}
            height={40}
            className="object-contain flex-shrink-0 rounded bg-tarkov-surface"
            unoptimized
          />
        ) : (
          <div className="w-10 h-10 rounded bg-tarkov-surface flex-shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-tarkov-text truncate">{item.name}</span>
            <span className="text-xs text-tarkov-muted">{item.shortName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-0.5">
            <span className="text-tarkov-yellow font-mono text-sm">{formatPrice(item.avg24hPrice)}</span>
            <PriceChange pct={item.changeLast48hPercent} />
            {item.lastLowPrice && (
              <span className="text-xs text-tarkov-muted">Low: {formatPrice(item.lastLowPrice)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
        {sell && (
          <div className="text-center">
            <p className="text-tarkov-muted">Best Sell</p>
            <p className="text-green-400 font-mono">{formatPrice(sell.priceRUB)}</p>
            <p className="text-tarkov-muted">{sell.vendor.name}</p>
          </div>
        )}
        {buy && (
          <div className="text-center">
            <p className="text-tarkov-muted">Trader Buy</p>
            <p className="text-blue-400 font-mono">{formatPrice(buy.priceRUB)}</p>
            <p className="text-tarkov-muted">{buy.vendor.name}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {item.wikiLink && (
          <a
            href={item.wikiLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tarkov-muted hover:text-tarkov-yellow transition-colors"
            title="Wiki"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <button
          onClick={onToggleWatch}
          className={`transition-colors ${watched ? 'text-tarkov-yellow' : 'text-tarkov-muted hover:text-tarkov-yellow'}`}
          title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {watched ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
        </button>
      </div>
    </div>
  )
}

async function apiFetch(url: string): Promise<TarkovItem[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export default function PriceTracker() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<TarkovItem[]>([])
  const [watchedIds, setWatchedIds] = useState<WatchedItems>({})
  const [watchedItems, setWatchedItems] = useState<TarkovItem[]>([])
  const [popularItems, setPopularItems] = useState<TarkovItem[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setWatchedIds(loadWatchedItems())
  }, [])

  const loadWatchedPrices = useCallback(async (ids: WatchedItems, silent = false) => {
    const active = Object.entries(ids).filter(([, v]) => v).map(([k]) => k)
    if (!active.length) { setWatchedItems([]); return }
    if (!silent) setRefreshing(true)
    setError(null)
    try {
      const items = await apiFetch(`/api/items?ids=${active.join(',')}`)
      setWatchedItems(items)
    } catch {
      if (!silent) setError('Failed to refresh prices. The tarkov.dev API may be temporarily unavailable.')
    } finally {
      if (!silent) setRefreshing(false)
    }
  }, [])

  // Load popular items on mount
  useEffect(() => {
    async function loadPopular() {
      try {
        const results = await Promise.all(
          POPULAR_QUERIES.map(q => apiFetch(`/api/items?q=${encodeURIComponent(q)}`))
        )
        const seen = new Set<string>()
        const items: TarkovItem[] = []
        for (const batch of results) {
          if (batch[0] && !seen.has(batch[0].id)) {
            seen.add(batch[0].id)
            items.push(batch[0])
          }
        }
        setPopularItems(items)
      } catch {
        // Popular items are best-effort — fail silently
      }
    }
    loadPopular()
  }, [])

  // Load watched prices and set up auto-refresh
  useEffect(() => {
    loadWatchedPrices(watchedIds, true)
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    refreshTimerRef.current = setInterval(() => loadWatchedPrices(watchedIds, true), REFRESH_MS)
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current) }
  }, [watchedIds, loadWatchedPrices])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) { setResults([]); setError(null); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const items = await apiFetch(`/api/items?q=${encodeURIComponent(search)}`)
        setResults(items)
        if (items.length === 0) setError(null)
      } catch {
        setError('Search failed. The tarkov.dev API may be temporarily unavailable.')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  function toggleWatch(item: TarkovItem) {
    setWatchedIds(prev => {
      const updated = { ...prev, [item.id]: !prev[item.id] }
      saveWatchedItems(updated)
      return updated
    })
  }

  const watchedCount = Object.values(watchedIds).filter(Boolean).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-tarkov-yellow font-mono">FLEA MARKET</h1>
        <p className="text-xs text-tarkov-muted mt-0.5">
          Live prices via tarkov.dev · {watchedCount} item{watchedCount !== 1 ? 's' : ''} watched · auto-refreshes every 5 min
        </p>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tarkov-muted" />
        <input
          className="input pl-9"
          placeholder="Search items by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        {loading && (
          <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tarkov-muted animate-spin" />
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-tarkov-red-dark/30 border border-tarkov-red/40 rounded p-3 text-sm text-red-300">
          <AlertCircle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {search ? (
        <div className="space-y-2">
          <p className="text-xs text-tarkov-muted">
            {loading ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </p>
          {results.map(item => (
            <ItemRow key={item.id} item={item} watched={!!watchedIds[item.id]} onToggleWatch={() => toggleWatch(item)} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {watchedCount > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-tarkov-text flex items-center gap-2">
                  <Star size={14} className="text-tarkov-yellow" />
                  Watchlist
                </h2>
                <button
                  onClick={() => loadWatchedPrices(watchedIds)}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 text-xs text-tarkov-muted hover:text-tarkov-yellow transition-colors"
                >
                  <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
              {watchedItems.map(item => (
                <ItemRow key={item.id} item={item} watched={!!watchedIds[item.id]} onToggleWatch={() => toggleWatch(item)} />
              ))}
            </div>
          )}

          {popularItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-tarkov-muted flex items-center gap-2">
                <TrendingUp size={14} />
                Popular Items
              </h2>
              {popularItems.map(item => (
                <ItemRow key={item.id} item={item} watched={!!watchedIds[item.id]} onToggleWatch={() => toggleWatch(item)} />
              ))}
            </div>
          )}

          {watchedCount === 0 && popularItems.length === 0 && (
            <div className="card text-center text-tarkov-muted py-10 text-sm">
              <Search size={24} className="mx-auto mb-2 opacity-30" />
              <p>Search for items and star them to build your watchlist.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
