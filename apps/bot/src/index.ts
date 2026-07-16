import 'dotenv/config'
import express from 'express'
import { prisma } from '@call-platform/db'
import type { BotJoinRequest } from '@call-platform/types'
import { BotSessionManager } from './session-manager'

const app = express()
app.use(express.json())

const manager = new BotSessionManager()

// Internal auth middleware
app.use((req, res, next) => {
  const secret = req.headers['x-bot-secret']
  if (secret !== process.env.BOT_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
})

// POST /join — instruct bot to join a meeting
app.post('/join', async (req, res) => {
  const body = req.body as BotJoinRequest
  if (!body.meetingId || !body.joinUrl || !body.platform) {
    res.status(400).json({ error: 'meetingId, joinUrl, platform required' })
    return
  }

  try {
    await manager.join(body)
    res.json({ ok: true, meetingId: body.meetingId })
  } catch (err: any) {
    console.error('Join error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /leave — force disconnect
app.post('/leave', async (req, res) => {
  const { meetingId } = req.body
  if (!meetingId) { res.status(400).json({ error: 'meetingId required' }); return }
  await manager.leave(meetingId)
  res.json({ ok: true })
})

// GET /status — list active bot sessions
app.get('/status', (_req, res) => {
  res.json({ sessions: manager.listActive() })
})

const PORT = process.env.BOT_PORT ?? 3002
app.listen(PORT, () => console.log(`Bot service running on :${PORT}`))

process.on('SIGTERM', async () => {
  await manager.shutdown()
  process.exit(0)
})
