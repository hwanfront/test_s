/**
 * About Page - Static content about Terms Watcher
 * This page should be server-side rendered without client-side interactions
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - Terms Watcher',
  description: 'Learn about Terms Watcher and how we help users understand terms and conditions.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About Terms Watcher</h1>
          <p className="text-xl text-gray-600">
            AI-powered protection for your digital rights
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {/* Mission Section */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              Terms Watcher empowers users to understand the legal agreements they encounter 
              in mobile games and digital services. Our AI-powered analysis reveals potentially 
              unfair clauses and helps you make informed decisions about the apps and services you use.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              We believe that everyone deserves to know what they're agreeing to, without 
              needing a law degree to understand complex legal language.
            </p>
          </section>

          {/* How It Works Section */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Paste Terms</h3>
                <p className="text-gray-600">
                  Copy and paste the terms and conditions, privacy policy, or user agreement 
                  you want to analyze.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Analysis</h3>
                <p className="text-gray-600">
                  Our advanced AI analyzes the content for potentially problematic clauses, 
                  unfair terms, and hidden risks.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Insights</h3>
                <p className="text-gray-600">
                  Receive a detailed risk assessment with explanations, recommendations, 
                  and suggested actions.
                </p>
              </div>
            </div>
          </section>

          {/* Privacy Section */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Privacy First</h2>
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-start">
                <div className="shrink-0">
                  <span className="text-3xl">🛡️</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">
                    Your Data Stays Private
                  </h3>
                  <p className="text-blue-800 mb-4">
                    We don't store the original text of the terms and conditions you analyze. 
                    Our system only keeps anonymized analysis results and patterns to improve 
                    our service.
                  </p>
                  <ul className="text-blue-800 space-y-2">
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3"></span>
                      No original text storage
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3"></span>
                      Anonymized analysis patterns only
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3"></span>
                      GDPR compliant data handling
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3"></span>
                      Automatic data cleanup
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Technology Section */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Technology</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Terms Watcher is built with cutting-edge AI technology and modern web standards 
              to provide accurate, fast, and reliable analysis.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">AI-Powered Analysis</h3>
                <p className="text-gray-600">
                  Our system uses advanced natural language processing to understand 
                  legal language and identify potential risks and unfair terms.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Modern Web Stack</h3>
                <p className="text-gray-600">
                  Built with Next.js, React, and TypeScript for a fast, reliable, 
                  and accessible user experience across all devices.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Mobile Gaming Focus</h3>
                <p className="text-gray-600">
                  Specialized patterns and analysis for mobile gaming terms, 
                  covering in-app purchases, data collection, and account policies.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Continuous Learning</h3>
                <p className="text-gray-600">
                  Our AI models are continuously updated with new patterns and 
                  legal developments to provide the most current analysis.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Get Started</h2>
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-lg text-gray-700 mb-4">
                Ready to analyze your first terms and conditions document?
              </p>
              <a 
                href="/analysis" 
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Start Analysis
              </a>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 Terms Watcher. Built with ❤️ for user protection.</p>
            <div className="flex justify-center space-x-6 mt-4">
              <a href="/" className="hover:text-blue-600 transition-colors">Home</a>
              <a href="/analysis" className="hover:text-blue-600 transition-colors">Analyze</a>
              <span className="text-gray-400">|</span>
              <span className="text-sm">Privacy-first AI analysis</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}