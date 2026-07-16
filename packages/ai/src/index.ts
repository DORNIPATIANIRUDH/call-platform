import type { Readable } from 'stream'
import type { TranscriptSegment, MeetingContext, MeetingAnalysis, CoachingAlert, CallContext } from '@call-platform/types'

// ─────────────────────────────────────────────────────────────────
// Provider interfaces
// ─────────────────────────────────────────────────────────────────

export interface TranscriptionProvider {
  transcribeStream(audioStream: Readable): AsyncIterable<TranscriptSegment>
  transcribeFile(audioUrl: string): Promise<TranscriptSegment[]>
}

export interface AnalysisProvider {
  analyzeMeeting(
    segments: TranscriptSegment[],
    context: MeetingContext
  ): Promise<MeetingAnalysis>
  streamCoachingAlerts(
    segment: TranscriptSegment,
    context: CallContext
  ): AsyncIterable<CoachingAlert>
}

// ─────────────────────────────────────────────────────────────────
// Deepgram transcription provider
// ─────────────────────────────────────────────────────────────────

export class DeepgramTranscriptionProvider implements TranscriptionProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async *transcribeStream(audioStream: Readable): AsyncIterable<TranscriptSegment> {
    const { createClient } = await import('@deepgram/sdk')
    const deepgram = createClient(this.apiKey)

    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en',
      smart_format: true,
      diarize: true,
      utterance_end_ms: 1000,
      interim_results: false,
    })

    const segments: TranscriptSegment[] = []
    let resolve: ((val: IteratorResult<TranscriptSegment>) => void) | null = null
    const queue: TranscriptSegment[] = []

    connection.on('Transcript', (data: any) => {
      const alt = data?.channel?.alternatives?.[0]
      if (!alt?.transcript) return
      const segment: TranscriptSegment = {
        text: alt.transcript,
        startMs: Math.round((alt.words?.[0]?.start ?? 0) * 1000),
        endMs: Math.round((alt.words?.at(-1)?.end ?? 0) * 1000),
        speakerId: String(alt.words?.[0]?.speaker ?? ''),
        confidence: alt.confidence,
      }
      if (resolve) {
        resolve({ value: segment, done: false })
        resolve = null
      } else {
        queue.push(segment)
      }
    })

    audioStream.on('data', (chunk: Buffer) => connection.send(chunk))
    audioStream.on('end', () => connection.requestClose())

    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!
      } else {
        const result = await new Promise<IteratorResult<TranscriptSegment>>((res) => {
          resolve = res
          connection.on('close', () => res({ value: undefined as any, done: true }))
        })
        if (result.done) break
        yield result.value
      }
    }
  }

  async transcribeFile(audioUrl: string): Promise<TranscriptSegment[]> {
    const { createClient } = await import('@deepgram/sdk')
    const deepgram = createClient(this.apiKey)
    const { result } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      { model: 'nova-2', diarize: true, smart_format: true, utterances: true }
    )
    return (result?.results?.utterances ?? []).map((u: any) => ({
      text: u.transcript,
      startMs: Math.round(u.start * 1000),
      endMs: Math.round(u.end * 1000),
      speakerId: String(u.speaker),
      confidence: u.confidence,
    }))
  }
}

// ─────────────────────────────────────────────────────────────────
// OpenAI Whisper transcription provider
// ─────────────────────────────────────────────────────────────────

