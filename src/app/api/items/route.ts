import { NextRequest, NextResponse } from 'next/server'
import { searchItems, fetchItemsByIds } from '@/lib/tarkov-api'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const query = searchParams.get('q')
  const ids = searchParams.get('ids')

  try {
    if (ids) {
      const idList = ids.split(',').filter(Boolean)
      const items = await fetchItemsByIds(idList)
      return NextResponse.json(items)
    }
    if (query) {
      const items = await searchItems(query)
      return NextResponse.json(items)
    }
    return NextResponse.json([])
  } catch (err) {
    console.error('Items API error:', err)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}
