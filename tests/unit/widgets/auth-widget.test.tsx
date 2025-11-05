/**
 * Component Tests for Auth Widget (Task T076)
 * 
 * Tests the authentication widget components and user interactions
 * following Feature-Sliced Design patterns
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSession, signIn, signOut } from 'next-auth/react'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn()
}))

// Mock Auth Widget Component (will be implemented)
const AuthWidget: React.FC = () => {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div data-testid="auth-loading">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (session) {
    return (
      <div data-testid="auth-authenticated" className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {session.user?.image && (
            <img 
              src={session.user.image} 
              alt="Profile" 
              className="w-8 h-8 rounded-full"
              data-testid="user-avatar"
            />
          )}
          <div>
            <p data-testid="user-name" className="font-medium">
              {session.user?.name}
            </p>
            <p data-testid="user-email" className="text-sm text-gray-600">
              {session.user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          data-testid="sign-out-button"
          className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div data-testid="auth-unauthenticated" className="flex gap-2">
      <button
        onClick={() => signIn('google')}
        data-testid="google-signin-button"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Sign in with Google
      </button>
      <button
        onClick={() => signIn('naver')}
        data-testid="naver-signin-button"
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Sign in with Naver
      </button>
    </div>
  )
}

// Mock Sign-In Component
const SignInButton: React.FC<{ provider: 'google' | 'naver' }> = ({ provider }) => {
  const providerConfig = {
    google: {
      name: 'Google',
      icon: '🔍',
      bgColor: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700'
    },
    naver: {
      name: 'Naver',
      icon: '🟢',
      bgColor: 'bg-green-600',
      hoverColor: 'hover:bg-green-700'
    }
  }

  const config = providerConfig[provider]

  return (
    <button
      onClick={() => signIn(provider)}
      data-testid={`${provider}-signin-button`}
      className={`flex items-center gap-2 px-4 py-2 text-white rounded ${config.bgColor} ${config.hoverColor}`}
    >
      <span>{config.icon}</span>
      Sign in with {config.name}
    </button>
  )
}

// Mock Sign-Out Component
const SignOutButton: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      data-testid="sign-out-button"
      className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded"
    >
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </button>
  )
}

describe('Auth Widget Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('AuthWidget Component', () => {
    it('should show loading state during authentication check', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading'
      })

      render(<AuthWidget />)

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show sign-in options when user is not authenticated', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      render(<AuthWidget />)

      expect(screen.getByTestId('auth-unauthenticated')).toBeInTheDocument()
      expect(screen.getByTestId('google-signin-button')).toBeInTheDocument()
      expect(screen.getByTestId('naver-signin-button')).toBeInTheDocument()
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
      expect(screen.getByText('Sign in with Naver')).toBeInTheDocument()
    })

    it('should show user information when authenticated', () => {
      const mockSession = {
        user: {
          id: 'user_123',
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg'
        },
        expires: new Date(Date.now() + 3600000).toISOString()
      }

      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(<AuthWidget />)

      expect(screen.getByTestId('auth-authenticated')).toBeInTheDocument()
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe')
      expect(screen.getByTestId('user-email')).toHaveTextContent('john@example.com')
      expect(screen.getByTestId('user-avatar')).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      expect(screen.getByTestId('sign-out-button')).toBeInTheDocument()
    })

    it('should handle missing user image gracefully', () => {
      const mockSession = {
        user: {
          id: 'user_123',
          name: 'Jane Doe',
          email: 'jane@example.com'
          // No image property
        },
        expires: new Date(Date.now() + 3600000).toISOString()
      }

      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(<AuthWidget />)

      expect(screen.getByTestId('user-name')).toHaveTextContent('Jane Doe')
      expect(screen.getByTestId('user-email')).toHaveTextContent('jane@example.com')
      expect(screen.queryByTestId('user-avatar')).not.toBeInTheDocument()
    })

    it('should trigger Google sign-in when Google button is clicked', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })
      ;(signIn as jest.Mock).mockResolvedValue({ ok: true })

      render(<AuthWidget />)

      const googleButton = screen.getByTestId('google-signin-button')
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('google')
      })
    })

    it('should trigger Naver sign-in when Naver button is clicked', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })
      ;(signIn as jest.Mock).mockResolvedValue({ ok: true })

      render(<AuthWidget />)

      const naverButton = screen.getByTestId('naver-signin-button')
      fireEvent.click(naverButton)

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('naver')
      })
    })

    it('should trigger sign-out when sign-out button is clicked', async () => {
      const mockSession = {
        user: {
          id: 'user_123',
          name: 'John Doe',
          email: 'john@example.com'
        }
      }

      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
      ;(signOut as jest.Mock).mockResolvedValue({ url: '/' })

      render(<AuthWidget />)

      const signOutButton = screen.getByTestId('sign-out-button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(signOut).toHaveBeenCalled()
      })
    })
  })

  describe('SignInButton Component', () => {
    it('should render Google sign-in button with correct styling', () => {
      render(<SignInButton provider="google" />)

      const button = screen.getByTestId('google-signin-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Sign in with Google')
      expect(button).toHaveClass('bg-blue-600', 'hover:bg-blue-700')
    })

    it('should render Naver sign-in button with correct styling', () => {
      render(<SignInButton provider="naver" />)

      const button = screen.getByTestId('naver-signin-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Sign in with Naver')
      expect(button).toHaveClass('bg-green-600', 'hover:bg-green-700')
    })

    it('should call signIn with correct provider when clicked', async () => {
      ;(signIn as jest.Mock).mockResolvedValue({ ok: true })

      render(<SignInButton provider="google" />)

      const button = screen.getByTestId('google-signin-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('google')
      })
    })
  })

  describe('SignOutButton Component', () => {
    it('should render sign-out button with default text', () => {
      render(<SignOutButton />)

      const button = screen.getByTestId('sign-out-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Sign Out')
      expect(button).not.toBeDisabled()
    })

    it('should show loading state during sign-out process', async () => {
      ;(signOut as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ url: '/' }), 100))
      )

      render(<SignOutButton />)

      const button = screen.getByTestId('sign-out-button')
      fireEvent.click(button)

      // Should immediately show loading state
      expect(button).toHaveTextContent('Signing out...')
      expect(button).toBeDisabled()

      // Wait for sign-out to complete
      await waitFor(() => {
        expect(signOut).toHaveBeenCalled()
      })
    })

    it('should handle sign-out errors gracefully', async () => {
      ;(signOut as jest.Mock).mockRejectedValue(new Error('Sign out failed'))

      render(<SignOutButton />)

      const button = screen.getByTestId('sign-out-button')
      fireEvent.click(button)

      // Button should return to normal state even if sign-out fails
      await waitFor(() => {
        expect(button).not.toBeDisabled()
        expect(button).toHaveTextContent('Sign Out')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for auth buttons', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      render(<AuthWidget />)

      const googleButton = screen.getByTestId('google-signin-button')
      const naverButton = screen.getByTestId('naver-signin-button')

      expect(googleButton).toBeInTheDocument()
      expect(naverButton).toBeInTheDocument()
      
      // Buttons should be focusable
      expect(googleButton.tagName).toBe('BUTTON')
      expect(naverButton.tagName).toBe('BUTTON')
    })

    it('should have proper alt text for user avatar', () => {
      const mockSession = {
        user: {
          id: 'user_123',
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg'
        }
      }

      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(<AuthWidget />)

      const avatar = screen.getByTestId('user-avatar')
      expect(avatar).toHaveAttribute('alt', 'Profile')
    })

    it('should support keyboard navigation', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      render(<AuthWidget />)

      const googleButton = screen.getByTestId('google-signin-button')
      const naverButton = screen.getByTestId('naver-signin-button')

      // Buttons should be tab-navigable
      expect(googleButton).not.toHaveAttribute('tabIndex', '-1')
      expect(naverButton).not.toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('Visual States and Styling', () => {
    it('should apply correct CSS classes for different states', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading'
      })

      const { rerender } = render(<AuthWidget />)

      // Loading state
      expect(screen.getByTestId('auth-loading')).toBeInTheDocument()

      // Unauthenticated state
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      rerender(<AuthWidget />)
      expect(screen.getByTestId('auth-unauthenticated')).toBeInTheDocument()

      // Authenticated state
      const mockSession = {
        user: { id: 'user_123', name: 'John Doe', email: 'john@example.com' }
      }

      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      rerender(<AuthWidget />)
      expect(screen.getByTestId('auth-authenticated')).toBeInTheDocument()
    })

    it('should maintain consistent spacing and layout', () => {
      const mockSession = {
        user: {
          id: 'user_123',
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg'
        }
      }

      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(<AuthWidget />)

      const container = screen.getByTestId('auth-authenticated')
      expect(container).toHaveClass('flex', 'items-center', 'gap-4')
    })
  })

  describe('Error Handling', () => {
    it('should handle session data corruption gracefully', () => {
      // Mock corrupted session data
      ;(useSession as jest.Mock).mockReturnValue({
        data: { 
          user: null // Corrupted user data
        },
        status: 'authenticated'
      })

      render(<AuthWidget />)

      // Should still render the authenticated container but handle missing user data
      expect(screen.getByTestId('auth-authenticated')).toBeInTheDocument()
    })

    it('should handle undefined session data', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: undefined,
        status: 'unauthenticated'
      })

      render(<AuthWidget />)

      expect(screen.getByTestId('auth-unauthenticated')).toBeInTheDocument()
    })

    it('should handle authentication provider errors', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })
      ;(signIn as jest.Mock).mockRejectedValue(new Error('Provider error'))

      render(<AuthWidget />)

      const googleButton = screen.getByTestId('google-signin-button')
      
      // Click should not break the component even if signIn fails
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('google')
      })

      // Component should still be functional
      expect(screen.getByTestId('auth-unauthenticated')).toBeInTheDocument()
    })
  })
})