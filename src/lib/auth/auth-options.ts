import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn:  '/login',
    signOut: '/login',
    error:   '/login',
  },
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id:    profile.sub,
          name:  profile.name,
          email: profile.email,
          image: profile.picture,
          role:  'MEMBER',
        }
      },
    }),

    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { profile: true },
        })

        if (!user?.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        if (!user.isActive) throw new Error('Account is deactivated')

        // Log the access
        await prisma.auditLog.create({
          data: {
            userId:   user.id,
            action:   'LOGIN',
            resource: 'auth',
            metadata: { provider: 'credentials' },
          },
        })

        return {
          id:               user.id,
          email:            user.email,
          name:             user.name,
          image:            user.image,
          role:             user.role,
          preferredLanguage: user.preferredLanguage,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role             = (user as any).role || 'MEMBER'
        token.preferredLanguage = (user as any).preferredLanguage || 'ARABIC'
        token.userId           = user.id
      }
      if (trigger === 'update' && session) {
        token.name              = session.user.name
        token.preferredLanguage = session.user.preferredLanguage
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id               = token.userId as string
        ;(session.user as any).role            = token.role as string
        ;(session.user as any).preferredLanguage = token.preferredLanguage as string
      }
      return session
    },

    async signIn({ user, account }) {
      // Auto-create privacy settings & profile for OAuth signups
      if (account?.provider === 'google' && user.id) {
        await prisma.privacySettings.upsert({
          where:  { userId: user.id },
          update: {},
          create: {
            userId:        user.id,
            consentGiven:  true,
            consentDate:   new Date(),
          },
        })
        await prisma.userProfile.upsert({
          where:  { userId: user.id },
          update: {},
          create: { userId: user.id },
        })
        await prisma.notification.create({
          data: {
            userId:  user.id,
            type:    'WELCOME',
            title:   'Welcome to Sudanese Heritage Platform',
            message: 'Start by creating your first family tree or exploring the community.',
            link:    '/dashboard',
          },
        })
      }
      return true
    },
  },

  events: {
    async signOut({ token }) {
      if (token?.userId) {
        await prisma.auditLog.create({
          data: {
            userId:   token.userId as string,
            action:   'LOGOUT',
            resource: 'auth',
          },
        })
      }
    },
  },
}
