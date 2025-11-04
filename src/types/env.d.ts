namespace NodeJS {
  interface ProcessEnv {
    // Database
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY: string

    // AI Analysis
    GOOGLE_GEMINI_API_KEY: string

    // Authentication
    NEXTAUTH_URL: string
    NEXTAUTH_SECRET: string

    // OAuth2 Providers
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    NAVER_CLIENT_ID: string
    NAVER_CLIENT_SECRET: string

    // Optional
    SENTRY_DSN?: string

    // System
    NODE_ENV: 'development' | 'production' | 'test'
  }
}