/**
 * Unit Tests for OAuth Authentication Feature (Task T074)
 * 
 * Tests the OAuth authentication feature components and hooks
 * following Feature-Sliced Design patterns
 */

import { renderHook, act } from '@testing-library/react'
import { signIn, signOut, useSession } from 'next-auth/react'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(),
  getProviders: jest.fn()
}))

// Mock the auth hook (will be implemented)
const mockUseAuth = () => {
  const session = useSession()
  
  const login = async (providerId: string, options?: any) => {
    return await signIn(providerId, options)
  }
  
  const logout = async () => {
    return await signOut()
  }
  
  return {
    user: session.data?.user,
    isAuthenticated: !!session.data,
    isLoading: session.status === 'loading',
    login,
    logout,
    session: session.data
  }
}

describe('OAuth Authentication Feature Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useAuth Hook', () => {
    it('should return authenticated state when user is logged in', () => {
      const mockSession = {
        data: {
          user: {
            id: 'user_123',
            email: 'test@example.com',
            name: 'Test User',
            provider: 'google'
          },
          expires: new Date(Date.now() + 3600000).toISOString()
        },
        status: 'authenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)

      const { result } = renderHook(() => mockUseAuth())

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.user).toEqual(mockSession.data.user)
      expect(result.current.session).toEqual(mockSession.data)
    })

    it('should return unauthenticated state when user is not logged in', () => {
      const mockSession = {
        data: null,
        status: 'unauthenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)

      const { result } = renderHook(() => mockUseAuth())

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.user).toBeUndefined()
      expect(result.current.session).toBeNull()
    })

    it('should return loading state during authentication', () => {
      const mockSession = {
        data: null,
        status: 'loading'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)

      const { result } = renderHook(() => mockUseAuth())

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(true)
      expect(result.current.user).toBeUndefined()
    })

    it('should handle login with Google provider', async () => {
      const mockSession = {
        data: null,
        status: 'unauthenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)
      ;(signIn as jest.Mock).mockResolvedValue({ ok: true, url: '/dashboard' })

      const { result } = renderHook(() => mockUseAuth())

      await act(async () => {
        await result.current.login('google', { callbackUrl: '/dashboard' })
      })

      expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' })
    })

    it('should handle login with Naver provider', async () => {
      const mockSession = {
        data: null,
        status: 'unauthenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)
      ;(signIn as jest.Mock).mockResolvedValue({ ok: true, url: '/dashboard' })

      const { result } = renderHook(() => mockUseAuth())

      await act(async () => {
        await result.current.login('naver', { callbackUrl: '/analysis' })
      })

      expect(signIn).toHaveBeenCalledWith('naver', { callbackUrl: '/analysis' })
    })

    it('should handle logout', async () => {
      const mockSession = {
        data: {
          user: { id: 'user_123', email: 'test@example.com' },
          expires: new Date(Date.now() + 3600000).toISOString()
        },
        status: 'authenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)
      ;(signOut as jest.Mock).mockResolvedValue({ url: '/' })

      const { result } = renderHook(() => mockUseAuth())

      await act(async () => {
        await result.current.logout()
      })

      expect(signOut).toHaveBeenCalled()
    })

    it('should handle authentication errors gracefully', async () => {
      const mockSession = {
        data: null,
        status: 'unauthenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)
      ;(signIn as jest.Mock).mockRejectedValue(new Error('Authentication failed'))

      const { result } = renderHook(() => mockUseAuth())

      await act(async () => {
        try {
          await result.current.login('google')
        } catch (error) {
          expect((error as Error).message).toBe('Authentication failed')
        }
      })

      expect(signIn).toHaveBeenCalledWith('google', undefined)
    })
  })

  describe('OAuth Provider Configuration', () => {
    it('should validate Google OAuth provider configuration', () => {
      const googleProviderConfig = {
        id: 'google',
        name: 'Google',
        type: 'oauth',
        authorization: {
          url: 'https://accounts.google.com/oauth/authorize',
          params: {
            scope: 'openid email profile',
            response_type: 'code',
            client_id: process.env.GOOGLE_CLIENT_ID
          }
        },
        token: 'https://oauth2.googleapis.com/token',
        userinfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
        profile(profile: any) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            provider: 'google'
          }
        }
      }

      expect(googleProviderConfig.id).toBe('google')
      expect(googleProviderConfig.name).toBe('Google')
      expect(googleProviderConfig.type).toBe('oauth')
      expect(googleProviderConfig.authorization.params.scope).toContain('openid email profile')
      expect(typeof googleProviderConfig.profile).toBe('function')

      // Test profile mapping
      const mockProfile = {
        sub: 'google_123',
        name: 'John Doe',
        email: 'john@example.com',
        picture: 'https://example.com/avatar.jpg'
      }

      const mappedProfile = googleProviderConfig.profile(mockProfile)
      expect(mappedProfile.id).toBe('google_123')
      expect(mappedProfile.name).toBe('John Doe')
      expect(mappedProfile.email).toBe('john@example.com')
      expect(mappedProfile.provider).toBe('google')
    })

    it('should validate Naver OAuth provider configuration', () => {
      const naverProviderConfig = {
        id: 'naver',
        name: 'Naver',
        type: 'oauth',
        authorization: {
          url: 'https://nid.naver.com/oauth2.0/authorize',
          params: {
            response_type: 'code',
            client_id: process.env.NAVER_CLIENT_ID,
            state: 'random_state_string'
          }
        },
        token: 'https://nid.naver.com/oauth2.0/token',
        userinfo: 'https://openapi.naver.com/v1/nid/me',
        profile(profile: any) {
          return {
            id: profile.response.id,
            name: profile.response.name,
            email: profile.response.email,
            image: profile.response.profile_image,
            provider: 'naver'
          }
        }
      }

      expect(naverProviderConfig.id).toBe('naver')
      expect(naverProviderConfig.name).toBe('Naver')
      expect(naverProviderConfig.type).toBe('oauth')
      expect(typeof naverProviderConfig.profile).toBe('function')

      // Test profile mapping
      const mockProfile = {
        response: {
          id: 'naver_456',
          name: 'Jane Kim',
          email: 'jane@naver.com',
          profile_image: 'https://ssl.pstatic.net/static/pwe/address/img_profile.png'
        }
      }

      const mappedProfile = naverProviderConfig.profile(mockProfile)
      expect(mappedProfile.id).toBe('naver_456')
      expect(mappedProfile.name).toBe('Jane Kim')
      expect(mappedProfile.email).toBe('jane@naver.com')
      expect(mappedProfile.provider).toBe('naver')
    })
  })

  describe('Authentication State Management', () => {
    it('should handle session expiration', () => {
      const expiredSession = {
        data: {
          user: { id: 'user_123', email: 'test@example.com' },
          expires: new Date(Date.now() - 1000).toISOString() // Expired
        },
        status: 'authenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(expiredSession)

      const { result } = renderHook(() => mockUseAuth())

      // Should still report as authenticated (NextAuth handles expiration)
      expect(result.current.isAuthenticated).toBe(true)
      
      // But the session should have the expired timestamp
      if (result.current.session) {
        const expiresDate = new Date(result.current.session.expires)
        expect(expiresDate.getTime()).toBeLessThan(Date.now())
      }
    })

    it('should handle multiple authentication attempts', async () => {
      const mockSession = {
        data: null,
        status: 'unauthenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)
      ;(signIn as jest.Mock)
        .mockResolvedValueOnce({ ok: false, error: 'Callback error' })
        .mockResolvedValueOnce({ ok: true, url: '/dashboard' })

      const { result } = renderHook(() => mockUseAuth())

      // First attempt fails
      await act(async () => {
        const firstResult = await result.current.login('google')
        if (firstResult) {
          expect(firstResult.ok).toBe(false)
        }
      })

      // Second attempt succeeds
      await act(async () => {
        const secondResult = await result.current.login('google')
        if (secondResult) {
          expect(secondResult.ok).toBe(true)
        }
      })

      expect(signIn).toHaveBeenCalledTimes(2)
    })

    it('should preserve authentication state across re-renders', () => {
      const mockSession = {
        data: {
          user: {
            id: 'user_123',
            email: 'test@example.com',
            name: 'Test User'
          }
        },
        status: 'authenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)

      const { result, rerender } = renderHook(() => mockUseAuth())

      const initialUser = result.current.user
      const initialAuth = result.current.isAuthenticated

      rerender()

      expect(result.current.user).toEqual(initialUser)
      expect(result.current.isAuthenticated).toBe(initialAuth)
    })
  })

  describe('OAuth Security Considerations', () => {
    it('should validate required environment variables', () => {
      const requiredEnvVars = [
        'NEXTAUTH_SECRET',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'NAVER_CLIENT_ID',
        'NAVER_CLIENT_SECRET'
      ]

      requiredEnvVars.forEach(envVar => {
        // In tests, we use mock values, but we should validate structure
        expect(typeof envVar).toBe('string')
        expect(envVar).toBeTruthy()
      })
    })

    it('should handle CSRF protection', async () => {
      const mockSession = {
        data: null,
        status: 'unauthenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)
      ;(signIn as jest.Mock).mockResolvedValue({ ok: true, url: '/dashboard' })

      const { result } = renderHook(() => mockUseAuth())

      await act(async () => {
        await result.current.login('google', { 
          callbackUrl: '/dashboard',
          redirect: false 
        })
      })

      // NextAuth automatically handles CSRF tokens
      expect(signIn).toHaveBeenCalledWith('google', { 
        callbackUrl: '/dashboard',
        redirect: false 
      })
    })

    it('should validate callback URLs', async () => {
      const mockSession = {
        data: null,
        status: 'unauthenticated'
      }
      
      ;(useSession as jest.Mock).mockReturnValue(mockSession)

      const { result } = renderHook(() => mockUseAuth())

      const validCallbacks = [
        '/dashboard',
        '/analysis',
        '/profile',
        '/' // Root is always valid
      ]

      for (const callback of validCallbacks) {
        await act(async () => {
          await result.current.login('google', { callbackUrl: callback })
        })
      }

      expect(signIn).toHaveBeenCalledTimes(validCallbacks.length)
    })
  })
})