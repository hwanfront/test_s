/**
 * Auth Widget UI Component (Task T093)
 * 
 * Provides authentication interface with OAuth2 sign-in/sign-out
 * following Feature-Sliced Design principles and user auth state management
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/shared/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/shared/ui/dropdown-menu'
import { Badge } from '@/shared/ui/badge'
import { Loader2, LogIn, LogOut, User, Shield } from 'lucide-react'

/**
 * Props for AuthWidget component
 */
interface AuthWidgetProps {
  variant?: 'compact' | 'full'
  showQuota?: boolean
  className?: string
}

/**
 * Main authentication widget component
 */
export function AuthWidget({ 
  variant = 'compact', 
  showQuota = true, 
  className = '' 
}: AuthWidgetProps) {
  const { data: session, status } = useSession()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Reset loading states when session changes
  useEffect(() => {
    if (status !== 'loading') {
      setIsSigningIn(false)
      setIsSigningOut(false)
    }
  }, [status])

  /**
   * Handle OAuth2 sign-in with provider selection
   */
  const handleSignIn = async (provider: 'google' | 'naver') => {
    try {
      setIsSigningIn(true)
      await signIn(provider, { 
        callbackUrl: '/analysis',
        redirect: true 
      })
    } catch (error) {
      console.error('Sign-in error:', error)
      setIsSigningIn(false)
    }
  }

  /**
   * Handle user sign-out
   */
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      })
    } catch (error) {
      console.error('Sign-out error:', error)
      setIsSigningOut(false)
    }
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  // Authenticated state
  if (session?.user) {
    return (
      <AuthenticatedView
        user={session.user}
        variant={variant}
        showQuota={showQuota}
        onSignOut={handleSignOut}
        isSigningOut={isSigningOut}
        className={className}
      />
    )
  }

  // Unauthenticated state
  return (
    <UnauthenticatedView
      variant={variant}
      onSignIn={handleSignIn}
      isSigningIn={isSigningIn}
      className={className}
    />
  )
}

/**
 * Authenticated user view component
 */
interface AuthenticatedViewProps {
  user: any
  variant: 'compact' | 'full'
  showQuota: boolean
  onSignOut: () => void
  isSigningOut: boolean
  className: string
}

function AuthenticatedView({
  user,
  variant,
  showQuota,
  onSignOut,
  isSigningOut,
  className
}: AuthenticatedViewProps) {
  const userInitials = user.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '??'

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">{user.name}</p>
                <p className="w-[200px] truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            {showQuota && (
              <DropdownMenuItem className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                Usage Quota
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer text-red-600"
              onClick={onSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Full variant
  return (
    <div className={`flex items-center justify-between p-4 bg-card rounded-lg border ${className}`}>
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatarUrl} alt={user.name} />
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {user.provider}
            </Badge>
            {showQuota && (
              <Badge variant="outline" className="text-xs">
                Quota: 3/3
              </Badge>
            )}
          </div>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </>
        )}
      </Button>
    </div>
  )
}

/**
 * Unauthenticated user view component
 */
interface UnauthenticatedViewProps {
  variant: 'compact' | 'full'
  onSignIn: (provider: 'google' | 'naver') => void
  isSigningIn: boolean
  className: string
}

function UnauthenticatedView({
  variant,
  onSignIn,
  isSigningIn,
  className
}: UnauthenticatedViewProps) {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isSigningIn}>
              {isSigningIn ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Sign in
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="end">
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => onSignIn('google')}
              disabled={isSigningIn}
            >
              <div className="flex items-center space-x-2">
                <GoogleIcon />
                <span>Google</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => onSignIn('naver')}
              disabled={isSigningIn}
            >
              <div className="flex items-center space-x-2">
                <NaverIcon />
                <span>Naver</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Full variant
  return (
    <div className={`flex flex-col items-center justify-center p-6 bg-card rounded-lg border ${className}`}>
      <div className="text-center mb-4">
        <h3 className="font-medium text-lg">Sign in to continue</h3>
        <p className="text-sm text-muted-foreground">
          Access your analysis history and manage daily quota
        </p>
      </div>
      <div className="flex flex-col space-y-2 w-full max-w-xs">
        <Button 
          variant="outline" 
          onClick={() => onSignIn('google')}
          disabled={isSigningIn}
          className="justify-start"
        >
          {isSigningIn ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2" />
          )}
          Continue with Google
        </Button>
        <Button 
          variant="outline" 
          onClick={() => onSignIn('naver')}
          disabled={isSigningIn}
          className="justify-start"
        >
          {isSigningIn ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <NaverIcon className="mr-2" />
          )}
          Continue with Naver
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-4 text-center">
        By signing in, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  )
}

/**
 * Google OAuth provider icon
 */
function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

/**
 * Naver OAuth provider icon
 */
function NaverIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 15.5h-3V6.5h3v4.39l3.14-4.39h3v11h-3v-4.39L10.5 17.5z"
      />
    </svg>
  )
}

export default AuthWidget