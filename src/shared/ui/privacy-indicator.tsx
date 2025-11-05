/**
 * Privacy Indicator Component
 * T121 [US3] Add privacy indicators to results display
 * 
 * Shows privacy compliance status and data handling information
 */

import React from 'react'
import { cn } from '@/shared/lib'

export interface PrivacyIndicatorProps {
  privacyCompliance: {
    gdprCompliant: boolean
    ccpaCompliant: boolean
    dataMinimizationApplied: boolean
    userConsentObtained: boolean
    retentionPolicyApplied: boolean
    encryptionApplied: boolean
    auditTrailMaintained: boolean
    rightToErasureSupported: boolean
    dataPortabilitySupported: boolean
    privacyByDesign: boolean
    lastAuditDate?: string
    complianceScore: number
    nonComplianceReasons: string[]
  }
  sessionExpiration?: {
    expiresAt: string
    timeRemaining?: number
    inGracePeriod?: boolean
    canExtend?: boolean
  }
  size?: 'sm' | 'md' | 'lg'
  variant?: 'detailed' | 'compact' | 'minimal'
  className?: string
}

/**
 * Privacy compliance indicator with detailed status
 */
export const PrivacyIndicator: React.FC<PrivacyIndicatorProps> = ({
  privacyCompliance,
  sessionExpiration,
  size = 'md',
  variant = 'detailed',
  className
}) => {
  const sizeClasses = {
    sm: 'text-xs p-2',
    md: 'text-sm p-3',
    lg: 'text-base p-4'
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-700 bg-green-50 border-green-200'
    if (score >= 75) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    if (score >= 60) return 'text-orange-700 bg-orange-50 border-orange-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  const getComplianceIcon = (score: number) => {
    if (score >= 90) return '🔒'
    if (score >= 75) return '🛡️'
    if (score >= 60) return '⚠️'
    return '🚨'
  }

  const formatTimeRemaining = (ms?: number) => {
    if (!ms) return 'Unknown'
    
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const renderMinimalView = () => (
    <div className={cn('inline-flex items-center gap-2', sizeClasses[size], className)}>
      <span className="text-lg">{getComplianceIcon(privacyCompliance.complianceScore)}</span>
      <span className="font-medium">
        {privacyCompliance.complianceScore}% Privacy Compliant
      </span>
      {sessionExpiration && (
        <span className="text-gray-600">
          • Expires in {formatTimeRemaining(sessionExpiration.timeRemaining)}
        </span>
      )}
    </div>
  )

  const renderCompactView = () => (
    <div className={cn(
      'rounded-lg border',
      getComplianceColor(privacyCompliance.complianceScore),
      sizeClasses[size],
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getComplianceIcon(privacyCompliance.complianceScore)}</span>
          <div>
            <div className="font-medium">
              Privacy Compliance: {privacyCompliance.complianceScore}%
            </div>
            <div className="text-xs opacity-75">
              {privacyCompliance.gdprCompliant && privacyCompliance.ccpaCompliant ? 
                'GDPR & CCPA Compliant' : 
                'Partial Compliance'
              }
            </div>
          </div>
        </div>
        
        {sessionExpiration && (
          <div className="text-right text-xs">
            <div>Expires: {new Date(sessionExpiration.expiresAt).toLocaleString()}</div>
            {sessionExpiration.timeRemaining && (
              <div className={cn(
                'font-medium',
                sessionExpiration.inGracePeriod ? 'text-red-600' : 'text-gray-600'
              )}>
                {sessionExpiration.inGracePeriod ? 'Grace Period: ' : 'Time left: '}
                {formatTimeRemaining(sessionExpiration.timeRemaining)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const renderDetailedView = () => (
    <div className={cn(
      'rounded-lg border',
      getComplianceColor(privacyCompliance.complianceScore),
      sizeClasses[size],
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getComplianceIcon(privacyCompliance.complianceScore)}</span>
          <div>
            <h3 className="font-semibold">Privacy & Data Protection</h3>
            <p className="text-xs opacity-75">
              Compliance Score: {privacyCompliance.complianceScore}%
            </p>
          </div>
        </div>
        
        {privacyCompliance.lastAuditDate && (
          <div className="text-xs text-right">
            <div>Last Audit:</div>
            <div className="font-medium">
              {new Date(privacyCompliance.lastAuditDate).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* Compliance Status */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-2">
          <h4 className="font-medium text-xs uppercase tracking-wide">Regulatory Compliance</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span>GDPR Compliant</span>
              <span className={privacyCompliance.gdprCompliant ? 'text-green-600' : 'text-red-600'}>
                {privacyCompliance.gdprCompliant ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>CCPA Compliant</span>
              <span className={privacyCompliance.ccpaCompliant ? 'text-green-600' : 'text-red-600'}>
                {privacyCompliance.ccpaCompliant ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Privacy by Design</span>
              <span className={privacyCompliance.privacyByDesign ? 'text-green-600' : 'text-red-600'}>
                {privacyCompliance.privacyByDesign ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-xs uppercase tracking-wide">Data Protection</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span>Data Minimization</span>
              <span className={privacyCompliance.dataMinimizationApplied ? 'text-green-600' : 'text-red-600'}>
                {privacyCompliance.dataMinimizationApplied ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Encryption Applied</span>
              <span className={privacyCompliance.encryptionApplied ? 'text-green-600' : 'text-red-600'}>
                {privacyCompliance.encryptionApplied ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Audit Trail</span>
              <span className={privacyCompliance.auditTrailMaintained ? 'text-green-600' : 'text-red-600'}>
                {privacyCompliance.auditTrailMaintained ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User Rights */}
      <div className="mb-4">
        <h4 className="font-medium text-xs uppercase tracking-wide mb-2">User Rights Support</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span>User Consent</span>
            <span className={privacyCompliance.userConsentObtained ? 'text-green-600' : 'text-red-600'}>
              {privacyCompliance.userConsentObtained ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Right to Erasure</span>
            <span className={privacyCompliance.rightToErasureSupported ? 'text-green-600' : 'text-red-600'}>
              {privacyCompliance.rightToErasureSupported ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Data Portability</span>
            <span className={privacyCompliance.dataPortabilitySupported ? 'text-green-600' : 'text-red-600'}>
              {privacyCompliance.dataPortabilitySupported ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Retention Policy</span>
            <span className={privacyCompliance.retentionPolicyApplied ? 'text-green-600' : 'text-red-600'}>
              {privacyCompliance.retentionPolicyApplied ? '✓' : '✗'}
            </span>
          </div>
        </div>
      </div>

      {/* Session Expiration */}
      {sessionExpiration && (
        <div className="border-t pt-3">
          <h4 className="font-medium text-xs uppercase tracking-wide mb-2">Data Retention</h4>
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span>Analysis Expires:</span>
              <span className="font-medium">
                {new Date(sessionExpiration.expiresAt).toLocaleString()}
              </span>
            </div>
            {sessionExpiration.timeRemaining && (
              <div className="flex items-center justify-between">
                <span>
                  {sessionExpiration.inGracePeriod ? 'Grace Period Remaining:' : 'Time Remaining:'}
                </span>
                <span className={cn(
                  'font-medium',
                  sessionExpiration.inGracePeriod ? 'text-red-600' : 'text-gray-600'
                )}>
                  {formatTimeRemaining(sessionExpiration.timeRemaining)}
                </span>
              </div>
            )}
            {sessionExpiration.canExtend && (
              <div className="text-center pt-2">
                <button className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                  Extend Session
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Non-compliance Issues */}
      {privacyCompliance.nonComplianceReasons.length > 0 && (
        <div className="border-t pt-3">
          <h4 className="font-medium text-xs uppercase tracking-wide mb-2 text-red-600">
            Compliance Issues
          </h4>
          <ul className="text-xs space-y-1">
            {privacyCompliance.nonComplianceReasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2 text-red-600">
                <span>•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  if (variant === 'minimal') return renderMinimalView()
  if (variant === 'compact') return renderCompactView()
  return renderDetailedView()
}

/**
 * Privacy status badge for quick display
 */
export const PrivacyStatusBadge: React.FC<{
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}> = ({ score, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-300'
    if (score >= 75) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium',
      getScoreColor(score),
      sizeClasses[size],
      className
    )}>
      <span>{getComplianceIcon(score)}</span>
      <span>{score}% Compliant</span>
    </span>
  )
}

/**
 * Helper function to get compliance icon
 */
function getComplianceIcon(score: number): string {
  if (score >= 90) return '🔒'
  if (score >= 75) return '🛡️'
  if (score >= 60) return '⚠️'
  return '🚨'
}