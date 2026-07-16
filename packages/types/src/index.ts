import type { Readable } from 'stream'

// ─────────────────────────────────────────────────────────────────
// Transcript
// ─────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  speaker?: string
  speakerId?: string
  text: string
  startMs: number
  endMs: number
  confidence?: number
}

// ─────────────────────────────────────────────────────────────────
// Meeting context passed to analysis
// ─────────────────────────────────────────────────────────────────

export interface MeetingContext {
  meetingId: string
  orgId: string
  title: string
  platform?: string
  hostEmail?: string
  participantEmails?: string[]
}

// ─────────────────────────────────────────────────────────────────
// Analysis output
// ─────────────────────────────────────────────────────────────────

export interface MeetingAnalysis {
  summary: string
  keyTopics: string[]
  nextSteps: string
  sentiment: 'positive' | 'neutral' | 'negative'
  dealScore: number // 0–100
  talkTime: Record<string, number> // speakerId → seconds
  actionItems: ExtractedActionItem[]
  dealSignals: ExtractedDealSignal[]
}

export interface ExtractedActionItem {
  text: string
  assignee?: string
  dueDate?: string // ISO date string
}

export type DealSignalType =
  | 'OBJECTION'
  | 'BUYING_SIGNAL'
  | 'COMPETITOR_MENTION'
  | 'PRICING_DISCUSSION'
  | 'TIMELINE_DISCUSSION'
  | 'DECISION_MAKER_IDENTIFIED'
  | 'NEXT_STEP_AGREED'

export interface ExtractedDealSignal {
  type: DealSignalType
  text: string
  speaker?: string
  timestampMs?: number
  confidence?: number
}

// ─────────────────────────────────────────────────────────────────
// Real-time coaching
// ─────────────────────────────────────────────────────────────────

export type CoachingAlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface CoachingAlert {
  text: string
  suggestion?: string
  severity: CoachingAlertSeverity
  triggeredAt: string // ISO timestamp
}

export interface CallContext extends MeetingContext {
  recentSegments: TranscriptSegment[]
  elapsedMs: number
}

// ─────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────

export interface UploadResult {
  storageKey: string
  storageUrl: string
  sizeBytes: number
  mimeType: string
}

// ─────────────────────────────────────────────────────────────────
// Bot / meeting join
// ─────────────────────────────────────────────────────────────────

export type BotStatus = 'IDLE' | 'JOINING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
export type MeetingPlatform = 'ZOOM' | 'GOOGLE' | 'MICROSOFT'

export interface BotJoinRequest {
  meetingId: string
  orgId: string
  platform: MeetingPlatform
  joinUrl: string
  displayName?: string
}

export interface BotStatusUpdate {
  meetingId: string
  status: BotStatus
  message?: string
}

// ─────────────────────────────────────────────────────────────────
// Queue job payloads
// ─────────────────────────────────────────────────────────────────

export interface TranscriptionJobData {
  meetingId: string
  orgId: string
  audioChunk?: Buffer
  audioUrl?: string    // for post-call full file transcription
  chunkIndex?: number
  isFinal?: boolean
}

export interface AnalysisJobData {
  meetingId: string
  orgId: string
}

export interface CrmSyncJobData {
  meetingId: string
  orgId: string
  platforms: Array<'HUBSPOT' | 'SALESFORCE'>
}

export interface SlackNotifyJobData {
  meetingId: string
  orgId: string
  channelId?: string
}

export interface BotJoinJobData extends BotJoinRequest {}

// ─────────────────────────────────────────────────────────────────
// API response wrappers
// ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  error?: never
}

export interface ApiError {
  data?: never
  error: {
    code: string
    message: string
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// ─────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
