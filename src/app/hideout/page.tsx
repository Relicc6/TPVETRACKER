import { fetchHideout } from '@/lib/tarkov-api'
import HideoutTracker from '@/components/HideoutTracker'

export const revalidate = 3600

export default async function HideoutPage() {
  let stations: import('@/types/tarkov').HideoutStation[] = []
  try {
    stations = await fetchHideout()
  } catch (err) {
    console.error('Failed to fetch hideout:', err)
  }

  return <HideoutTracker stations={stations} />
}
