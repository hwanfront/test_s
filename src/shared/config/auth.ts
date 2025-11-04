import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createServerClient } from '@/shared/config/database'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    }),
    // Note: Naver provider will be added when implementing Korean authentication
    // NaverProvider({
    //   clientId: process.env.NAVER_CLIENT_ID!,
    //   clientSecret: process.env.NAVER_CLIENT_SECRET!,
    // }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account && user) {
        token.userId = user.id
        token.provider = account.provider
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.userId as string
        session.accessToken = token.accessToken as string
        session.provider = token.provider as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false
      
      try {
        const supabase = createServerClient()
        
        // Check if user exists in our database
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email!)
          .eq('provider', account.provider)
          .single()
        
        if (!existingUser) {
          // Create new user in our database
          const { error } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email!,
              name: user.name,
              avatar_url: user.image,
              provider: account.provider as 'google' | 'naver',
              provider_id: account.providerAccountId,
            })
          
          if (error) {
            console.error('Error creating user:', error)
            return false
          }
        }
        
        return true
      } catch (error) {
        console.error('Sign in error:', error)
        return false
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
}