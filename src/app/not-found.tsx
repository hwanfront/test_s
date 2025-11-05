/**
 * Not Found (404) Error Page
 * 
 * Custom 404 page for Next.js App Router
 */

import Link from 'next/link'
import { Button } from '@/shared/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
          <div className="text-center">
            {/* 404 Icon */}
            <div className="text-6xl mb-4">🔍</div>
            
            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              404
            </h1>
            
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Page Not Found
            </h2>
            
            {/* Description */}
            <p className="text-gray-600 mb-8">
              The page you're looking for doesn't exist or has been moved.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link href="/">
                <Button className="w-full" variant="default">
                  Go Home
                </Button>
              </Link>
              
              <Button 
                onClick={() => window.history.back()} 
                className="w-full" 
                variant="outline"
              >
                Go Back
              </Button>
            </div>

            {/* Help Links */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">
                Still can't find what you're looking for?
              </p>
              <div className="space-x-4 text-sm">
                <Link href="/help" className="text-blue-600 hover:text-blue-800">
                  Help Center
                </Link>
                <Link href="/contact" className="text-blue-600 hover:text-blue-800">
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}