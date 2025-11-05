/**
 * Sign-in Page (Task T095)
 * 
 * OAuth2 authentication page for Google and Naver providers
 * Part of authentication flow with proper error handling and redirects
 */

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession, signIn, getSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Loader2, Shield, ArrowLeft, AlertCircle } from 'lucide-react'
import { AuthWidget } from '@/widgets/auth-widget'

/**
 * Error message mapping for authentication errors
 */
const authErrorMessages: Record<string, string> = {
  'OAuthSignin': 'Error occurred during sign-in. Please try again.',
  'OAuthCallback': 'Authentication callback failed. Please try again.',
  'OAuthCreateAccount': 'Failed to create account. Please try again.',
  'EmailCreateAccount': 'Failed to create account. Please contact support.',
  'Callback': 'Authentication failed. Please try again.',
  'OAuthAccountNotLinked': 'Account not linked. Please sign in with the same provider.',
  'EmailSignin': 'Email sign-in failed. Please try again.',
  'CredentialsSignin': 'Invalid credentials. Please try again.',
  'SessionRequired': 'Please sign in to continue.',
  'Default': 'An unexpected error occurred. Please try again.'
}

/**
 * Sign-in content component with search params
 */
function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get authentication error from URL parameters
  const authError = searchParams?.get('error')
  const callbackUrl = searchParams?.get('callbackUrl') || '/analysis'

  /**
   * Handle OAuth2 sign-in with error handling
   */
  const handleSignIn = async (provider: 'google' | 'naver') => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await signIn(provider, {
        callbackUrl,
        redirect: false
      })

      if (result?.error) {
        setError(authErrorMessages[result.error] || authErrorMessages['Default'])
      } else if (result?.ok) {
        // Wait for session to be established
        const session = await getSession()
        if (session) {
          router.push(callbackUrl)
        }
      }
    } catch (err) {
      console.error('Sign-in error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle navigation back to previous page
   */
  const handleGoBack = () => {
    router.back()
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace(callbackUrl)
    }
  }, [status, session, router, callbackUrl])

  // Set error from URL parameter
  useEffect(() => {
    if (authError) {
      setError(authErrorMessages[authError] || authErrorMessages['Default'])
    }
  }, [authError])

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    )
  }

  // Don't show sign-in page if already authenticated
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Redirecting...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Sign in to Terms Watcher</h1>
          <p className="text-muted-foreground">
            Access your analysis history and manage your quota
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sign-in Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Choose your sign-in method</CardTitle>
            <CardDescription>
              We support Google and Naver authentication for secure access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* OAuth Sign-in Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start"
                onClick={() => handleSignIn('google')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-4 w-4" />
                )}
                Continue with Google
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start"
                onClick={() => handleSignIn('naver')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <NaverIcon className="mr-2 h-4 w-4" />
                )}
                Continue with Naver
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            {/* Alternative Auth Widget */}
            <div className="border rounded-lg p-1">
              <AuthWidget variant="full" showQuota={false} />
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="text-muted-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              By signing in, you agree to our{' '}
              <a href="/terms" className="underline hover:text-foreground">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </a>
            </p>
            <p>
              We prioritize your privacy and never store your original terms text
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Main sign-in page component with Suspense boundary
 */
export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading sign-in page...</span>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
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