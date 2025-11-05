/**
 * Environment Configuration Validation
 * 
 * Validates required environment variables for OAuth2 and application functionality
 * Provides helpful error messages for missing configuration
 */

import { z } from 'zod'

/**
 * Environment configuration schema
 */
const envSchema = z.object({
  // Database (Supabase)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anonymous key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // AI Analysis (Google Gemini)
  GOOGLE_GEMINI_API_KEY: z.string().min(1, 'Google Gemini API key is required'),

  // Authentication (NextAuth.js)
  NEXTAUTH_URL: z.string().url('Invalid NextAuth URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),

  // OAuth2 Providers
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google OAuth client ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google OAuth client secret is required'),
  NAVER_CLIENT_ID: z.string().optional(),
  NAVER_CLIENT_SECRET: z.string().optional(),

  // Optional
  SENTRY_DSN: z.string().optional(),

  // System
  NODE_ENV: z.enum(['development', 'production', 'test'])
})

export type EnvConfig = z.infer<typeof envSchema>

/**
 * Validate environment variables
 */
export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.code === 'invalid_type' ? 'undefined' : 'invalid'
      }))

      console.error('\n❌ Environment Configuration Error:')
      console.error('Missing or invalid environment variables:\n')
      
      missingVars.forEach(({ field, message, value }) => {
        console.error(`  ${field}: ${message} (current: ${value})`)
      })

      console.error('\n📋 Required environment variables:')
      console.error('  • NEXT_PUBLIC_SUPABASE_URL')
      console.error('  • NEXT_PUBLIC_SUPABASE_ANON_KEY')
      console.error('  • SUPABASE_SERVICE_ROLE_KEY')
      console.error('  • GOOGLE_GEMINI_API_KEY')
      console.error('  • NEXTAUTH_URL (e.g., http://localhost:3000)')
      console.error('  • NEXTAUTH_SECRET (32+ character random string)')
      console.error('  • GOOGLE_CLIENT_ID')
      console.error('  • GOOGLE_CLIENT_SECRET')

      console.error('\n🔧 Setup steps:')
      console.error('  1. Copy .env.example to .env.local')
      console.error('  2. Fill in your actual values')
      console.error('  3. Restart the development server')
      console.error('\n📚 Documentation: Check README.md for detailed setup instructions\n')

      throw new Error('Environment validation failed')
    }
    
    throw error
  }
}

/**
 * Get validated environment configuration
 */
export const env = validateEnv()

/**
 * Check if OAuth providers are properly configured
 */
export function validateOAuthConfig(): {
  google: boolean
  naver: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  const googleConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && 
    process.env.GOOGLE_CLIENT_SECRET
  )
  
  const naverConfigured = !!(
    process.env.NAVER_CLIENT_ID && 
    process.env.NAVER_CLIENT_SECRET
  )

  if (!googleConfigured) {
    errors.push('Google OAuth not configured: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET')
  }

  if (!naverConfigured) {
    errors.push('Naver OAuth not configured: Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET')
  }

  return {
    google: googleConfigured,
    naver: naverConfigured,
    errors
  }
}

/**
 * Generate NextAuth secret if missing
 */
export function generateNextAuthSecret(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Development environment setup helper
 */
export function setupDevelopmentEnv(): void {
  if (process.env.NODE_ENV !== 'development') return

  console.log('🔧 Development Environment Setup:')
  
  const oauthStatus = validateOAuthConfig()
  
  if (oauthStatus.google) {
    console.log('  ✅ Google OAuth configured')
  } else {
    console.log('  ❌ Google OAuth not configured')
  }
  
  if (oauthStatus.naver) {
    console.log('  ✅ Naver OAuth configured')
  } else {
    console.log('  ⚠️  Naver OAuth not configured (optional)')
  }

  if (!process.env.NEXTAUTH_SECRET) {
    console.log('  ⚠️  NEXTAUTH_SECRET not set - generating random secret')
    console.log('     Add this to your .env.local:')
    console.log(`     NEXTAUTH_SECRET=${generateNextAuthSecret()}`)
  }

  if (!process.env.NEXTAUTH_URL) {
    console.log('  ⚠️  NEXTAUTH_URL not set - defaulting to http://localhost:3000')
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  }

  console.log('')
}

// Run setup in development
if (process.env.NODE_ENV === 'development') {
  setupDevelopmentEnv()
}