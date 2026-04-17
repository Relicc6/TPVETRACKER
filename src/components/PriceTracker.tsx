'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Search, Star, StarOff, ExternalLink, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import type { TarkovItem, WatchedItems } from '@/types/tarkov'
import { loadWatchedItems, saveWatchedItems } from '@/lib/progress'
import { formatPrice } from '@/lib/tarkov-api'

function PriceChange({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-tarkov-muted text-xs">—</span>
  const positive = pct >= 0
  return (
    <span
      className={`flex items-center gap-0.5 text-xs ${positive ? 'text-green-400' : 'text-red-400'}`}
    >
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
            <span className="text-tarkov-yellow font-mono text-sm">
              {formatPrice(item.avg24hPrice)}
            </span>
            <PriceChange pct={item.changeLast48hPercent} />
            {item.lastLowPrice && (
              <span className="text-xs text-tarkov-muted">
                Low: {formatPrice(item.lastLowPrice)}
              </span>
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
          className={`transition-colors ${
            watched ? 'text-tarkov-yellow' : 'text-tarkov-muted hover:text-tarkov-yellow'
          }`}
          title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {watched ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
        </button>
      </div>
    </div>
  )
}

export default function PriceTracker() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<TarkovItem[]>([])
  const [watchedIds, setWatchedIds] = useState<WatchedItems>({})
  const [watchedItems, setWatchedItems] = useState<TarkovItem[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setWatchedIds(loadWatchedItems())
  }, [])

  const loadWatchedPrices = useCallback(async (ids: WatchedItems, silent = false) => {
    const active = Object.entries(ids)
      .filter(([, v]) => v)
      .map(([k]) => k)
    if (!active.length) {
      setWatchedItems([])
      return
    }
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch(`/api/items?ids=${active.join(',')}`)
      if (res.ok) setWatchedItems(await res.json())
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadWatchedPrices(watchedIds, true)
  }, [watchedIds, loadWatchedPrices])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/items?q=${encodeURIComponent(search)}`)
        if (res.ok) setResults(await res.json())
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  function toggleWatch(item: TarkovItem) {
    setWatchedIds(prev => {
      const updated = { ...prev, [item.id]: !prev[item.id] }
      saveWatchedItems(updated)
      loadWatchedPrices(updated, true)
      return updated
    })
  }

  const watchedCount = Object.values(watchedIds).filter(Boolean).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-tarkov-yellow font-mono">FLEA MARKET</h1>
        <p className="text-xs text-tarkov-muted mt-0.5">
          Live prices via tarkov.dev — {watchedCount} item{watchedCount !== 1 ? 's' : ''} watched
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
          <RefreshCw
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tarkov-muted animate-spin"
          />
        )}
      </div>

      {search && (
        <div className="space-y-2">
          <p className="text-xs text-tarkov-muted">
            {results.length ? `${results.length} results` : loading ? 'Searching...' : 'No results'}
          </p>
          {results.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              watched={!!watchedIds[item.id]}
              onToggleWatch={() => toggleWatch(item)}
            />
          ))}
        </div>
      )}

      {!search && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-tarkov-text flex items-center gap-2">
              <Star size={14} className="text-tarkov-yellow" />
              Watchlist
            </h2>
            {watchedCount > 0 && (
              <button
                onClick={() => loadWatchedPrices(watchedIds)}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-tarkov-muted hover:text-tarkov-yellow transition-colors"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                Refresh prices
              </button>
            )}
          </div>

          {watchedCount === 0 ? (
            <div className="card text-center text-tarkov-muted py-10 text-sm">
              <Star size={24} className="mx-auto mb-2 opacity-30" />
              <p>No items in watchlist.</p>
              <p className="text-xs mt-1">Search for items and click the star to watch them.</p>
            </div>
          ) : (
            watchedItems.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                watched={!!watchedIds[item.id]}
                onToggleWatch={() => toggleWatch(item)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
