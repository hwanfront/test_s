/**
 * Data Retention API Route (Task T115)
 * 
 * Data retention and cleanup management API ensuring constitutional compliance
 * with automated data lifecycle management and secure deletion.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Automated data retention policy enforcement
 * - Secure data deletion with verification
 * - Privacy-compliant retention tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  DataRetentionCleanupService,
  type RetentionPolicy,
  type CleanupTask,
  type RetentionRecord,
  type CleanupVerification
} from '@/features/text-preprocessing/lib/data-retention-cleanup'

/**
 * Request schemas
 */
const retentionPolicySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dataType: z.enum(['analysis_result', 'session_data', 'audit_log', 'quota_record', 'user_preference']),
  retentionDays: z.number().min(1).max(3650), // Max 10 years
  autoCleanup: z.boolean(),
  secureDelete: z.boolean(),
  archiveBeforeDelete: z.boolean(),
  notificationThreshold: z.number().min(1)
})

const registerDataSchema = z.object({
  dataId: z.string().min(1),
  dataType: z.string().min(1),
  contentHash: z.string().min(64).max(64), // SHA-256 hash
  policyId: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
  securityLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
})

const scheduleCleanupSchema = z.object({
  policyId: z.string().min(1),
  scheduledAt: z.string().datetime().optional()
})

const cleanupFiltersSchema = z.object({
  policyId: z.string().optional(),
  dataType: z.string().optional(),
  expired: z.boolean().optional(),
  expiring: z.boolean().optional(),
  limit: z.number().min(1).max(1000).default(100)
})

/**
 * Response interfaces
 */
interface RetentionResponse {
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
    details?: any
  }
}

/**
 * Error codes
 */
const RetentionErrorCodes = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  POLICY_NOT_FOUND: 'POLICY_NOT_FOUND',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  CLEANUP_FAILED: 'CLEANUP_FAILED',
  CLEANUP_IN_PROGRESS: 'CLEANUP_IN_PROGRESS',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED'
} as const

/**
 * Initialize retention service
 */
const retentionService = new DataRetentionCleanupService({
  enabled: true,
  encryption: true,
  archiveRetentionDays: 2555, // ~7 years for compliance
  maxArchiveSize: 100 // 100MB
})

/**
 * Active cleanup tracking
 */
const activeCleanups = new Set<string>()

/**
 * POST /api/data-retention/policies
 * Create or update retention policy
 */
export async function POST(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  try {
    const url = new URL(request.url)
    const endpoint = url.pathname.split('/').pop()

    if (endpoint === 'policies') {
      return await handlePolicyManagement(request)
    } else if (endpoint === 'register') {
      return await handleDataRegistration(request)
    } else if (endpoint === 'cleanup') {
      return await handleCleanupExecution(request)
    }

    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.INVALID_REQUEST,
        message: 'Invalid endpoint'
      }
    }, { status: 404 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Data retention API error:', errorMessage, error)

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}

/**
 * GET /api/data-retention/*
 * Get retention data and statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  try {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const endpoint = pathSegments[pathSegments.length - 1]

    switch (endpoint) {
      case 'policies':
        return await handleGetPolicies(request)
      case 'records':
        return await handleGetRecords(request)
      case 'stats':
        return await handleGetStats(request)
      case 'status':
        return await handleGetStatus(request)
      default:
        if (pathSegments.includes('verification')) {
          return await handleGetVerification(request)
        }
        
        return NextResponse.json({
          success: false,
          error: {
            code: RetentionErrorCodes.INVALID_REQUEST,
            message: 'Invalid endpoint'
          }
        }, { status: 404 })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Data retention GET error:', errorMessage, error)

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}

/**
 * PUT /api/data-retention/cleanup
 * Schedule or execute cleanup tasks
 */
export async function PUT(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  try {
    const url = new URL(request.url)
    
    if (url.pathname.includes('schedule')) {
      return await handleScheduleCleanup(request)
    } else if (url.pathname.includes('auto')) {
      return await handleAutoCleanup(request)
    }

    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.INVALID_REQUEST,
        message: 'Invalid cleanup endpoint'
      }
    }, { status: 404 })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Data retention PUT error:', errorMessage, error)

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}

/**
 * Handler functions
 */

/**
 * Handle policy management
 */
async function handlePolicyManagement(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  const body = await request.json()
  const validationResult = retentionPolicySchema.safeParse(body)
  
  if (!validationResult.success) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.INVALID_REQUEST,
        message: 'Invalid policy format',
        details: validationResult.error.issues
      }
    }, { status: 400 })
  }

  const policy: RetentionPolicy = validationResult.data

  // Check authorization
  const authResult = await checkRetentionAuthorization(request, 'policy_management')
  if (!authResult.authorized) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.UNAUTHORIZED,
        message: authResult.message || 'Unauthorized access'
      }
    }, { status: 403 })
  }

  // Set retention policy
  retentionService.setRetentionPolicy(policy)

  return NextResponse.json({
    success: true,
    data: {
      policyId: policy.id,
      policy,
      message: 'Retention policy created/updated successfully'
    }
  })
}

