import { PrismaAdapter } from '@next-auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import EmailProvider from 'next-auth/providers/email'
import { prisma } from '@call-platform/db'
import { slugify } from './utils'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    newUser: '/onboarding',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { access_type: 'offline', prompt: 'consent' } },
    }),
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: 'common',
    }),
    ...(process.env.EMAIL_SERVER_HOST
      ? [
          EmailProvider({
            server: {
              host: process.env.EMAIL_SERVER_HOST,
              port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
              auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
              },
            },
            from: process.env.EMAIL_FROM ?? 'noreply@callplatform.io',
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        // Attach the user's primary org
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: user.id },
          include: { organization: true },
          orderBy: { joinedAt: 'asc' },
        })
        token.orgId = membership?.orgId ?? null
        token.orgSlug = membership?.organization.slug ?? null
        token.role = membership?.role ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.orgId = token.orgId as string | null
        session.user.orgSlug = token.orgSlug as string | null
        session.user.role = token.role as string | null
      }
      return session
    },
    async signIn({ user, account }) {
      if (!user.email) return false

      // Auto-provision org for brand-new users (handled in onboarding)
      // Just allow sign-in here
      return true
    },
  },
  events: {
    async createUser({ user }) {
      // New user — create a default personal org
      if (!user.email) return
      const name = user.name ?? user.email.split('@')[0]
      const baseSlug = slugify(name)
      let slug = baseSlug
      let i = 1
      while (await prisma.organization.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${i++}`
      }
      const org = await prisma.organization.create({
        data: {
          name: `${name}'s Workspace`,
          slug,
          members: {
            create: { userId: user.id!, role: 'OWNER' },
          },
          subscription: {
            create: { plan: 'FREE', status: 'ACTIVE' },
          },
        },
      })
    },
  },
}
