/**
 * Naver OAuth2 Provider Configuration (Task T079)
 * 
 * Implements Naver OAuth2 authentication provider configuration
 * for NextAuth.js integration following Feature-Sliced Design
 */

import type { OAuthConfig, OAuthUserConfig } from 'next-auth/providers/oauth'

/**
 * Naver OAuth2 user profile structure
 */
export interface NaverProfile {
  resultcode: string
  message: string
  response: {
    id: string
    nickname: string
    name: string
    email: string
    gender: 'F' | 'M' | 'U'
    age: string
    birthday: string
    profile_image: string
    birthyear: string
    mobile: string
  }
}

/**
 * Naver OAuth2 provider configuration for NextAuth.js
 * Implements secure authentication with proper token handling
 */
export function NaverProvider(
  options: OAuthUserConfig<NaverProfile>
): OAuthConfig<NaverProfile> {
  return {
    id: 'naver',
    name: 'Naver',
    type: 'oauth',
    version: '2.0',
    
    // OAuth2 endpoints for Naver
    authorization: {
      url: 'https://nid.naver.com/oauth2.0/authorize',
      params: {
        response_type: 'code',
        scope: ''
      }
    },
    
    token: 'https://nid.naver.com/oauth2.0/token',
    userinfo: 'https://openapi.naver.com/v1/nid/me',
    
    // Profile mapping for NextAuth user object
    profile(profile: NaverProfile) {
      if (profile.resultcode !== '00') {
        throw new Error(`Naver profile fetch failed: ${profile.message}`)
      }
      
      const user = profile.response
      
      return {
        id: user.id,
        name: user.name || user.nickname,
        email: user.email,
        image: user.profile_image,
        emailVerified: null // Naver doesn't provide email verification status
      }
    },
    
    // Provider styling for sign-in page
    style: {
      logo: '/icons/naver-logo.png',
      logoDark: '/icons/naver-logo.png',
      bg: '#03c75a',
      text: '#fff',
      bgDark: '#03c75a',
      textDark: '#fff'
    },
    
    // Merge with user options
    ...options
  }
}

/**
 * Naver OAuth2 provider configuration with environment variables
 * Ready-to-use configuration for NextAuth providers array
 */
export const naverOAuthProvider = NaverProvider({
  clientId: process.env.NAVER_CLIENT_ID!,
  clientSecret: process.env.NAVER_CLIENT_SECRET!,
  
  // Additional security options
  checks: ['state'],
  
  // Custom authorization parameters
  authorization: {
    params: {
      response_type: 'code',
      scope: '' // Naver doesn't use scopes
    }
  }
})

/**
 * Naver OAuth2 validation utilities
 */