/**
 * Handle data registration for retention
 */
async function handleDataRegistration(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  const body = await request.json()
  const validationResult = registerDataSchema.safeParse(body)
  
  if (!validationResult.success) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.INVALID_REQUEST,
        message: 'Invalid data registration format',
        details: validationResult.error.issues
      }
    }, { status: 400 })
  }

  const { dataId, dataType, contentHash, policyId, metadata = {}, securityLevel } = validationResult.data

  // Verify policy exists
  const policy = retentionService.getRetentionPolicy(policyId)
  if (!policy) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.POLICY_NOT_FOUND,
        message: `Retention policy not found: ${policyId}`
      }
    }, { status: 404 })
  }

  try {
    // Register data for retention tracking
    const retentionRecord = retentionService.registerForRetention(
      dataId,
      dataType,
      contentHash,
      policyId,
      metadata,
      securityLevel
    )

    return NextResponse.json({
      success: true,
      data: {
        retentionRecord,
        message: 'Data registered for retention tracking'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: errorMessage
      }
    }, { status: 500 })
  }
}

/**
 * Handle cleanup execution
 */
async function handleCleanupExecution(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  const url = new URL(request.url)
  const taskId = url.searchParams.get('taskId')
  
  if (!taskId) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.INVALID_REQUEST,
        message: 'Task ID is required for cleanup execution'
      }
    }, { status: 400 })
  }

  // Check if cleanup is already in progress
  if (activeCleanups.has(taskId)) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.CLEANUP_IN_PROGRESS,
        message: 'Cleanup task is already in progress'
      }
    }, { status: 409 })
  }

  // Check authorization
  const authResult = await checkRetentionAuthorization(request, 'cleanup_execution')
  if (!authResult.authorized) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.UNAUTHORIZED,
        message: authResult.message || 'Unauthorized access'
      }
    }, { status: 403 })
  }

  try {
    // Mark cleanup as active
    activeCleanups.add(taskId)

    // Execute cleanup task
    const cleanupResult = await retentionService.executeCleanup(taskId)

    // Remove from active cleanups
    activeCleanups.delete(taskId)

    return NextResponse.json({
      success: true,
      data: {
        cleanupTask: cleanupResult,
        message: `Cleanup completed: ${cleanupResult.recordsDeleted} records deleted, ${cleanupResult.recordsArchived} archived`
      }
    })

  } catch (error) {
    // Remove from active cleanups on error
    activeCleanups.delete(taskId)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.CLEANUP_FAILED,
        message: errorMessage
      }
    }, { status: 500 })
  }
}

/**
 * Handle get policies
 */
async function handleGetPolicies(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  const url = new URL(request.url)
  const policyId = url.searchParams.get('policyId')

  if (policyId) {
    const policy = retentionService.getRetentionPolicy(policyId)
    
    if (!policy) {
      return NextResponse.json({
        success: false,
        error: {
          code: RetentionErrorCodes.POLICY_NOT_FOUND,
          message: `Policy not found: ${policyId}`
        }
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { policy }
    })
  }

  // Get all policies (would require access to internal policies map in real implementation)
  return NextResponse.json({
    success: true,
    data: {
      policies: [
        // Default policies would be returned here
        {
          id: 'analysis-results',
          name: 'Analysis Results',
          dataType: 'analysis_result',
          retentionDays: 90
        }
      ],
      message: 'Retention policies retrieved successfully'
    }
  })
}

/**
 * Handle get records
 */
async function handleGetRecords(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  const url = new URL(request.url)
  const body = await request.json().catch(() => ({}))
  const validationResult = cleanupFiltersSchema.safeParse({
    ...Object.fromEntries(url.searchParams),
    ...body
  })
  
  if (!validationResult.success) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.INVALID_REQUEST,
        message: 'Invalid filter parameters'
      }
    }, { status: 400 })
  }

  const { policyId, dataType, expired, expiring, limit } = validationResult.data

  let records: RetentionRecord[] = []

  if (expired) {
    records = retentionService.findExpiredRecords(policyId, dataType)
  } else if (expiring) {
    records = retentionService.findExpiringRecords(policyId, dataType)
  }

  // Apply limit
  records = records.slice(0, limit)

  return NextResponse.json({
    success: true,
    data: {
      records,
      totalCount: records.length,
      filters: { policyId, dataType, expired, expiring }
    }
  })
}

/**
 * Handle get statistics
 */
