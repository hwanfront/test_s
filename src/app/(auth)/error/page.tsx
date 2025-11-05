'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      case 'OAuthSignin':
        return 'Error in constructing an authorization URL.'
      case 'OAuthCallback':
        return 'Error in handling the response from an OAuth provider.'
      case 'OAuthCreateAccount':
        return 'Could not create OAuth provider user in the database.'
      case 'EmailCreateAccount':
        return 'Could not create email provider user in the database.'
      case 'Callback':
        return 'Error in the OAuth callback handler route.'
      case 'OAuthAccountNotLinked':
        return 'The email on the account is already linked, but not with this OAuth account.'
      case 'EmailSignin':
        return 'Sending the e-mail with the verification token failed.'
      case 'CredentialsSignin':
        return 'The authorize callback returned null in the Credentials provider.'
      case 'SessionRequired':
        return 'The content of this page requires you to be signed in at all times.'
      default:
        return 'An unknown error occurred.'
    }
  }

  return (
    <>
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="text-sm">{getErrorMessage(error)}</p>
      </div>

      <div className="text-center space-y-4">
        <Link
          href="/auth/signin"
          className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          Try Again
        </Link>
        
        <div>
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
        </div>
        
        <Suspense fallback={
          <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded">
            <p className="text-sm">Loading error details...</p>
          </div>
        }>
          <ErrorContent />
        </Suspense>
      </div>
    </div>
  )
}