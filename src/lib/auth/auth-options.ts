import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { HttpsProxyAgent } from 'https-proxy-agent'

// When running behind a sandbox/proxy that blocks direct outbound DNS,
// route OAuth token-exchange requests through the available HTTPS proxy.
// On a regular VPS (no HTTPS_PROXY set), this is a no-op.
const oauthAgent = process.env.HTTPS_PROXY
  ? new HttpsProxyAgent(process.env.HTTPS_PROXY)
  : undefined

// Real credentials are present when they exist and are not the placeholder values
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const googleConfigured =
  GOOGLE_CLIENT_ID.length > 0 &&
  !GOOGLE_CLIENT_ID.startsWith('your-google') &&
  GOOGLE_CLIENT_SECRET.length > 0 &&
  !GOOGLE_CLIENT_SECRET.startsWith('your-google')

export const GOOGLE_OAUTH_ENABLED = googleConfigured

// The exact redirect URI that must be registered in Google Cloud Console:
//   {NEXTAUTH_URL}/api/auth/callback/google
// e.g. https://sudandna.com/api/auth/callback/google

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn:  '/login',
    signOut: '/login',
    error:   '/login',
  },
  providers: [
    ...(googleConfigured
      ? [GoogleProvider({
          clientId:     GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          httpOptions:  oauthAgent ? { agent: oauthAgent } : {},
          authorization: {
            params: {
              prompt: 'consent',
              access_type: 'offline',
              response_type: 'code',
            },
          },
          profile(profile) {
            return {
              id:    profile.sub,
              name:  profile.name,
              email: profile.email,
              image: profile.picture,
              role:  'MEMBER',
            }
          },
        })]
      : []),

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
        try {
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
          // Only create welcome notification for brand-new users (no existing notification)
          const existing = await prisma.notification.findFirst({
            where: { userId: user.id, type: 'WELCOME' },
          })
          if (!existing) {
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
        } catch (error) {
          console.error('[Auth] signIn callback error (non-fatal):', error)
          // Do not block sign-in due to post-auth record creation failures
        }
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
