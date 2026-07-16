export { PrismaClient } from './generated/client'
export type {
  User,
  Account,
  Session,
  Organization,
  OrganizationMember,
  OrganizationInvite,
  Subscription,
  Integration,
  Meeting,
  Recording,
  Transcript,
  Analysis,
  ActionItem,
  DealSignal,
  CoachingAlert,
  Prisma,
} from './generated/client'
export {
  MemberRole,
  IntegrationPlatform,
  MeetingStatus,
  BotStatus,
  JobStatus,
  PlanTier,
  SubscriptionStatus,
  ActionItemStatus,
  DealSignalType,
  CoachingAlertSeverity,
} from './generated/client'

import { PrismaClient } from './generated/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
