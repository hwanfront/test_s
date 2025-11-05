'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { AlertCircle, ArrowLeft, Bug, RefreshCw, Home, Info } from 'lucide-react'
import { handleOAuthError } from '@/shared/lib/oauth-debug'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams?.get('error')
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  const getErrorInfo = (error: string | null) => {
    if (!error) {
      return {
        title: 'Unknown Error',
        description: 'An unknown authentication error occurred.',
        severity: 'error' as const,
        userMessage: 'An unexpected error occurred. Please try again.',
        suggestions: ['Try refreshing the page', 'Clear browser cache', 'Contact support if the issue persists'],
        debugInfo: null
      }
    }

    const errorDetails = handleOAuthError(error)
    
    const errorMap = {
      'Configuration': {
        title: 'Configuration Error',
        description: 'There is a problem with the server configuration.',
        severity: 'error' as const
      },
      'AccessDenied': {
        title: 'Access Denied',
        description: 'You denied access or the authentication was cancelled.',
        severity: 'warning' as const
      },
      'Verification': {
        title: 'Verification Failed',
        description: 'The verification token has expired or has already been used.',
        severity: 'error' as const
      },
      'OAuthSignin': {
        title: 'OAuth Sign-in Error',
        description: 'Error occurred while setting up the OAuth sign-in process.',
        severity: 'error' as const
      },
      'OAuthCallback': {
        title: 'OAuth Callback Error',
        description: 'Error occurred while processing the OAuth response.',
        severity: 'error' as const
      },
      'OAuthCreateAccount': {
        title: 'Account Creation Failed',
        description: 'Could not create your account with the OAuth provider.',
        severity: 'error' as const
      },
      'EmailCreateAccount': {
        title: 'Email Account Creation Failed',
        description: 'Could not create an account with email authentication.',
        severity: 'error' as const
      },
      'Callback': {
        title: 'Callback Error',
        description: 'Error in the authentication callback process.',
        severity: 'error' as const
      },
      'OAuthAccountNotLinked': {
        title: 'Account Not Linked',
        description: 'This email is already associated with a different sign-in method.',
        severity: 'warning' as const
      },
      'EmailSignin': {
        title: 'Email Sign-in Failed',
        description: 'Failed to send verification email.',
        severity: 'error' as const
      },
      'CredentialsSignin': {
        title: 'Invalid Credentials',
        description: 'The provided credentials are invalid.',
        severity: 'error' as const
      },
      'SessionRequired': {
        title: 'Authentication Required',
        description: 'You need to be signed in to access this page.',
        severity: 'warning' as const
      }
    }

    const baseInfo = errorMap[error as keyof typeof errorMap] || {
      title: 'Authentication Error',
      description: 'An authentication error occurred.',
      severity: 'error' as const
    }

    return {
      ...baseInfo,
      userMessage: errorDetails.userMessage,
      suggestions: errorDetails.suggestions,
      debugInfo: errorDetails.debugInfo || null
    }
  }

  const errorInfo = getErrorInfo(error)

  const retrySignIn = () => {
    window.location.href = '/auth/signin'
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Error Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{errorInfo.title}</h1>
          <div className="flex justify-center">
            <Badge variant={errorInfo.severity === 'error' ? 'destructive' : 'secondary'}>
              {error || 'Unknown'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Error Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            What happened?
          </CardTitle>
          <CardDescription>{errorInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={errorInfo.severity === 'error' ? 'destructive' : 'default'}>
            <Info className="h-4 w-4" />
            <AlertDescription>{errorInfo.userMessage}</AlertDescription>
          </Alert>

          {/* Suggestions */}
          {errorInfo.suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Try these solutions:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {errorInfo.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Debug Information */}
          {process.env.NODE_ENV === 'development' && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="w-full"
              >
                <Bug className="mr-2 h-4 w-4" />
                {showDebugInfo ? 'Hide' : 'Show'} Debug Information
              </Button>
              
              {showDebugInfo && errorInfo.debugInfo && (
                <div className="p-3 bg-muted rounded-md">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(errorInfo.debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={retrySignIn} className="flex-1">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        
        <Button variant="outline" asChild className="flex-1">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </Link>
        </Button>
        
        <Button variant="ghost" asChild>
          <Link href="/auth/signin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </Button>
      </div>

      {/* Additional Help */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-medium">Still having trouble?</h3>
            <p className="text-sm text-muted-foreground">
              If you continue to experience issues, please contact our support team.
            </p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <a href="mailto:support@example.com" className="hover:text-foreground underline">
                Email Support
              </a>
              <a href="/help" className="hover:text-foreground underline">
                Help Center
              </a>
              <a href="/status" className="hover:text-foreground underline">
                Service Status
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Loading error details...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      }>
        <ErrorContent />
      </Suspense>
    </div>
  )
}