export class WhisperTranscriptionProvider implements TranscriptionProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  // Whisper does not support streaming — buffer the full stream then transcribe
  async *transcribeStream(audioStream: Readable): AsyncIterable<TranscriptSegment> {
    const chunks: Buffer[] = []
    for await (const chunk of audioStream) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)
    const { createReadStream } = await import('fs')
    const { writeFileSync, unlinkSync } = await import('fs')
    const tmp = `/tmp/audio-${Date.now()}.webm`
    writeFileSync(tmp, buffer)
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: this.apiKey })
    const resp = await client.audio.transcriptions.create({
      file: createReadStream(tmp) as any,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })
    unlinkSync(tmp)
    for (const seg of (resp as any).segments ?? []) {
      yield {
        text: seg.text,
        startMs: Math.round(seg.start * 1000),
        endMs: Math.round(seg.end * 1000),
        confidence: seg.no_speech_prob ? 1 - seg.no_speech_prob : undefined,
      }
    }
  }

  async transcribeFile(audioUrl: string): Promise<TranscriptSegment[]> {
    const segments: TranscriptSegment[] = []
    const { Readable } = await import('stream')
    const resp = await fetch(audioUrl)
    const stream = Readable.fromWeb(resp.body as any)
    for await (const seg of this.transcribeStream(stream)) segments.push(seg)
    return segments
  }
}

// ─────────────────────────────────────────────────────────────────
// Anthropic analysis provider
// ─────────────────────────────────────────────────────────────────

