/**
 * GET /api/quota API Route (Task T091)
 * 
 * Provides user quota information for daily analysis limits tracking
 * following Next.js 14+ app router conventions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/shared/config/auth'
import { QuotaCalculator, QUOTA_CONFIG } from '@/entities/quota/lib/quota-calculator'

/**
 * Quota response interface matching API contracts
 */
interface QuotaStatusResponse {
  userId: string
  dailyLimit: number
  currentUsage: number
  remainingAnalyses: number
  quotaStatus: 'active' | 'exceeded' | 'reset_pending'
  resetTime: string // ISO date string
  usagePercentage: number
  canPerformAnalysis: boolean
  lastUpdated: string // ISO date string
}

interface QuotaUsageResponse {
  success: boolean
  newUsage: number
  remainingAnalyses: number
  quotaExceeded: boolean
  message?: string
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string
  message: string
  timestamp: string
}

/**
 * GET /api/quota
 * 
 * Retrieves current user's daily quota information
 * Used by frontend to display quota status and enforce limits
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      const errorResponse: ErrorResponse = {
        error: 'authentication_required',
        message: 'User must be authenticated to access quota information',
        timestamp: new Date().toISOString()
      }

      return NextResponse.json(errorResponse, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })
    }

    const userId = session.user.id
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    // Get current quota record for today
    const dailyQuotaRecord = await getDailyQuotaRecord(userId, today)
    
    // Calculate quota status using static method
    const quotaStatus = QuotaCalculator.calculateQuotaStatus(
      [dailyQuotaRecord], // Pass as array as expected by method
      new Date()
    )

    // Calculate next reset time (midnight KST)
    const nextResetAt = calculateNextResetTime()

    // Build response according to API contract
    const quotaResponse: QuotaStatusResponse = {
      userId: userId,
      dailyLimit: 3, // Default limit
      currentUsage: dailyQuotaRecord.analysis_count,
      remainingAnalyses: quotaStatus.remainingAnalyses,
      quotaStatus: quotaStatus.remainingAnalyses > 0 ? 'active' : 'exceeded',
      resetTime: nextResetAt.toISOString(),
      usagePercentage: Math.round((dailyQuotaRecord.analysis_count / 3) * 100),
      canPerformAnalysis: quotaStatus.remainingAnalyses > 0,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(quotaResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Quota retrieval error:', error)

    const errorResponse: ErrorResponse = {
      error: 'quota_error',
      message: 'Failed to retrieve quota information',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })
  }
}

/**
 * Helper function to get or create daily quota record
 */
async function getDailyQuotaRecord(userId: string, date: string) {
  // Note: In real implementation, this would query Supabase database
  // For now, return mock data that simulates database record
  
  try {
    // Simulate database query for existing record
    // const { data: existingRecord } = await supabase
    //   .from('daily_quotas')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .eq('date', date)
    //   .single()

    // Mock data matching DailyQuotaRecord interface
    const mockRecord = {
      user_id: userId,
      quota_date: date,
      analysis_count: 1, // Simulate some usage
      created_at: new Date(),
      updated_at: new Date()
    }

    return mockRecord

  } catch (error) {
    // If record doesn't exist, create new one
    // const { data: newRecord } = await supabase
    //   .from('daily_quotas')
    //   .insert({
    //     user_id: userId,
    //     quota_date: date,
    //     analysis_count: 0,
    //     created_at: new Date(),
    //     updated_at: new Date()
    //   })
    //   .select()
    //   .single()

    // Mock new record
    const newRecord = {
      user_id: userId,
      quota_date: date,
      analysis_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    }

    return newRecord
  }
}

/**
 * Calculate next quota reset time (midnight KST)
 */
function calculateNextResetTime(): Date {
  const now = new Date()
  const kstOffset = 9 * 60 // KST is UTC+9
  
  // Get current time in KST
  const kstTime = new Date(now.getTime() + (kstOffset * 60 * 1000))
  
  // Calculate next midnight KST
  const nextMidnightKST = new Date(kstTime)
  nextMidnightKST.setHours(24, 0, 0, 0) // Set to next midnight
  
  // Convert back to UTC
  const nextResetUTC = new Date(nextMidnightKST.getTime() - (kstOffset * 60 * 1000))
  
  return nextResetUTC
}

/**
 * POST /api/quota
 * 
 * Updates quota usage (for analysis consumption)
 * This endpoint would be called internally when an analysis is performed
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      const errorResponse: ErrorResponse = {
        error: 'authentication_required',
        message: 'User must be authenticated to update quota',
        timestamp: new Date().toISOString()
      }

      return NextResponse.json(errorResponse, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { increment = 1, type = 'free' } = body

    if (typeof increment !== 'number' || increment < 1 || increment > 10) {
      const errorResponse: ErrorResponse = {
        error: 'invalid_increment',
        message: 'Increment must be a number between 1 and 10',
        timestamp: new Date().toISOString()
      }

      return NextResponse.json(errorResponse, { status: 400 })
    }

    const userId = session.user.id
    const today = new Date().toISOString().split('T')[0]

    // Get current quota record
    const dailyQuotaRecord = await getDailyQuotaRecord(userId, today)

    // Check if increment is allowed using static method
    const dailyRecords = [dailyQuotaRecord]
    const currentStatus = QuotaCalculator.calculateQuotaStatus(
      dailyRecords,
      new Date(),
      QUOTA_CONFIG.DAILY_LIMIT
    )

    if (currentStatus.remainingAnalyses < increment) {
      const errorResponse: ErrorResponse = {
        error: 'quota_exceeded',
        message: 'Daily quota limit would be exceeded',
        timestamp: new Date().toISOString()
      }

      return NextResponse.json(errorResponse, { status: 429 })
    }

    // Update quota usage - increment the analysis count
    // Note: In real implementation, this would update the database
    const updatedRecord = QuotaCalculator.incrementUsage(
      dailyQuotaRecord,
      userId,
      new Date()
    )

    // Calculate new status after increment
    const newStatus = QuotaCalculator.calculateQuotaStatus(
      [updatedRecord],
      new Date(),
      QUOTA_CONFIG.DAILY_LIMIT
    )

    const quotaResponse: QuotaUsageResponse = {
      success: true,
      newUsage: updatedRecord.analysis_count,
      remainingAnalyses: newStatus.remainingAnalyses,
      quotaExceeded: newStatus.remainingAnalyses <= 0,
      message: 'Quota usage updated successfully'
    }

    return NextResponse.json(quotaResponse, { status: 200 })

  } catch (error) {
    console.error('Quota update error:', error)

    const errorResponse: ErrorResponse = {
      error: 'quota_update_error',
      message: 'Failed to update quota usage',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      error: 'method_not_allowed',
      message: 'PUT method not supported for quota endpoint',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  )
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      error: 'method_not_allowed',
      message: 'DELETE method not supported for quota endpoint',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  )
}

export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      error: 'method_not_allowed',
      message: 'PATCH method not supported for quota endpoint',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  )
}