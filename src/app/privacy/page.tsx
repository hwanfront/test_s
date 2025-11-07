/**
 * Privacy Policy Page (Task T153)
 * 
 * Displays comprehensive privacy policy and data handling practices
 * Static content page integrated with application layout
 */

import { Metadata } from 'next'
import { Shield, Lock, Eye, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Alert, AlertDescription } from '@/shared/ui/alert'

export const metadata: Metadata = {
  title: 'Privacy Policy | Terms Watcher',
  description: 'Learn how Terms Watcher protects your privacy and handles your data with transparency and security.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground">
            Last updated: November 7, 2025
          </p>
        </div>

        {/* Privacy Commitment Alert */}
        <Alert className="mb-8 border-primary/50 bg-primary/5">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription className="text-base">
            <strong>Our Privacy Commitment:</strong> Terms Watcher is built on the principle of privacy-first design. 
            We never store your original terms and conditions text. Only analysis results and anonymized patterns are retained.
          </AlertDescription>
        </Alert>

        {/* Key Privacy Principles */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Key Privacy Principles
            </CardTitle>
            <CardDescription>
              Our fundamental approach to protecting your privacy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <strong>No Original Text Storage:</strong> Your terms and conditions text is never stored in our database
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <strong>Anonymized Processing:</strong> All text is anonymized and hashed before analysis
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <strong>Minimal Data Collection:</strong> We only collect what's necessary for authentication and quota tracking
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <strong>Transparent AI Usage:</strong> Clear disclosure of how AI analyzes your content
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Main Content Sections */}
        <div className="space-y-8">
          {/* 1. Information We Collect */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">1. Information We Collect</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">1.1 Authentication Information</h3>
                <p className="mb-2">When you sign in via OAuth2 (Google or Naver), we collect:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Your email address</li>
                  <li>Your name (as provided by the OAuth provider)</li>
                  <li>Profile picture URL (optional)</li>
                  <li>OAuth provider ID (for account linking)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">1.2 Usage Information</h3>
                <p className="mb-2">To manage your daily quota and track service usage:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Number of analyses performed per day</li>
                  <li>Timestamps of analysis requests</li>
                  <li>Session metadata (non-identifying)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">1.3 Analysis Data</h3>
                <p className="mb-2">What we store from your terms analysis:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Analysis results only:</strong> Risk assessments, categorizations, and recommendations</li>
                  <li><strong>Content hash:</strong> SHA-256 hash for deduplication (cannot be reversed to original text)</li>
                  <li><strong>Generalized patterns:</strong> Anonymized clause patterns for improving analysis quality</li>
                  <li><strong className="text-red-600">NOT stored:</strong> Original terms and conditions text</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">1.4 Technical Information</h3>
                <p className="mb-2">Standard web application data:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Browser type and version</li>
                  <li>Device type (mobile, desktop)</li>
                  <li>General geographic location (country level)</li>
                  <li>Error logs and performance metrics</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. How We Use Your Information */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">2. How We Use Your Information</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">2.1 Service Provision</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Authenticate your identity via OAuth2 providers</li>
                  <li>Track and enforce daily analysis quota (3 free analyses per day)</li>
                  <li>Display your analysis history and results</li>
                  <li>Provide AI-powered risk assessments of terms and conditions</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">2.2 Service Improvement</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Analyze anonymized patterns to improve AI detection accuracy</li>
                  <li>Monitor system performance and reliability</li>
                  <li>Identify and fix bugs and errors</li>
                  <li>Develop new features based on usage patterns</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">2.3 Legal Compliance</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Comply with applicable laws and regulations</li>
                  <li>Respond to legal requests and prevent abuse</li>
                  <li>Enforce our Terms of Service</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Data Processing and AI */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">3. Data Processing and AI Analysis</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.1 Text Processing Pipeline</h3>
                <p className="mb-2">Your terms text goes through privacy-safe processing:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li><strong>Client-side validation:</strong> Basic checks performed in your browser</li>
                  <li><strong>Server anonymization:</strong> Personal identifiers removed before AI processing</li>
                  <li><strong>Content hashing:</strong> SHA-256 hash generated for deduplication</li>
                  <li><strong>AI analysis:</strong> Processed content sent to Google Gemini API</li>
                  <li><strong>Result storage:</strong> Only analysis outcomes saved to database</li>
                  <li><strong>Text disposal:</strong> Original text discarded after analysis</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.2 Google Gemini API Usage</h3>
                <p className="mb-2">We use Google's Gemini AI for terms analysis:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Processed content is sent to Google's secure API endpoints</li>
                  <li>Google processes the content according to their{' '}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" 
                       className="text-primary hover:underline">
                      Privacy Policy
                    </a>
                  </li>
                  <li>We do not control how Google processes API requests</li>
                  <li>Analysis is performed in real-time and not stored by Google (per API terms)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.3 Data Retention</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Analysis results:</strong> Retained indefinitely while your account is active</li>
                  <li><strong>Usage quota data:</strong> Reset daily at midnight (UTC+9)</li>
                  <li><strong>Session data:</strong> Automatically deleted after 90 days of inactivity</li>
                  <li><strong>Account data:</strong> Retained until you request deletion</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. Data Sharing and Third Parties */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">4. Data Sharing and Third Parties</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>We share your information only in the following limited circumstances:</p>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">4.1 OAuth Providers</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Google:</strong> For Google OAuth authentication</li>
                  <li><strong>Naver:</strong> For Naver OAuth authentication</li>
                  <li>Only authentication data is shared per OAuth protocol</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">4.2 AI Service Provider</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Google Gemini API:</strong> Processed (anonymized) terms text for analysis</li>
                  <li>No personal identifying information included in API requests</li>
                  <li>Governed by Google's API terms and privacy policy</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">4.3 Hosting and Infrastructure</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Vercel:</strong> Application hosting and deployment</li>
                  <li><strong>Supabase:</strong> Database and authentication infrastructure</li>
                  <li>All providers comply with industry-standard security practices</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">4.4 We Never Sell Your Data</h3>
                <p className="font-semibold text-foreground">
                  Terms Watcher does not sell, rent, or trade your personal information to third parties for marketing purposes.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Your Rights and Controls */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">5. Your Rights and Controls</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>You have the following rights regarding your personal data:</p>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">5.1 Access Your Data</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>View your analysis history from your account dashboard</li>
                  <li>Request a copy of all data we store about you</li>
                  <li>Export your data in machine-readable format</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">5.2 Delete Your Data</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Delete individual analysis sessions from your history</li>
                  <li>Request complete account deletion (removes all associated data)</li>
                  <li>Data deletion is permanent and cannot be undone</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">5.3 Withdraw Consent</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Sign out to stop using the service at any time</li>
                  <li>Revoke OAuth permissions through your Google/Naver account settings</li>
                  <li>Contact us to request data deletion</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">5.4 Data Portability</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Export your analysis history in JSON format</li>
                  <li>Transfer your data to another service (where technically feasible)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 6. Security Measures */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">6. Security Measures</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>We implement industry-standard security practices to protect your data:</p>
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Encryption in transit:</strong> All data transmitted via HTTPS/TLS</li>
                <li><strong>Encryption at rest:</strong> Database encryption for stored data</li>
                <li><strong>OAuth 2.0:</strong> Secure authentication without password storage</li>
                <li><strong>Content hashing:</strong> SHA-256 for irreversible text fingerprinting</li>
                <li><strong>Access controls:</strong> Strict role-based access to infrastructure</li>
                <li><strong>Regular audits:</strong> Security reviews and vulnerability scanning</li>
                <li><strong>Error monitoring:</strong> Sentry integration for issue detection</li>
                <li><strong>Data minimization:</strong> Only essential data is collected and stored</li>
              </ul>
            </div>
          </section>

          {/* 7. Children's Privacy */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">7. Children's Privacy</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                Terms Watcher is not intended for use by individuals under the age of 14. 
                We do not knowingly collect personal information from children. If you believe 
                we have inadvertently collected information from a child, please contact us 
                immediately so we can delete it.
              </p>
            </div>
          </section>

          {/* 8. International Data Transfers */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">8. International Data Transfers</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                Your data may be processed in countries outside of South Korea, including the United States 
                (Google Gemini API, Vercel hosting). These transfers are protected by:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Standard contractual clauses approved by regulatory authorities</li>
                <li>Service providers' compliance with international privacy frameworks</li>
                <li>Encryption and security measures during transfer and storage</li>
              </ul>
            </div>
          </section>

          {/* 9. Changes to Privacy Policy */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">9. Changes to This Privacy Policy</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                We may update this privacy policy from time to time to reflect changes in our practices 
                or for legal, operational, or regulatory reasons. We will notify you of material changes by:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Updating the "Last updated" date at the top of this page</li>
                <li>Displaying a notice on the service for significant changes</li>
                <li>Sending an email notification (for major policy changes)</li>
              </ul>
              <p className="mt-4">
                Your continued use of Terms Watcher after changes indicates acceptance of the updated policy.
              </p>
            </div>
          </section>

          {/* 10. Contact Information */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">10. Contact Us</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                If you have questions, concerns, or requests regarding this privacy policy or your personal data:
              </p>
              
              <div className="bg-muted/50 rounded-lg p-6 space-y-2">
                <p><strong className="text-foreground">Email:</strong> privacy@termswatcher.com</p>
                <p><strong className="text-foreground">Response Time:</strong> We aim to respond within 5 business days</p>
              </div>

              <p className="mt-4">
                For data deletion requests or privacy concerns, please include your registered email address 
                and a detailed description of your request.
              </p>
            </div>
          </section>
        </div>

        {/* Footer Note */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground text-center">
            This privacy policy is effective as of November 7, 2025 and applies to all users of Terms Watcher.
          </p>
        </div>
      </div>
    </div>
  )
}