export class AnthropicAnalysisProvider implements AnalysisProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async analyzeMeeting(
    segments: TranscriptSegment[],
    context: MeetingContext
  ): Promise<MeetingAnalysis> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: this.apiKey })

    const transcript = segments.map((s) => `[${s.speakerId ?? 'Unknown'}]: ${s.text}`).join('\n')

    const talkTime: Record<string, number> = {}
    for (const seg of segments) {
      const id = seg.speakerId ?? 'Unknown'
      talkTime[id] = (talkTime[id] ?? 0) + Math.round((seg.endMs - seg.startMs) / 1000)
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are an expert sales call analyst. Analyze the following sales call transcript and return a JSON object.

Meeting: "${context.title}"
Platform: ${context.platform ?? 'unknown'}
Host: ${context.hostEmail ?? 'unknown'}

TRANSCRIPT:
${transcript}

Return ONLY a valid JSON object with this exact shape:
{
  "summary": "2-3 paragraph executive summary",
  "keyTopics": ["topic1", "topic2"],
  "nextSteps": "bullet points of agreed next steps",
  "sentiment": "positive|neutral|negative",
  "dealScore": 0-100,
  "actionItems": [{"text": "...", "assignee": "...", "dueDate": "YYYY-MM-DD or null"}],
  "dealSignals": [{"type": "OBJECTION|BUYING_SIGNAL|COMPETITOR_MENTION|PRICING_DISCUSSION|TIMELINE_DISCUSSION|DECISION_MAKER_IDENTIFIED|NEXT_STEP_AGREED", "text": "...", "speaker": "...", "timestampMs": 0, "confidence": 0.9}]
}`,
        },
      ],
    })

    const raw = (message.content[0] as any).text
    const json = raw.match(/\{[\s\S]*\}/)?.[0]
    const parsed = JSON.parse(json!)
    return { ...parsed, talkTime }
  }

  async *streamCoachingAlerts(
    segment: TranscriptSegment,
    context: CallContext
  ): AsyncIterable<CoachingAlert> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: this.apiKey })

    const recent = context.recentSegments
      .slice(-10)
      .map((s) => `[${s.speakerId ?? 'Unknown'}]: ${s.text}`)
      .join('\n')

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are a real-time sales coach. Based on the last few moments of a sales call, provide ONE brief coaching suggestion if needed. If no action is needed, respond with "NONE".

Recent conversation:
${recent}

Latest: [${segment.speakerId ?? 'Unknown'}]: ${segment.text}

If you have a suggestion, respond with JSON: {"text": "issue description", "suggestion": "what to say/do", "severity": "INFO|WARNING|CRITICAL"}
Otherwise respond with: NONE`,
        },
      ],
    })

    let full = ''
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        full += chunk.delta.text
      }
    }

    if (full.trim() === 'NONE') return
    try {
      const json = full.match(/\{[\s\S]*\}/)?.[0]
      if (!json) return
      const alert = JSON.parse(json)
      yield { ...alert, triggeredAt: new Date().toISOString() }
    } catch {
      // malformed — skip
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// OpenAI analysis provider
// ─────────────────────────────────────────────────────────────────

export class OpenAIAnalysisProvider implements AnalysisProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async analyzeMeeting(
    segments: TranscriptSegment[],
    context: MeetingContext
  ): Promise<MeetingAnalysis> {
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: this.apiKey })

    const transcript = segments.map((s) => `[${s.speakerId ?? 'Unknown'}]: ${s.text}`).join('\n')
    const talkTime: Record<string, number> = {}
    for (const seg of segments) {
      const id = seg.speakerId ?? 'Unknown'
      talkTime[id] = (talkTime[id] ?? 0) + Math.round((seg.endMs - seg.startMs) / 1000)
    }

    const resp = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales call analyst. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `Analyze this sales call transcript for meeting "${context.title}" and return a JSON with: summary, keyTopics (array), nextSteps, sentiment (positive|neutral|negative), dealScore (0-100), actionItems (array of {text, assignee, dueDate}), dealSignals (array of {type, text, speaker, timestampMs, confidence}).\n\nTRANSCRIPT:\n${transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const parsed = JSON.parse(resp.choices[0].message.content ?? '{}')
    return { ...parsed, talkTime }
  }

  async *streamCoachingAlerts(
    segment: TranscriptSegment,
    context: CallContext
  ): AsyncIterable<CoachingAlert> {
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: this.apiKey })

    const recent = context.recentSegments
      .slice(-10)
      .map((s) => `[${s.speakerId ?? 'Unknown'}]: ${s.text}`)
      .join('\n')

    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'You are a real-time sales coach. Respond with JSON or NONE.',
        },
        {
          role: 'user',
          content: `Recent call:\n${recent}\nLatest: ${segment.text}\n\nCoaching suggestion needed? JSON {text, suggestion, severity: INFO|WARNING|CRITICAL} or NONE.`,
        },
      ],
    })

    let full = ''
    for await (const chunk of stream) {
      full += chunk.choices[0]?.delta?.content ?? ''
    }

    if (full.trim() === 'NONE') return
    try {
      const json = full.match(/\{[\s\S]*\}/)?.[0]
      if (!json) return
      yield { ...JSON.parse(json), triggeredAt: new Date().toISOString() }
    } catch {
      // malformed — skip
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Factory functions — provider selected from env vars
// ─────────────────────────────────────────────────────────────────

export function getTranscriptionProvider(): TranscriptionProvider {
  const provider = process.env.TRANSCRIPTION_PROVIDER ?? 'deepgram'
  switch (provider) {
    case 'deepgram': {
      const key = process.env.DEEPGRAM_API_KEY
      if (!key) throw new Error('DEEPGRAM_API_KEY is not set')
      return new DeepgramTranscriptionProvider(key)
    }
    case 'whisper': {
      const key = process.env.OPENAI_API_KEY
      if (!key) throw new Error('OPENAI_API_KEY is not set')
      return new WhisperTranscriptionProvider(key)
    }
    default:
      throw new Error(`Unknown TRANSCRIPTION_PROVIDER: ${provider}`)
  }
}

export function getAnalysisProvider(): AnalysisProvider {
  const provider = process.env.ANALYSIS_PROVIDER ?? 'anthropic'
  switch (provider) {
    case 'anthropic': {
      const key = process.env.ANTHROPIC_API_KEY
      if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
      return new AnthropicAnalysisProvider(key)
    }
    case 'openai': {
      const key = process.env.OPENAI_API_KEY
      if (!key) throw new Error('OPENAI_API_KEY is not set')
      return new OpenAIAnalysisProvider(key)
    }
    default:
      throw new Error(`Unknown ANALYSIS_PROVIDER: ${provider}`)
  }
}

export type { TranscriptSegment, MeetingContext, MeetingAnalysis, CoachingAlert, CallContext }
