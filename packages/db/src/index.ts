export { PrismaClient } from '@prisma/client'
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
} from '@prisma/client'
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
} from '@prisma/client'

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
