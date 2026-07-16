import 'dotenv/config'
import { Worker } from 'bullmq'
import { QUEUE_NAMES } from '@call-platform/queue'
import { handleTranscription } from './processors/transcription'
import { handleAnalysis } from './processors/analysis'
import { handleCrmSync } from './processors/crm-sync'
import { handleSlackNotify } from './processors/slack-notify'
import { handleBotJoin } from './processors/bot-join'

const connection = { url: process.env.REDIS_URL! }

const workers = [
  new Worker(QUEUE_NAMES.TRANSCRIPTION, handleTranscription, { connection, concurrency: 5 }),
  new Worker(QUEUE_NAMES.ANALYSIS, handleAnalysis, { connection, concurrency: 3 }),
  new Worker(QUEUE_NAMES.CRM_SYNC, handleCrmSync, { connection, concurrency: 5 }),
  new Worker(QUEUE_NAMES.SLACK_NOTIFY, handleSlackNotify, { connection, concurrency: 10 }),
  new Worker(QUEUE_NAMES.BOT_JOIN, handleBotJoin, { connection, concurrency: 10 }),
]

for (const worker of workers) {
  worker.on('completed', (job) => console.log(`[${job.queueName}] ✓ job ${job.id}`))
  worker.on('failed', (job, err) => console.error(`[${job?.queueName}] ✗ job ${job?.id}:`, err.message))
}

console.log('Worker started — listening on all queues')

process.on('SIGTERM', async () => {
  console.log('Shutting down workers…')
  await Promise.all(workers.map((w) => w.close()))
  process.exit(0)
})
