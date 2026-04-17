export interface Trader {
  id: string
  name: string
}

export interface TaskObjective {
  id: string
  description: string
  type: string
  optional: boolean
}

export interface TaskRequirement {
  task: { id: string; name: string }
  status: string[]
}

export interface Task {
  id: string
  name: string
  normalizedName: string
  trader: Trader
  minPlayerLevel: number
  experience: number
  map: { name: string } | null
  objectives: TaskObjective[]
  taskRequirements: TaskRequirement[]
}

export interface HideoutItemRequirement {
  item: {
    id: string
    name: string
    shortName: string
    iconLink: string | null
  }
  count: number
}

export interface HideoutStationRequirement {
  station: { id: string; name: string }
  level: number
}

export interface HideoutTraderRequirement {
  trader: { name: string }
  requirementType: string
  value: number
}

export interface HideoutLevel {
  id: string
  level: number
  constructionTime: number
  itemRequirements: HideoutItemRequirement[]
  stationLevelRequirements: HideoutStationRequirement[]
  traderRequirements: HideoutTraderRequirement[]
}

export interface HideoutStation {
  id: string
  name: string
  normalizedName: string
  levels: HideoutLevel[]
}

export interface VendorPrice {
  vendor: { name: string }
  price: number
  currency: string
  priceRUB: number
}

export interface TarkovItem {
  id: string
  name: string
  shortName: string
  iconLink: string | null
  wikiLink: string | null
  avg24hPrice: number | null
  lastLowPrice: number | null
  changeLast48h: number | null
  changeLast48hPercent: number | null
  updated: string
  sellFor: VendorPrice[]
  buyFor: VendorPrice[]
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed'
export type TaskProgressMap = Record<string, TaskStatus>
export type HideoutProgressMap = Record<string, number>
export type WatchedItems = Record<string, boolean>
