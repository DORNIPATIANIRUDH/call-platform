import { Queue, Worker, type ConnectionOptions } from 'bullmq'
import type {
  TranscriptionJobData,
  AnalysisJobData,
  CrmSyncJobData,
  SlackNotifyJobData,
  BotJoinJobData,
} from '@call-platform/types'

export const QUEUE_NAMES = {
  TRANSCRIPTION: 'transcription',
  ANALYSIS: 'analysis',
  CRM_SYNC: 'crm-sync',
  SLACK_NOTIFY: 'slack-notify',
  BOT_JOIN: 'bot-join',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

function getConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL is not set')
  return { url }
}

// ─────────────────────────────────────────────────────────────────
// Queue factories
// ─────────────────────────────────────────────────────────────────

export function createTranscriptionQueue() {
  return new Queue<TranscriptionJobData>(QUEUE_NAMES.TRANSCRIPTION, {
    connection: getConnection(),
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
  })
}

export function createAnalysisQueue() {
  return new Queue<AnalysisJobData>(QUEUE_NAMES.ANALYSIS, {
    connection: getConnection(),
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
  })
}

export function createCrmSyncQueue() {
  return new Queue<CrmSyncJobData>(QUEUE_NAMES.CRM_SYNC, {
    connection: getConnection(),
    defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 3000 } },
  })
}

export function createSlackNotifyQueue() {
  return new Queue<SlackNotifyJobData>(QUEUE_NAMES.SLACK_NOTIFY, {
    connection: getConnection(),
    defaultJobOptions: { attempts: 3, backoff: { type: 'fixed', delay: 2000 } },
  })
}

export function createBotJoinQueue() {
  return new Queue<BotJoinJobData>(QUEUE_NAMES.BOT_JOIN, {
    connection: getConnection(),
    defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 5000 } },
  })
}

// ─────────────────────────────────────────────────────────────────
// Re-exports for worker consumers
// ─────────────────────────────────────────────────────────────────

export { Queue, Worker, type ConnectionOptions } from 'bullmq'
export type {
  TranscriptionJobData,
  AnalysisJobData,
  CrmSyncJobData,
  SlackNotifyJobData,
  BotJoinJobData,
} from '@call-platform/types'
