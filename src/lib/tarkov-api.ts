import type { Task, HideoutStation, TarkovItem } from '@/types/tarkov'

const API_URL = 'https://api.tarkov.dev/graphql'

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'tpvetracker/1.0' },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`tarkov.dev API error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data as T
}

export async function fetchTasks(): Promise<Task[]> {
  const data = await gql<{ tasks: Task[] }>(`
    query {
      tasks {
        id
        name
        normalizedName
        trader { id name }
        minPlayerLevel
        experience
        map { name }
        objectives {
          id
          description
          type
          optional
        }
        taskRequirements {
          task { id name }
          status
        }
        kappaRequired
      }
    }
  `)
  return data.tasks
}

export async function fetchHideout(): Promise<HideoutStation[]> {
  const data = await gql<{ hideoutStations: HideoutStation[] }>(`
    query {
      hideoutStations {
        id
        name
        normalizedName
        levels {
          id
          level
          constructionTime
          itemRequirements {
            item { id name shortName iconLink }
            count
          }
          stationLevelRequirements {
            station { id name }
            level
          }
          traderRequirements {
            trader { name }
            requirementType
            value
          }
        }
      }
    }
  `)
  return data.hideoutStations
}

export async function searchItems(query: string): Promise<TarkovItem[]> {
  if (!query.trim()) return []
  const data = await gql<{ items: TarkovItem[] }>(
    `
    query SearchItems($name: String!) {
      items(name: $name, limit: 30) {
        id
        name
        shortName
        iconLink
        wikiLink
        avg24hPrice
        lastLowPrice
        changeLast48h
        changeLast48hPercent
        updated
        sellFor { vendor { name } price currency priceRUB }
        buyFor { vendor { name } price currency priceRUB }
      }
    }
  `,
    { name: query }
  )
  return data.items
}

export async function fetchItemsByIds(ids: string[]): Promise<TarkovItem[]> {
  if (!ids.length) return []
  const data = await gql<{ items: TarkovItem[] }>(
    `
    query GetItems($ids: [ID]!) {
      items(ids: $ids) {
        id
        name
        shortName
        iconLink
        wikiLink
        avg24hPrice
        lastLowPrice
        changeLast48h
        changeLast48hPercent
        updated
        sellFor { vendor { name } price currency priceRUB }
        buyFor { vendor { name } price currency priceRUB }
      }
    }
  `,
    { ids }
  )
  return data.items
}

export function formatPrice(price: number | null): string {
  if (price === null || price === 0) return 'N/A'
  return price.toLocaleString() + ' ₽'
}

export function formatTime(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}
