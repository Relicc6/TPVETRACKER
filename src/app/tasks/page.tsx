import { fetchTasks } from '@/lib/tarkov-api'
import TasksList from '@/components/TasksList'

export const revalidate = 3600

export default async function TasksPage() {
  let tasks: import('@/types/tarkov').Task[] = []
  try {
    tasks = await fetchTasks()
  } catch (err) {
    console.error('Failed to fetch tasks:', err)
  }

  return <TasksList tasks={tasks} />
}