export const NaverOAuthUtils = {
  /**
   * Validates Naver OAuth2 environment variables
   */
  validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!process.env.NAVER_CLIENT_ID) {
      errors.push('NAVER_CLIENT_ID environment variable is required')
    }
    
    if (!process.env.NAVER_CLIENT_SECRET) {
      errors.push('NAVER_CLIENT_SECRET environment variable is required')
    }
    
    if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_ID.length < 10) {
      errors.push('NAVER_CLIENT_ID appears to be invalid')
    }
    
    if (process.env.NAVER_CLIENT_SECRET && process.env.NAVER_CLIENT_SECRET.length < 10) {
      errors.push('NAVER_CLIENT_SECRET appears to be invalid')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  /**
   * Validates Naver OAuth2 profile data
   */
  validateProfile(profile: any): profile is NaverProfile {
    return (
      typeof profile === 'object' &&
      typeof profile.resultcode === 'string' &&
      typeof profile.message === 'string' &&
      typeof profile.response === 'object' &&
      typeof profile.response.id === 'string' &&
      typeof profile.response.email === 'string'
    )
  },
  
  /**
   * Extracts user information from Naver profile
   */
  extractUserInfo(profile: NaverProfile) {
    if (profile.resultcode !== '00') {
      throw new NaverOAuthError(
        `Profile fetch failed: ${profile.message}`,
        NaverOAuthErrorCodes.PROFILE_FETCH_FAILED
      )
    }
    
    const user = profile.response
    
    return {
      providerId: 'naver',
      providerUserId: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      profileImage: user.profile_image,
      gender: user.gender,
      age: user.age,
      birthday: user.birthday,
      birthyear: user.birthyear,
      mobile: user.mobile
    }
  },
  
  /**
   * Gets Naver OAuth2 authorization URL with custom parameters
   */
  getAuthorizationUrl(baseUrl: string, callbackUrl: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.NAVER_CLIENT_ID!,
      redirect_uri: callbackUrl,
      state: Math.random().toString(36).substring(7)
    })
    
    return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`
  },
  
  /**
   * Exchanges authorization code for access token
   */
  async exchangeCodeForToken(code: string, callbackUrl: string, state?: string) {
    const response = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code,
        redirect_uri: callbackUrl,
        ...(state && { state })
      })
    })
    
    if (!response.ok) {
      throw new NaverOAuthError(
        'Token exchange failed',
        NaverOAuthErrorCodes.INVALID_GRANT,
        new Error(`HTTP ${response.status}: ${response.statusText}`)
      )
    }
    
    const tokens = await response.json()
    
    if (!tokens.access_token) {
      throw new NaverOAuthError(
        'Missing access token',
        NaverOAuthErrorCodes.INVALID_GRANT
      )
    }
    
    if (tokens.error) {
      throw new NaverOAuthError(
        `Token error: ${tokens.error_description || tokens.error}`,
        NaverOAuthErrorCodes.INVALID_GRANT
      )
    }
    
    return tokens
  },
  
  /**
   * Fetches user profile using access token
   */
  async fetchUserProfile(accessToken: string): Promise<NaverProfile> {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    
    if (!response.ok) {
      throw new NaverOAuthError(
        'Failed to fetch user profile',
        NaverOAuthErrorCodes.PROFILE_FETCH_FAILED,
        new Error(`HTTP ${response.status}: ${response.statusText}`)
      )
    }
    
    const profile = await response.json()
    
    if (!this.validateProfile(profile)) {
      throw new NaverOAuthError(
        'Invalid profile data received',
        NaverOAuthErrorCodes.INVALID_PROFILE
      )
    }
    
    if (profile.resultcode !== '00') {
      throw new NaverOAuthError(
        `Profile API error: ${profile.message}`,
        NaverOAuthErrorCodes.PROFILE_FETCH_FAILED
      )
    }
    
    return profile
  }
}

/**
 * Naver OAuth2 error handling
 */
export class NaverOAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'NaverOAuthError'
  }
}

/**
 * Naver OAuth2 error codes
 */
export const NaverOAuthErrorCodes = {
  INVALID_CLIENT: 'invalid_client',
  INVALID_GRANT: 'invalid_grant',
  ACCESS_DENIED: 'access_denied',
  PROFILE_FETCH_FAILED: 'profile_fetch_failed',
  INVALID_PROFILE: 'invalid_profile',
  MISSING_ENVIRONMENT: 'missing_environment'
} as const

export type NaverOAuthErrorCode = typeof NaverOAuthErrorCodes[keyof typeof NaverOAuthErrorCodes]

/**
 * Naver OAuth2 configuration helper
 */
export const NaverOAuthConfig = {
  /**
   * Creates complete Naver OAuth2 configuration
   */
  create(options?: {
    clientId?: string
    clientSecret?: string
    scope?: string
  }) {
    const clientId = options?.clientId || process.env.NAVER_CLIENT_ID
    const clientSecret = options?.clientSecret || process.env.NAVER_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      throw new NaverOAuthError(
        'Missing Naver OAuth2 credentials',
        NaverOAuthErrorCodes.MISSING_ENVIRONMENT
      )
    }
    
    return NaverProvider({
      clientId,
      clientSecret
    })
  },
  
  /**
   * Validates Naver OAuth2 configuration
   */
  validate(): boolean {
    const validation = NaverOAuthUtils.validateEnvironment()
    return validation.isValid
  },
  
  /**
   * Gets configuration errors
   */
  getConfigurationErrors(): string[] {
    const validation = NaverOAuthUtils.validateEnvironment()
    return validation.errors
  }
}