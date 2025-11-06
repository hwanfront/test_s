'use client'

/**
 * Navigation Header Component
 * Provides main site navigation with authentication state
 */

import { useSession } from 'next-auth/react'
import { LogoutButton } from '@/shared/ui/logout-button'
import { useState } from 'react'

export function NavigationHeader() {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm border-b">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and brand */}
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Terms Watcher</span>
            </a>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <a
              href="/"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Home
            </a>
            <a
              href="/analysis"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Analyze
            </a>
            <a
              href="/about"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              About
            </a>
            
            {/* Authentication section */}
            <div className="flex items-center space-x-3 ml-6 pl-6 border-l border-gray-200">
              {status === 'loading' ? (
                <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full"></div>
              ) : session ? (
                <div className="flex items-center space-x-3">
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {session.user?.name || session.user?.email}
                  </span>
                  <LogoutButton variant="outline" size="sm" />
                </div>
              ) : (
                <a
                  href="/api/auth/signin"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </a>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden" id="mobile-menu">
            <div className="space-y-1 pb-3 pt-2">
              <a
                href="/"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                Home
              </a>
              <a
                href="/analysis"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                Analyze
              </a>
              <a
                href="/about"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                About
              </a>
              
              {/* Mobile authentication section */}
              <div className="border-t border-gray-200 pt-4 pb-3">
                {status === 'loading' ? (
                  <div className="px-3 py-2">
                    <div className="h-4 w-24 animate-pulse bg-gray-200 rounded"></div>
                  </div>
                ) : session ? (
                  <div className="space-y-3">
                    <div className="flex items-center px-3">
                      {session.user?.image && (
                        <img
                          src={session.user.image}
                          alt={session.user.name || 'User'}
                          className="h-8 w-8 rounded-full mr-3"
                        />
                      )}
                      <div>
                        <div className="text-base font-medium text-gray-800">
                          {session.user?.name}
                        </div>
                        <div className="text-sm font-medium text-gray-500">
                          {session.user?.email}
                        </div>
                      </div>
                    </div>
                    <div className="px-3">
                      <LogoutButton variant="outline" size="sm" className="w-full" />
                    </div>
                  </div>
                ) : (
                  <div className="px-3">
                    <a
                      href="/api/auth/signin"
                      className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-md text-base font-medium hover:bg-blue-700 transition-colors"
                    >
                      Sign In
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}