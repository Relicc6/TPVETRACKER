import { fetchTasks } from '@/lib/tarkov-api'
import KappaTracker from '@/components/KappaTracker'

export const revalidate = 3600

export default async function KappaPage() {
  let tasks: import('@/types/tarkov').Task[] = []
  try {
    tasks = await fetchTasks()
  } catch (err) {
    console.error('Failed to fetch tasks for Kappa:', err)
  }

  return <KappaTracker tasks={tasks} />
}
