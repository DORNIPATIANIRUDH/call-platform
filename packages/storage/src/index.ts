import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { UploadResult } from '@call-platform/types'
import type { Readable } from 'stream'

// ─────────────────────────────────────────────────────────────────
// Storage interface
// ─────────────────────────────────────────────────────────────────

export interface StorageProvider {
  upload(key: string, data: Buffer | Readable, mimeType: string): Promise<UploadResult>
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>
  delete(key: string): Promise<void>
}

// ─────────────────────────────────────────────────────────────────
// Supabase Storage provider
// ─────────────────────────────────────────────────────────────────

export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient
  private bucket: string

  constructor(url: string, serviceRoleKey: string, bucket: string) {
    this.client = createClient(url, serviceRoleKey)
    this.bucket = bucket
  }

  async upload(key: string, data: Buffer | Readable, mimeType: string): Promise<UploadResult> {
    let buffer: Buffer
    if (Buffer.isBuffer(data)) {
      buffer = data
    } else {
      const chunks: Buffer[] = []
      for await (const chunk of data) chunks.push(chunk)
      buffer = Buffer.concat(chunks)
    }

    const { error } = await this.client.storage.from(this.bucket).upload(key, buffer, {
      contentType: mimeType,
      upsert: true,
    })
    if (error) throw new Error(`Supabase upload failed: ${error.message}`)

    const { data: urlData } = this.client.storage.from(this.bucket).getPublicUrl(key)

    return {
      storageKey: key,
      storageUrl: urlData.publicUrl,
      sizeBytes: buffer.byteLength,
      mimeType,
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresInSeconds)
    if (error) throw new Error(`Supabase signed URL failed: ${error.message}`)
    return data.signedUrl
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key])
    if (error) throw new Error(`Supabase delete failed: ${error.message}`)
  }
}

// ─────────────────────────────────────────────────────────────────
// Factory — selected from env
// ─────────────────────────────────────────────────────────────────

export function getStorageProvider(): StorageProvider {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'call-recordings'
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  return new SupabaseStorageProvider(url, key, bucket)
}

// ─────────────────────────────────────────────────────────────────
// Storage key helpers
// ─────────────────────────────────────────────────────────────────

export function recordingKey(orgId: string, meetingId: string, ext = 'webm'): string {
  return `orgs/${orgId}/meetings/${meetingId}/recording.${ext}`
}
