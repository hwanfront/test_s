/**
 * Google OAuth2 Provider Configuration (Task T078)
 * 
 * Implements Google OAuth2 authentication provider configuration
 * for NextAuth.js integration following Feature-Sliced Design
 */

import GoogleProvider from 'next-auth/providers/google'
import type { GoogleProfile as NextAuthGoogleProfile } from 'next-auth/providers/google'

/**
 * Extended Google OAuth2 user profile structure
 */
export interface GoogleProfile extends NextAuthGoogleProfile {
  locale?: string
}

/**
 * Google OAuth2 provider configuration with environment variables
 * Ready-to-use configuration for NextAuth providers array
 */
export const googleOAuthProvider = GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  
  // Additional security options
  checks: ['pkce', 'state'],
  
  // Custom authorization parameters
  authorization: {
    params: {
      prompt: 'consent',
      access_type: 'offline',
      response_type: 'code',
      scope: 'openid email profile'
    }
  }
})

/**
 * Google OAuth2 validation utilities
 */
export const GoogleOAuthUtils = {
  /**
   * Validates Google OAuth2 environment variables
   */
  validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!process.env.GOOGLE_CLIENT_ID) {
      errors.push('GOOGLE_CLIENT_ID environment variable is required')
    }
    
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      errors.push('GOOGLE_CLIENT_SECRET environment variable is required')
    }
    
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.length < 10) {
      errors.push('GOOGLE_CLIENT_ID appears to be invalid')
    }
    
    if (process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.length < 10) {
      errors.push('GOOGLE_CLIENT_SECRET appears to be invalid')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  /**
   * Validates Google OAuth2 profile data
   */
  validateProfile(profile: any): profile is GoogleProfile {
    return (
      typeof profile === 'object' &&
      typeof profile.sub === 'string' &&
      typeof profile.email === 'string' &&
      typeof profile.name === 'string' &&
      typeof profile.email_verified === 'boolean'
    )
  },
  
  /**
   * Extracts user information from Google profile
   */
  extractUserInfo(profile: GoogleProfile) {
    return {
      providerId: 'google',
      providerUserId: profile.sub,
      email: profile.email,
      name: profile.name,
      firstName: profile.given_name,
      lastName: profile.family_name,
      profileImage: profile.picture,
      emailVerified: profile.email_verified,
      locale: profile.locale
    }
  },
  
  /**
   * Gets Google OAuth2 authorization URL with custom parameters
   */
  getAuthorizationUrl(baseUrl: string, callbackUrl: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: callbackUrl,
      scope: 'openid email profile',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: Math.random().toString(36).substring(7)
    })
    
    return `https://accounts.google.com/oauth/authorize?${params.toString()}`
  },
  
  /**
   * Exchanges authorization code for access token
   */
  async exchangeCodeForToken(code: string, callbackUrl: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl
      })
    })
    
    if (!response.ok) {
      throw new GoogleOAuthError(
        'Token exchange failed',
        GoogleOAuthErrorCodes.INVALID_GRANT,
        new Error(`HTTP ${response.status}: ${response.statusText}`)
      )
    }
    
    const tokens = await response.json()
    
    if (!tokens.access_token || !tokens.id_token) {
      throw new GoogleOAuthError(
        'Missing required tokens',
        GoogleOAuthErrorCodes.INVALID_GRANT
      )
    }
    
    return tokens
  },
  
  /**
   * Fetches user profile using access token
   */
  async fetchUserProfile(accessToken: string): Promise<GoogleProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    
    if (!response.ok) {
      throw new GoogleOAuthError(
        'Failed to fetch user profile',
        GoogleOAuthErrorCodes.PROFILE_FETCH_FAILED,
        new Error(`HTTP ${response.status}: ${response.statusText}`)
      )
    }
    
    const profile = await response.json()
    
    if (!this.validateProfile(profile)) {
      throw new GoogleOAuthError(
        'Invalid profile data received',
        GoogleOAuthErrorCodes.INVALID_PROFILE
      )
    }
    
    return profile
  }
}

/**
 * Google OAuth2 error handling
 */
export class GoogleOAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'GoogleOAuthError'
  }
}

/**
 * Google OAuth2 error codes
 */
export const GoogleOAuthErrorCodes = {
  INVALID_CLIENT: 'invalid_client',
  INVALID_GRANT: 'invalid_grant',
  INVALID_SCOPE: 'invalid_scope',
  ACCESS_DENIED: 'access_denied',
  PROFILE_FETCH_FAILED: 'profile_fetch_failed',
  INVALID_PROFILE: 'invalid_profile',
  MISSING_ENVIRONMENT: 'missing_environment'
} as const

export type GoogleOAuthErrorCode = typeof GoogleOAuthErrorCodes[keyof typeof GoogleOAuthErrorCodes]