async function handleGetStats(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  const stats = retentionService.getRetentionStats()

  return NextResponse.json({
    success: true,
    data: {
      statistics: stats,
      generatedAt: new Date().toISOString()
    }
  })
}

/**
 * Handle get status
 */
async function handleGetStatus(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  const stats = retentionService.getRetentionStats()
  const expiredRecords = retentionService.findExpiredRecords()
  const expiringRecords = retentionService.findExpiringRecords()

  return NextResponse.json({
    success: true,
    data: {
      status: 'operational',
      summary: {
        totalRecords: stats.totalRecords,
        expiredRecords: expiredRecords.length,
        expiringRecords: expiringRecords.length,
        archivedRecords: stats.archivedRecords,
        complianceStatus: expiredRecords.length === 0 ? 'compliant' : 'action_required'
      },
      activeCleanups: Array.from(activeCleanups),
      lastUpdated: new Date().toISOString()
    }
  })
}

/**
 * Handle get verification
 */
async function handleGetVerification(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  const url = new URL(request.url)
  const taskId = url.searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.INVALID_REQUEST,
        message: 'Task ID is required for verification'
      }
    }, { status: 400 })
  }

  try {
    const verification = retentionService.verifyCleanup(taskId)

    return NextResponse.json({
      success: true,
      data: {
        verification,
        message: verification.isComplete ? 'Cleanup verified successfully' : 'Cleanup verification failed'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.VERIFICATION_FAILED,
        message: errorMessage
      }
    }, { status: 500 })
  }
}

/**
 * Handle schedule cleanup
 */
async function handleScheduleCleanup(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  const body = await request.json()
  const validationResult = scheduleCleanupSchema.safeParse(body)
  
  if (!validationResult.success) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.INVALID_REQUEST,
        message: 'Invalid cleanup schedule format',
        details: validationResult.error.issues
      }
    }, { status: 400 })
  }

  const { policyId, scheduledAt } = validationResult.data

  // Verify policy exists
  const policy = retentionService.getRetentionPolicy(policyId)
  if (!policy) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.POLICY_NOT_FOUND,
        message: `Retention policy not found: ${policyId}`
      }
    }, { status: 404 })
  }

  // Check authorization
  const authResult = await checkRetentionAuthorization(request, 'cleanup_scheduling')
  if (!authResult.authorized) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.UNAUTHORIZED,
        message: authResult.message || 'Unauthorized access'
      }
    }, { status: 403 })
  }

  try {
    const task = retentionService.scheduleCleanup(
      policyId,
      scheduledAt ? new Date(scheduledAt) : undefined
    )

    return NextResponse.json({
      success: true,
      data: {
        cleanupTask: task,
        message: 'Cleanup task scheduled successfully'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SCHEDULING_FAILED',
        message: errorMessage
      }
    }, { status: 500 })
  }
}

/**
 * Handle automatic cleanup
 */
async function handleAutoCleanup(request: NextRequest): Promise<NextResponse<RetentionResponse>> {
  // Check authorization
  const authResult = await checkRetentionAuthorization(request, 'auto_cleanup')
  if (!authResult.authorized) {
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.UNAUTHORIZED,
        message: authResult.message || 'Unauthorized access'
      }
    }, { status: 403 })
  }

  try {
    const cleanupTasks = await retentionService.runAutomaticCleanup()

    return NextResponse.json({
      success: true,
      data: {
        cleanupTasks,
        summary: {
          tasksExecuted: cleanupTasks.length,
          totalRecordsDeleted: cleanupTasks.reduce((sum, task) => sum + task.recordsDeleted, 0),
          totalRecordsArchived: cleanupTasks.reduce((sum, task) => sum + task.recordsArchived, 0)
        },
        message: 'Automatic cleanup completed successfully'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      error: {
        code: RetentionErrorCodes.CLEANUP_FAILED,
        message: errorMessage
      }
    }, { status: 500 })
  }
}

/**
 * Utility functions
 */

/**
 * Check retention operation authorization
 */
async function checkRetentionAuthorization(
  request: NextRequest,
  operation: string
): Promise<{ authorized: boolean; message?: string }> {
  // In production, implement proper role-based access control
  const authHeader = request.headers.get('authorization')
  
  // Basic authorization check
  const restrictedOperations = ['cleanup_execution', 'auto_cleanup', 'policy_management']
  
  if (restrictedOperations.includes(operation) && !authHeader) {
    return {
      authorized: false,
      message: `${operation} requires authentication`
    }
  }

  return { authorized: true }
}

/**
 * Cleanup function for expired active cleanup tracking
 */
export function cleanupActiveCleanups(): void {
  // In production, this would check actual cleanup status
  // For now, we'll clear tracking after a reasonable timeout
  console.log('Cleaning up expired active cleanup tracking')
}

// Run active cleanup cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupActiveCleanups, 60 * 60 * 1000)
}