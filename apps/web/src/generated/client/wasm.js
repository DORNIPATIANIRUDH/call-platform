
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  image: 'image',
  emailVerified: 'emailVerified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  logoUrl: 'logoUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizationMemberScalarFieldEnum = {
  id: 'id',
  orgId: 'orgId',
  userId: 'userId',
  role: 'role',
  joinedAt: 'joinedAt'
};

exports.Prisma.OrganizationInviteScalarFieldEnum = {
  id: 'id',
  orgId: 'orgId',
  email: 'email',
  role: 'role',
  token: 'token',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  orgId: 'orgId',
  stripeCustomerId: 'stripeCustomerId',
  stripeSubscriptionId: 'stripeSubscriptionId',
  stripePriceId: 'stripePriceId',
  plan: 'plan',
  status: 'status',
  seatCount: 'seatCount',
  currentPeriodStart: 'currentPeriodStart',
  currentPeriodEnd: 'currentPeriodEnd',
  minutesUsed: 'minutesUsed',
  minutesLimit: 'minutesLimit',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.IntegrationScalarFieldEnum = {
  id: 'id',
  orgId: 'orgId',
  platform: 'platform',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  expiresAt: 'expiresAt',
  scope: 'scope',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MeetingScalarFieldEnum = {
  id: 'id',
  orgId: 'orgId',
  title: 'title',
  platform: 'platform',
  externalId: 'externalId',
  joinUrl: 'joinUrl',
  scheduledAt: 'scheduledAt',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  durationSeconds: 'durationSeconds',
  status: 'status',
  botStatus: 'botStatus',
  hostEmail: 'hostEmail',
  participantCount: 'participantCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RecordingScalarFieldEnum = {
  id: 'id',
  meetingId: 'meetingId',
  storageKey: 'storageKey',
  storageUrl: 'storageUrl',
  mimeType: 'mimeType',
  sizeBytes: 'sizeBytes',
  durationSec: 'durationSec',
  createdAt: 'createdAt'
};

exports.Prisma.TranscriptScalarFieldEnum = {
  id: 'id',
  meetingId: 'meetingId',
  speaker: 'speaker',
  speakerId: 'speakerId',
  text: 'text',
  startMs: 'startMs',
  endMs: 'endMs',
  confidence: 'confidence',
  createdAt: 'createdAt'
};

exports.Prisma.AnalysisScalarFieldEnum = {
  id: 'id',
  meetingId: 'meetingId',
  summary: 'summary',
  keyTopics: 'keyTopics',
  talkTime: 'talkTime',
  dealScore: 'dealScore',
  sentiment: 'sentiment',
  nextSteps: 'nextSteps',
  crmSynced: 'crmSynced',
  crmSyncedAt: 'crmSyncedAt',
  processingJob: 'processingJob',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActionItemScalarFieldEnum = {
  id: 'id',
  meetingId: 'meetingId',
  text: 'text',
  assignee: 'assignee',
  dueDate: 'dueDate',
  status: 'status',
  crmTaskId: 'crmTaskId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DealSignalScalarFieldEnum = {
  id: 'id',
  meetingId: 'meetingId',
  type: 'type',
  text: 'text',
  speaker: 'speaker',
  timestampMs: 'timestampMs',
  confidence: 'confidence',
  createdAt: 'createdAt'
};

exports.Prisma.CoachingAlertScalarFieldEnum = {
  id: 'id',
  meetingId: 'meetingId',
  text: 'text',
  suggestion: 'suggestion',
  severity: 'severity',
  triggeredAt: 'triggeredAt',
  dismissed: 'dismissed'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.MemberRole = exports.$Enums.MemberRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER'
};

exports.PlanTier = exports.$Enums.PlanTier = {
  FREE: 'FREE',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE'
};

exports.SubscriptionStatus = exports.$Enums.SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  TRIALING: 'TRIALING',
  INCOMPLETE: 'INCOMPLETE'
};

exports.IntegrationPlatform = exports.$Enums.IntegrationPlatform = {
  ZOOM: 'ZOOM',
  GOOGLE: 'GOOGLE',
  MICROSOFT: 'MICROSOFT',
  SLACK: 'SLACK',
  HUBSPOT: 'HUBSPOT',
  SALESFORCE: 'SALESFORCE'
};

exports.MeetingStatus = exports.$Enums.MeetingStatus = {
  SCHEDULED: 'SCHEDULED',
  BOT_JOINING: 'BOT_JOINING',
  IN_PROGRESS: 'IN_PROGRESS',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

exports.BotStatus = exports.$Enums.BotStatus = {
  IDLE: 'IDLE',
  JOINING: 'JOINING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR'
};

exports.JobStatus = exports.$Enums.JobStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

exports.ActionItemStatus = exports.$Enums.ActionItemStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE'
};

exports.DealSignalType = exports.$Enums.DealSignalType = {
  OBJECTION: 'OBJECTION',
  BUYING_SIGNAL: 'BUYING_SIGNAL',
  COMPETITOR_MENTION: 'COMPETITOR_MENTION',
  PRICING_DISCUSSION: 'PRICING_DISCUSSION',
  TIMELINE_DISCUSSION: 'TIMELINE_DISCUSSION',
  DECISION_MAKER_IDENTIFIED: 'DECISION_MAKER_IDENTIFIED',
  NEXT_STEP_AGREED: 'NEXT_STEP_AGREED'
};

exports.CoachingAlertSeverity = exports.$Enums.CoachingAlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
};

exports.Prisma.ModelName = {
  User: 'User',
  Account: 'Account',
  Session: 'Session',
  VerificationToken: 'VerificationToken',
  Organization: 'Organization',
  OrganizationMember: 'OrganizationMember',
  OrganizationInvite: 'OrganizationInvite',
  Subscription: 'Subscription',
  Integration: 'Integration',
  Meeting: 'Meeting',
  Recording: 'Recording',
  Transcript: 'Transcript',
  Analysis: 'Analysis',
  ActionItem: 'ActionItem',
  DealSignal: 'DealSignal',
  CoachingAlert: 'CoachingAlert'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
