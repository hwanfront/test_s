/**
 * Terms and Conditions Page (Task T154)
 * 
 * Displays comprehensive terms of service for Terms Watcher
 * Static content page integrated with application layout
 */

import { Metadata } from 'next'
import { FileText, AlertCircle, CheckCircle, Scale, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Alert, AlertDescription } from '@/shared/ui/alert'

export const metadata: Metadata = {
  title: 'Terms and Conditions | Terms Watcher',
  description: 'Terms of service and conditions for using Terms Watcher AI-powered analysis platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Scale className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-lg text-muted-foreground">
            Last updated: November 7, 2025
          </p>
        </div>

        {/* Important Notice Alert */}
        <Alert className="mb-8 border-primary/50 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-base">
            <strong>Important:</strong> By using Terms Watcher, you agree to these terms and conditions. 
            Please read them carefully before using our service.
          </AlertDescription>
        </Alert>

        {/* Quick Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Quick Summary
            </CardTitle>
            <CardDescription>
              Key points of our terms (full details below)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>You get <strong>3 free AI analyses per day</strong> after signing in</div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>AI analysis is <strong>for informational purposes only</strong>, not legal advice</div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>We <strong>never store your original terms text</strong>, only analysis results</div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>You are responsible for how you <strong>use and interpret</strong> our analysis</div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Main Content Sections */}
        <div className="space-y-8">
          {/* 1. Acceptance of Terms */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                By accessing or using Terms Watcher ("the Service"), you agree to be bound by these 
                Terms and Conditions ("Terms"). If you do not agree to these Terms, you may not use the Service.
              </p>
              
              <p>
                These Terms apply to all users of the Service, including both authenticated users 
                (who have signed in via OAuth2) and visitors who access public content.
              </p>

              <p>
                We reserve the right to modify these Terms at any time. Continued use of the Service 
                after changes constitutes acceptance of the modified Terms.
              </p>
            </div>
          </section>

          {/* 2. Service Description */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">2. Service Description</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">2.1 What Terms Watcher Does</h3>
                <p className="mb-2">Terms Watcher is an AI-powered analysis platform that:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Analyzes terms and conditions text using Google Gemini AI</li>
                  <li>Identifies potentially problematic or unfair clauses</li>
                  <li>Provides risk categorization and explanatory rationale</li>
                  <li>Displays analysis results with confidence indicators</li>
                  <li>Tracks your daily usage quota (3 free analyses per day for authenticated users)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">2.2 What Terms Watcher Does NOT Do</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Not legal advice:</strong> Our analysis does not constitute legal counsel</li>
                  <li><strong>Not a guarantee:</strong> We do not guarantee accuracy or completeness of analysis</li>
                  <li><strong>Not a substitute:</strong> Should not replace consultation with qualified legal professionals</li>
                  <li><strong>Not comprehensive:</strong> May not identify all problematic clauses or risks</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">2.3 Current Focus</h3>
                <p>
                  The Service is currently optimized for analyzing <strong>mobile gaming terms and conditions</strong>. 
                  Analysis of other types of terms may be less accurate or comprehensive.
                </p>
              </div>
            </div>
          </section>

          {/* 3. User Accounts and Authentication */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">3. User Accounts and Authentication</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.1 Account Creation</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Accounts are created via OAuth2 authentication (Google or Naver)</li>
                  <li>You must be at least 14 years old to create an account</li>
                  <li>You are responsible for maintaining the security of your account credentials</li>
                  <li>One person may maintain only one account</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.2 Account Responsibilities</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Provide accurate and complete information during authentication</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                  <li>Do not share your account access with others</li>
                  <li>You are responsible for all activities under your account</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">3.3 Account Termination</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>You may delete your account at any time through account settings</li>
                  <li>We may suspend or terminate accounts for violations of these Terms</li>
                  <li>Account termination results in deletion of all associated data</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. Usage Quota and Limitations */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">4. Usage Quota and Limitations</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">4.1 Free Tier</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>3 free analyses per day</strong> for authenticated users</li>
                  <li>Quota resets daily at midnight (UTC+9 Korean Standard Time)</li>
                  <li>Unused quota does not roll over to the next day</li>
                  <li>Free tier limitations may change with advance notice</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">4.2 Usage Restrictions</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Maximum text length: 50,000 characters per analysis</li>
                  <li>No automated or bulk analysis requests</li>
                  <li>No commercial resale or redistribution of analysis results</li>
                  <li>No reverse engineering or attempts to extract AI model logic</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">4.3 Future Pricing</h3>
                <p>
                  Additional analyses beyond the daily free quota may incur charges (currently set at 50 KRW per analysis). 
                  Pricing and quota policies are subject to change with 30 days advance notice.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Acceptable Use Policy */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">5. Acceptable Use Policy</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p className="font-semibold text-foreground">You agree NOT to use the Service to:</p>
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Submit malicious content, malware, or harmful code</li>
                <li>Abuse the quota system through multiple accounts or automated requests</li>
                <li>Attempt to gain unauthorized access to our systems or other users' data</li>
                <li>Interfere with or disrupt the Service's operation</li>
                <li>Use the Service for illegal, fraudulent, or harmful purposes</li>
                <li>Submit content that contains personal data of others without consent</li>
                <li>Scrape, harvest, or collect user information from the Service</li>
                <li>Impersonate others or misrepresent your affiliation</li>
                <li>Use analysis results to defame, harass, or harm individuals or organizations</li>
              </ul>

              <p className="mt-4 font-semibold text-foreground">
                Violation of this policy may result in immediate account suspension or termination.
              </p>
            </div>
          </section>

          {/* 6. Intellectual Property */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">6. Intellectual Property</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">6.1 Our Property</h3>
                <p className="mb-2">Terms Watcher and all related materials are protected by intellectual property rights:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Service design, code, and functionality</li>
                  <li>Logos, branding, and trademarks</li>
                  <li>AI analysis patterns and algorithms (excluding third-party AI models)</li>
                  <li>Documentation and user guides</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">6.2 Your Content</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>You retain ownership of terms text you submit for analysis</li>
                  <li>You grant us a limited license to process and analyze your submitted content</li>
                  <li>We do not claim ownership of your original terms text</li>
                  <li>Analysis results are provided to you for your personal use</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">6.3 License to Use Results</h3>
                <p>
                  You may use analysis results for personal, non-commercial purposes. 
                  You may not sell, license, or redistribute analysis results without our written permission.
                </p>
              </div>
            </div>
          </section>

          {/* 7. Privacy and Data Handling */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">7. Privacy and Data Handling</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">7.1 Privacy Policy</h3>
                <p>
                  Your use of the Service is also governed by our{' '}
                  <a href="/privacy" className="text-primary hover:underline font-semibold">
                    Privacy Policy
                  </a>, which describes how we collect, use, and protect your personal information.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">7.2 No Original Text Storage</h3>
                <p className="mb-2">
                  <strong className="text-foreground">Privacy-First Design:</strong> We do NOT store your original 
                  terms and conditions text. Our system:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Processes text in memory during analysis</li>
                  <li>Generates a SHA-256 hash for deduplication (irreversible)</li>
                  <li>Stores only analysis results and anonymized patterns</li>
                  <li>Discards original text immediately after analysis</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">7.3 Third-Party Processing</h3>
                <p>
                  Submitted content is processed by Google Gemini AI. Google's processing is governed by 
                  their{' '}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" 
                     className="text-primary hover:underline">
                    Privacy Policy
                  </a>. We recommend reviewing their terms before use.
                </p>
              </div>
            </div>
          </section>

          {/* 8. Disclaimers and Limitations */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">8. Disclaimers and Limitations</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">8.1 No Legal Advice</h3>
                <p className="font-semibold text-foreground mb-2">
                  IMPORTANT: Terms Watcher provides informational analysis only, not legal advice.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Our analysis does not create an attorney-client relationship</li>
                  <li>AI-generated insights may contain errors or omissions</li>
                  <li>Always consult a qualified attorney for legal matters</li>
                  <li>Do not rely solely on our analysis for important decisions</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">8.2 Service Availability</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>We strive for high availability but do not guarantee uninterrupted service</li>
                  <li>The Service may be unavailable due to maintenance, updates, or technical issues</li>
                  <li>AI analysis depends on third-party services (Google Gemini API)</li>
                  <li>We are not responsible for downtime or service interruptions</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">8.3 Accuracy Disclaimer</h3>
                <p className="mb-2">
                  <strong className="text-foreground">AI Limitations:</strong> While we use advanced AI technology, our analysis:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>May not identify all problematic clauses</li>
                  <li>May generate false positives or incorrect categorizations</li>
                  <li>Reflects AI model training and may have biases or limitations</li>
                  <li>Should be verified by human review for critical decisions</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">8.4 AS-IS Provision</h3>
                <p className="uppercase font-semibold text-foreground">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
                  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, 
                  FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                </p>
              </div>
            </div>
          </section>

          {/* 9. Limitation of Liability */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">9. Limitation of Liability</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p className="uppercase font-semibold text-foreground mb-2">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  We are not liable for any indirect, incidental, special, consequential, or punitive damages
                </li>
                <li>
                  We are not liable for loss of profits, revenue, data, or business opportunities
                </li>
                <li>
                  We are not liable for damages resulting from reliance on AI analysis results
                </li>
                <li>
                  Our total liability shall not exceed the amount paid by you in the past 12 months 
                  (or 50,000 KRW if no payment made)
                </li>
                <li>
                  We are not responsible for third-party services, including OAuth providers or Google Gemini API
                </li>
              </ul>

              <p className="mt-4">
                Some jurisdictions do not allow limitation of liability for incidental or consequential damages. 
                In such cases, our liability shall be limited to the fullest extent permitted by law.
              </p>
            </div>
          </section>

          {/* 10. Indemnification */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">10. Indemnification</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                You agree to indemnify, defend, and hold harmless Terms Watcher, its affiliates, and their 
                respective officers, directors, employees, and agents from any claims, liabilities, damages, 
                losses, costs, or expenses (including reasonable attorneys' fees) arising from:
              </p>
              
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Your use or misuse of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of third parties</li>
                <li>Your submitted content or analysis requests</li>
                <li>Any decisions made based on analysis results</li>
              </ul>
            </div>
          </section>

          {/* 11. Governing Law and Disputes */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">11. Governing Law and Disputes</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">11.1 Governing Law</h3>
                <p>
                  These Terms are governed by the laws of the Republic of Korea, without regard to 
                  conflict of law principles.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">11.2 Dispute Resolution</h3>
                <p className="mb-2">In the event of a dispute:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Contact us first to attempt informal resolution</li>
                  <li>If unresolved, disputes shall be subject to the exclusive jurisdiction of courts in Seoul, South Korea</li>
                  <li>You agree to waive any objection to venue or inconvenient forum</li>
                </ol>
              </div>
            </div>
          </section>

          {/* 12. General Provisions */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">12. General Provisions</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">12.1 Entire Agreement</h3>
                <p>
                  These Terms, together with our Privacy Policy, constitute the entire agreement between 
                  you and Terms Watcher regarding use of the Service.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">12.2 Severability</h3>
                <p>
                  If any provision of these Terms is found invalid or unenforceable, the remaining 
                  provisions remain in full force and effect.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">12.3 Waiver</h3>
                <p>
                  Our failure to enforce any right or provision of these Terms does not constitute a waiver 
                  of that right or provision.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">12.4 Assignment</h3>
                <p>
                  You may not assign or transfer these Terms without our written consent. We may assign 
                  these Terms without restriction.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">12.5 Changes to Terms</h3>
                <p className="mb-2">We may modify these Terms at any time by:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Posting updated Terms on this page with a new "Last updated" date</li>
                  <li>Notifying users via email for material changes</li>
                  <li>Displaying an in-app notice for significant changes</li>
                </ul>
                <p className="mt-2">
                  Continued use after changes indicates acceptance of modified Terms.
                </p>
              </div>
            </div>
          </section>

          {/* 13. Contact Information */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">13. Contact Us</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                If you have questions or concerns about these Terms and Conditions:
              </p>
              
              <div className="bg-muted/50 rounded-lg p-6 space-y-2">
                <p><strong className="text-foreground">Email:</strong> legal@termswatcher.com</p>
                <p><strong className="text-foreground">Support:</strong> support@termswatcher.com</p>
                <p><strong className="text-foreground">Response Time:</strong> We aim to respond within 5 business days</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Note */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground text-center">
            These Terms and Conditions are effective as of November 7, 2025 and apply to all users of Terms Watcher.
            <br />
            By using our service, you acknowledge that you have read, understood, and agree to be bound by these Terms.
          </p>
        </div>
      </div>
    </div>
  )
}
