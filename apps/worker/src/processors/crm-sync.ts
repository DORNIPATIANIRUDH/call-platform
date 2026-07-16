import type { Job } from 'bullmq'
import type { CrmSyncJobData } from '@call-platform/types'
import { prisma } from '@call-platform/db'
import { HubSpotClient, SalesforceClient } from '@call-platform/integrations'

export async function handleCrmSync(job: Job<CrmSyncJobData>) {
  const { meetingId, orgId, platforms } = job.data

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { analysis: true, actionItems: true },
  })
  if (!meeting?.analysis) throw new Error(`No analysis for meeting ${meetingId}`)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.callplatform.io'
  const meetingUrl = `${appUrl}/dashboard/meetings/${meetingId}`

  for (const platform of platforms) {
    const integration = await prisma.integration.findUnique({
      where: { orgId_platform: { orgId, platform } },
    })
    if (!integration) continue

    if (platform === 'HUBSPOT') {
      const client = new HubSpotClient(integration.accessToken)

      let contactId: string | null = null
      if (meeting.hostEmail) {
        contactId = await client.findContactByEmail(meeting.hostEmail)
        if (!contactId) {
          contactId = await client.createOrUpdateContact(meeting.hostEmail, {
            firstname: meeting.hostEmail.split('@')[0],
          })
        }
      }

      if (contactId) {
        await client.logCallActivity(contactId, meeting.title, meeting.analysis as any, meetingUrl)

        for (const item of meeting.actionItems) {
          await client.createTask(contactId, item.text, item.dueDate?.toISOString().slice(0, 10))
          await prisma.actionItem.update({ where: { id: item.id }, data: { crmTaskId: `hubspot:${contactId}` } })
        }
      }
    }

    if (platform === 'SALESFORCE') {
      const instanceUrl = (integration.metadata as any)?.instance_url ?? process.env.SALESFORCE_INSTANCE_URL!
      const client = new SalesforceClient(integration.accessToken, instanceUrl)

      let contactId: string | null = null
      if (meeting.hostEmail) {
        contactId = await client.findContactByEmail(meeting.hostEmail)
      }

      if (contactId) {
        await client.logCallToOpportunity(contactId, meeting.title, meeting.analysis as any, meetingUrl)

        for (const item of meeting.actionItems) {
          await client.createTask(contactId, null, item.text, item.dueDate?.toISOString().slice(0, 10))
          await prisma.actionItem.update({ where: { id: item.id }, data: { crmTaskId: `salesforce:${contactId}` } })
        }
      }
    }
  }

  await prisma.analysis.update({
    where: { meetingId },
    data: { crmSynced: true, crmSyncedAt: new Date() },
  })
}
