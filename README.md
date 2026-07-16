# CallPlatform — AI Sales Call Intelligence

A full-stack, multi-tenant SaaS platform for recording, transcribing, and analyzing sales calls — comparable to Gong/Quill Meetings. Built as a Turborepo monorepo.

---

## Architecture

```
apps/
  web/          Next.js 14 (App Router) — frontend + API routes  → Vercel
  worker/       BullMQ background workers (transcription, analysis, CRM sync)  → Railway
  bot/          Meeting bot service (Zoom, Google Meet, Teams)  → Railway
  extension/    Chrome MV3 browser extension (fallback audio capture)

packages/
  db/           Prisma schema + PrismaClient singleton
  ai/           Provider-agnostic transcription + analysis (Deepgram/Whisper, Claude/GPT-4)
  storage/      Supabase Storage adapter
  queue/        BullMQ queue + job type definitions
  integrations/ OAuth + API clients (Zoom, Google, Microsoft, Slack, HubSpot, Salesforce)
  types/        Shared TypeScript types
```

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (or [Neon](https://neon.tech) for serverless Postgres)
- Redis (or [Railway Redis](https://railway.app))

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Fill in your values — see .env.example for all variables
```

Minimum required to run locally:

```bash
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=any-random-string
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
REDIS_URL=redis://localhost:6379
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
TRANSCRIPTION_PROVIDER=deepgram
DEEPGRAM_API_KEY=...
ANALYSIS_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
```

### 4. Set up the database

```bash
pnpm db:migrate:dev        # run migrations
# or for production:
pnpm db:migrate
```

### 5. Run locally

```bash
# All services at once
pnpm dev

# Or individually:
pnpm --filter @call-platform/web dev       # http://localhost:3000
pnpm --filter @call-platform/worker dev    # BullMQ worker
pnpm --filter @call-platform/bot dev       # Bot service on :3002
```

---

## AI Providers

All AI providers are selected via environment variables — no code changes needed to switch.

| Env var | Options |
|---|---|
| `TRANSCRIPTION_PROVIDER` | `deepgram` (recommended, real-time) \| `whisper` (OpenAI, file-only) |
| `ANALYSIS_PROVIDER` | `anthropic` (Claude, recommended) \| `openai` (GPT-4o) |

---

## Integrations

Connect each integration from **Dashboard → Integrations**. OAuth tokens are stored per-organization in the `integrations` table.

| Integration | Purpose |
|---|---|
| **Zoom** | Auto-join meetings, import cloud recordings, receive webhooks |
| **Google Workspace** | Sync Google Calendar, join Google Meet via bot |
| **Microsoft 365** | Sync Outlook calendar, join Teams meetings |
| **Slack** | Post post-call summaries and action items |
| **HubSpot** | Log calls, create tasks, update contacts |
| **Salesforce** | Log call activity to opportunities, create tasks |

---

## Meeting Bot

The bot service (`apps/bot`) joins meetings using headless Chromium (Puppeteer):

- Receives a `JoinJob` from BullMQ (triggered by calendar webhook or manual request)
- Opens the meeting URL in a headless browser
- Captures audio via Chrome DevTools Protocol
- Streams 16kHz PCM audio to Deepgram in real-time
- Pushes transcript segments to the browser via Pusher
- On disconnect → triggers post-call analysis pipeline

**Note:** The bot requires a display environment for Puppeteer. The Docker image includes Chromium. For local development, a real browser window will open unless you have Xvfb configured.

---

## Browser Extension

`apps/extension/` is a Chrome Manifest V3 extension that captures audio from any meeting tab as a fallback when the bot cannot join.

To install in development:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `apps/extension/`

---

## Deployment

### Vercel (web)

```bash
# Link project
vercel link

# Set env vars in Vercel dashboard, then:
vercel deploy --prod
```

### Railway (worker + bot)

```bash
railway up --service worker
railway up --service bot
```

### Docker Compose (self-hosted)

```bash
cp .env.example .env  # fill in values
docker compose up -d
```

---

## Database Schema

Key models: `Organization` → `Meeting` → `Recording`, `Transcript`, `Analysis`, `ActionItem`, `DealSignal`, `CoachingAlert`

Full schema: [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma)

---

## Webhook Setup

| Webhook | URL | Purpose |
|---|---|---|
| Zoom | `https://your-domain/api/webhooks/zoom` | Trigger bot on `meeting.started` |
| Google Calendar | `https://your-domain/api/webhooks/google` | Detect upcoming meetings |
| Microsoft Graph | `https://your-domain/api/webhooks/teams` | Detect upcoming meetings |
| Stripe | `https://your-domain/api/webhooks/stripe` | Billing event sync |

---

## Contributing

1. Fork → branch → PR
2. Run `pnpm type-check` and `pnpm lint` before submitting
3. All database changes require a Prisma migration: `pnpm db:migrate:dev --name your-change`

---

## License

MIT
