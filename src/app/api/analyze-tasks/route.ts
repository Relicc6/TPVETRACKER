import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  try {
    const { imageBase64, mediaType } = await req.json() as {
      imageBase64: string
      mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    }

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: 'Missing imageBase64 or mediaType' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text: `This is a screenshot from Escape from Tarkov showing a task/quest list.
List every task name you can see in the image, exactly as written, one per line.
Output only the task names — no numbers, bullets, or extra text.
If you cannot see any tasks, output nothing.`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const taskNames = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2)

    return NextResponse.json({ taskNames })
  } catch (err) {
    console.error('analyze-tasks error:', err)
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 })
  }
}
