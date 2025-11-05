/**
 * Automated Cleanup Scheduler (Task T112)
 * 
 * Automated scheduling system for data cleanup and retention policy enforcement
 * to ensure continuous privacy compliance without manual intervention.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Automated, scheduled data cleanup operations
 * - No manual intervention required for compliance
 * - Comprehensive monitoring and alerting
 * 
 * @module shared/lib/cleanup/cleanup-scheduler
 */

import { AnalysisSessionCleanupService } from './session-cleanup'
import { DataRetentionPolicyService } from './retention-policy'

/**
 * Cleanup job configuration
 */
export interface CleanupJobConfig {
  /** Unique job identifier */
  id: string
  /** Human-readable job name */
  name: string
  /** Job description */
  description: string
  /** Cron expression for scheduling */
  schedule: string
  /** Whether the job is enabled */
  enabled: boolean
  /** Maximum execution time in milliseconds */
  timeoutMs: number
  /** Number of retries on failure */
  maxRetries: number
  /** Delay between retries in milliseconds */
  retryDelayMs: number
  /** Job priority (higher = more important) */
  priority: number
  /** Last execution timestamp */
  lastExecution?: string
  /** Next scheduled execution */
  nextExecution?: string
}

/**
 * Cleanup job execution result
 */
export interface CleanupJobResult {
  /** Job ID that was executed */
  jobId: string
  /** Execution start time */
  startedAt: string
  /** Execution completion time */
  completedAt: string
  /** Execution duration in milliseconds */
  duration: number
  /** Whether execution was successful */
  success: boolean
  /** Data processed during execution */
  dataProcessed: {
    sessionsDeleted: number
    assessmentsDeleted: number
    recordsDeleted: number
    spaceFreed: number
  }
  /** Error message if execution failed */
  error?: string
  /** Warnings generated during execution */
  warnings: string[]
  /** Next scheduled execution time */
  nextScheduled: string
}

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  /** Enable the scheduler */
  enabled: boolean
  /** Check interval for scheduled jobs (ms) */
  checkIntervalMs: number
  /** Maximum concurrent jobs */
  maxConcurrentJobs: number
  /** Enable job result persistence */
  persistResults: boolean
  /** Maximum job history to keep */
  maxHistoryEntries: number
  /** Enable email alerts for job failures */
  enableAlerts: boolean
  /** Timezone for cron scheduling */
  timezone: string
}

/**
 * Automated cleanup scheduler
 */
export class AutomatedCleanupScheduler {
  private config: Required<SchedulerConfig>
  private jobs: Map<string, CleanupJobConfig>
  private jobHistory: CleanupJobResult[]
  private runningJobs: Map<string, { startTime: number; abortController: AbortController }>
  private schedulerTimer?: NodeJS.Timeout
  private isSchedulerRunning: boolean

  // Cleanup service instances
  private sessionCleanup: AnalysisSessionCleanupService
  private retentionPolicy: DataRetentionPolicyService

  constructor(
    config?: Partial<SchedulerConfig>,
    services?: {
      sessionCleanup?: AnalysisSessionCleanupService
      retentionPolicy?: DataRetentionPolicyService
    }
  ) {
    this.config = {
      enabled: true,
      checkIntervalMs: 60 * 1000, // Check every minute
      maxConcurrentJobs: 3,
      persistResults: true,
      maxHistoryEntries: 1000,
      enableAlerts: false,
      timezone: 'Asia/Seoul',
      ...config
    }

    this.jobs = new Map()
    this.jobHistory = []
    this.runningJobs = new Map()
    this.isSchedulerRunning = false

    // Initialize cleanup services
    this.sessionCleanup = services?.sessionCleanup || new AnalysisSessionCleanupService()
    this.retentionPolicy = services?.retentionPolicy || new DataRetentionPolicyService()

    // Load default cleanup jobs
    this.loadDefaultJobs()
  }

  /**
   * Start the automated scheduler
   */
  async startScheduler(): Promise<void> {
    if (this.isSchedulerRunning) {
      throw new Error('Scheduler is already running')
    }

    if (!this.config.enabled) {
      throw new Error('Scheduler is disabled in configuration')
    }

    this.isSchedulerRunning = true
    
    // Start the main scheduler loop
    this.schedulerTimer = setInterval(
      () => this.checkAndExecuteJobs(),
      this.config.checkIntervalMs
    )

    console.log('Automated cleanup scheduler started')
  }

  /**
   * Stop the automated scheduler
   */
  async stopScheduler(): Promise<void> {
    if (!this.isSchedulerRunning) {
      return
    }

    this.isSchedulerRunning = false

    // Clear the scheduler timer
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer)
      this.schedulerTimer = undefined
    }

    // Abort all running jobs
    for (const [jobId, { abortController }] of this.runningJobs) {
      abortController.abort()
      console.log(`Aborted running job: ${jobId}`)
    }

    this.runningJobs.clear()
    console.log('Automated cleanup scheduler stopped')
  }

  /**
   * Add or update a cleanup job
   */
  async addJob(job: Omit<CleanupJobConfig, 'lastExecution' | 'nextExecution'>): Promise<void> {
    // Validate cron expression
    if (!this.isValidCronExpression(job.schedule)) {
      throw new Error(`Invalid cron expression: ${job.schedule}`)
    }

    const completeJob: CleanupJobConfig = {
      ...job,
      nextExecution: this.calculateNextExecution(job.schedule)
    }

    this.jobs.set(job.id, completeJob)
    console.log(`Added cleanup job: ${job.id}`)
  }

  /**
   * Remove a cleanup job
   */
  async removeJob(jobId: string): Promise<boolean> {
    // Abort job if it's currently running
    if (this.runningJobs.has(jobId)) {
      const { abortController } = this.runningJobs.get(jobId)!
      abortController.abort()
      this.runningJobs.delete(jobId)
    }

    const removed = this.jobs.delete(jobId)
    if (removed) {
      console.log(`Removed cleanup job: ${jobId}`)
    }
    return removed
  }

  /**
   * Execute a specific job manually
   */
  async executeJob(jobId: string): Promise<CleanupJobResult> {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error(`Job not found: ${jobId}`)
    }

    if (this.runningJobs.has(jobId)) {
      throw new Error(`Job is already running: ${jobId}`)
    }

    return this.executeJobInternal(job)
  }

  /**
   * Get job execution history
   */
  getJobHistory(jobId?: string, limit: number = 50): CleanupJobResult[] {
    let history = this.jobHistory

    if (jobId) {
      history = history.filter(result => result.jobId === jobId)
    }

    return history
      .slice(-limit)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
  }

  /**
   * Get scheduler statistics
   */
  getSchedulerStats(): {
    isRunning: boolean
    totalJobs: number
    enabledJobs: number
    runningJobs: number
    totalExecutions: number
    successRate: number
    lastExecution?: string
    nextExecution?: string
  } {
    const enabledJobs = Array.from(this.jobs.values()).filter(job => job.enabled).length
    const totalExecutions = this.jobHistory.length
    const successfulExecutions = this.jobHistory.filter(result => result.success).length
    const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 1.0

    const lastExecution = this.jobHistory.length > 0 
      ? this.jobHistory[this.jobHistory.length - 1].completedAt
      : undefined

    const nextExecution = this.calculateNextAnyJobExecution()

    return {
      isRunning: this.isSchedulerRunning,
      totalJobs: this.jobs.size,
      enabledJobs,
      runningJobs: this.runningJobs.size,
      totalExecutions,
      successRate,
      lastExecution,
      nextExecution
    }
  }

  /**
   * Get all jobs
   */
  getJobs(): CleanupJobConfig[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Get specific job
   */
  getJob(jobId: string): CleanupJobConfig | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Check and execute scheduled jobs
   */
  private async checkAndExecuteJobs(): Promise<void> {
    if (this.runningJobs.size >= this.config.maxConcurrentJobs) {
      return // Too many jobs running
    }

    const now = new Date()
    const dueJobs = Array.from(this.jobs.values())
      .filter(job => 
        job.enabled && 
        job.nextExecution && 
        new Date(job.nextExecution) <= now &&
        !this.runningJobs.has(job.id)
      )
      .sort((a, b) => b.priority - a.priority) // Higher priority first

    for (const job of dueJobs) {
      if (this.runningJobs.size >= this.config.maxConcurrentJobs) {
        break
      }

      try {
        // Execute job asynchronously
        this.executeJobInternal(job).catch(error => {
          console.error(`Job execution failed: ${job.id}`, error)
        })
      } catch (error) {
        console.error(`Failed to start job: ${job.id}`, error)
      }
    }
  }

  /**
   * Execute a job internally
   */
  private async executeJobInternal(job: CleanupJobConfig): Promise<CleanupJobResult> {
    const startTime = Date.now()
    const abortController = new AbortController()
    
    // Mark job as running
    this.runningJobs.set(job.id, { startTime, abortController })

    const result: CleanupJobResult = {
      jobId: job.id,
      startedAt: new Date(startTime).toISOString(),
      completedAt: '',
      duration: 0,
      success: false,
      dataProcessed: {
        sessionsDeleted: 0,
        assessmentsDeleted: 0,
        recordsDeleted: 0,
        spaceFreed: 0
      },
      warnings: [],
      nextScheduled: ''
    }

    try {
      // Set execution timeout
      const timeoutId = setTimeout(() => {
        abortController.abort()
        result.error = `Job timed out after ${job.timeoutMs}ms`
      }, job.timeoutMs)

      // Execute the appropriate cleanup operation
      await this.executeJobOperation(job, result, abortController.signal)

      clearTimeout(timeoutId)
      result.success = true

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.success = false

      // Send alert if enabled
      if (this.config.enableAlerts) {
        await this.sendJobFailureAlert(job, result)
      }
    } finally {
      // Update job execution times
      const now = new Date()
      result.completedAt = now.toISOString()
      result.duration = Date.now() - startTime
      result.nextScheduled = this.calculateNextExecution(job.schedule)

      // Update job config
      job.lastExecution = result.completedAt
      job.nextExecution = result.nextScheduled

      // Remove from running jobs
      this.runningJobs.delete(job.id)

      // Store result
      this.jobHistory.push(result)
      this.trimJobHistory()

      console.log(`Job completed: ${job.id}, success: ${result.success}, duration: ${result.duration}ms`)
    }

    return result
  }

  /**
   * Execute the actual cleanup operation for a job
   */
  private async executeJobOperation(
    job: CleanupJobConfig,
    result: CleanupJobResult,
    abortSignal: AbortSignal
  ): Promise<void> {
    switch (job.id) {
      case 'session-cleanup':
        await this.executeSessionCleanup(result, abortSignal)
        break
      case 'retention-policy':
        await this.executeRetentionPolicy(result, abortSignal)
        break
      case 'comprehensive-cleanup':
        await this.executeComprehensiveCleanup(result, abortSignal)
        break
      default:
        throw new Error(`Unknown job type: ${job.id}`)
    }
  }

  /**
   * Execute session cleanup
   */
  private async executeSessionCleanup(
    result: CleanupJobResult,
    abortSignal: AbortSignal
  ): Promise<void> {
    if (abortSignal.aborted) throw new Error('Job was aborted')

    const cleanupResult = await this.sessionCleanup.cleanupExpiredSessions()
    
    result.dataProcessed.sessionsDeleted = cleanupResult.cleanedSessions
    result.dataProcessed.assessmentsDeleted = cleanupResult.cleanedAssessments
    result.dataProcessed.spaceFreed = cleanupResult.freedSpace
    result.warnings = cleanupResult.warnings

    if (cleanupResult.errors.length > 0) {
      throw new Error(`Session cleanup errors: ${cleanupResult.errors.join(', ')}`)
    }
  }

  /**
   * Execute retention policy enforcement
   */
  private async executeRetentionPolicy(
    result: CleanupJobResult,
    abortSignal: AbortSignal
  ): Promise<void> {
    if (abortSignal.aborted) throw new Error('Job was aborted')

    const enforcementResult = await this.retentionPolicy.enforceRetentionPolicies()
    
    result.dataProcessed.recordsDeleted = enforcementResult.totalEntriesDeleted
    result.dataProcessed.spaceFreed += enforcementResult.estimatedSpaceFreed
    result.warnings = enforcementResult.warnings.map(w => w.warning)

    if (enforcementResult.errors.length > 0) {
      throw new Error(`Retention policy errors: ${enforcementResult.errors.map(e => e.error).join(', ')}`)
    }
  }

  /**
   * Execute comprehensive cleanup (both session and retention)
   */
  private async executeComprehensiveCleanup(
    result: CleanupJobResult,
    abortSignal: AbortSignal
  ): Promise<void> {
    // Execute session cleanup first
    await this.executeSessionCleanup(result, abortSignal)
    
    // Then execute retention policy
    const tempResult = {
      ...result,
      dataProcessed: {
        sessionsDeleted: 0,
        assessmentsDeleted: 0,
        recordsDeleted: 0,
        spaceFreed: 0
      },
      warnings: []
    }
    
    await this.executeRetentionPolicy(tempResult, abortSignal)
    
    // Combine results
    result.dataProcessed.recordsDeleted += tempResult.dataProcessed.recordsDeleted
    result.dataProcessed.spaceFreed += tempResult.dataProcessed.spaceFreed
    result.warnings = [...result.warnings, ...tempResult.warnings]
  }

  /**
   * Load default cleanup jobs
   */
  private loadDefaultJobs(): void {
    const defaultJobs: Array<Omit<CleanupJobConfig, 'lastExecution' | 'nextExecution'>> = [
      {
        id: 'session-cleanup',
        name: 'Session Cleanup',
        description: 'Clean up expired analysis sessions and risk assessments',
        schedule: '0 2 * * *', // Daily at 2 AM
        enabled: true,
        timeoutMs: 30 * 60 * 1000, // 30 minutes
        maxRetries: 3,
        retryDelayMs: 5 * 60 * 1000, // 5 minutes
        priority: 90
      },
      {
        id: 'retention-policy',
        name: 'Retention Policy Enforcement',
        description: 'Enforce data retention policies across all data types',
        schedule: '0 3 * * *', // Daily at 3 AM
        enabled: true,
        timeoutMs: 60 * 60 * 1000, // 1 hour
        maxRetries: 2,
        retryDelayMs: 10 * 60 * 1000, // 10 minutes
        priority: 80
      },
      {
        id: 'comprehensive-cleanup',
        name: 'Weekly Comprehensive Cleanup',
        description: 'Comprehensive cleanup of all expired data',
        schedule: '0 1 * * 0', // Weekly on Sunday at 1 AM
        enabled: true,
        timeoutMs: 2 * 60 * 60 * 1000, // 2 hours
        maxRetries: 1,
        retryDelayMs: 30 * 60 * 1000, // 30 minutes
        priority: 100
      }
    ]

    for (const job of defaultJobs) {
      this.addJob(job).catch(console.error)
    }
  }

  /**
   * Validate cron expression (simplified)
   */
  private isValidCronExpression(cron: string): boolean {
    // Basic validation - in production, use a proper cron parsing library
    const parts = cron.split(' ')
    return parts.length === 5 || parts.length === 6
  }

  /**
   * Calculate next execution time from cron expression
   */
  private calculateNextExecution(cron: string): string {
    // Simplified implementation - in production, use a proper cron parsing library
    // For now, just schedule for next day at the same time
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString()
  }

  /**
   * Calculate next execution time for any job
   */
  private calculateNextAnyJobExecution(): string | undefined {
    const nextExecutions = Array.from(this.jobs.values())
      .filter(job => job.enabled && job.nextExecution)
      .map(job => new Date(job.nextExecution!))
      .sort((a, b) => a.getTime() - b.getTime())

    return nextExecutions.length > 0 ? nextExecutions[0].toISOString() : undefined
  }

  /**
   * Trim job history to maximum size
   */
  private trimJobHistory(): void {
    if (this.jobHistory.length > this.config.maxHistoryEntries) {
      const excess = this.jobHistory.length - this.config.maxHistoryEntries
      this.jobHistory.splice(0, excess)
    }
  }

  /**
   * Send job failure alert
   */
  private async sendJobFailureAlert(
    job: CleanupJobConfig,
    result: CleanupJobResult
  ): Promise<void> {
    // TODO: Implement email alert system
    const alert = {
      subject: `Cleanup Job Failed: ${job.name}`,
      jobId: job.id,
      error: result.error,
      duration: result.duration,
      nextRetry: job.nextExecution
    }

    console.error('Job failure alert:', alert)
  }

  /**
   * Get running jobs status
   */
  getRunningJobs(): Array<{
    jobId: string
    startTime: string
    duration: number
  }> {
    const now = Date.now()
    return Array.from(this.runningJobs.entries()).map(([jobId, { startTime }]) => ({
      jobId,
      startTime: new Date(startTime).toISOString(),
      duration: now - startTime
    }))
  }

  /**
   * Clear job history
   */
  clearHistory(): void {
    this.jobHistory = []
  }
}

/**
 * Default cleanup scheduler instance
 */
export const defaultCleanupScheduler = new AutomatedCleanupScheduler()

/**
 * Create cleanup scheduler with custom configuration
 */
export function createCleanupScheduler(
  config?: Partial<SchedulerConfig>,
  services?: {
    sessionCleanup?: AnalysisSessionCleanupService
    retentionPolicy?: DataRetentionPolicyService
  }
): AutomatedCleanupScheduler {
  return new AutomatedCleanupScheduler(config, services)
}

/**
 * Utility function to start default scheduler
 */
export async function startAutomatedCleanup(): Promise<void> {
  return defaultCleanupScheduler.startScheduler()
}

/**
 * Utility function to stop default scheduler
 */
export async function stopAutomatedCleanup(): Promise<void> {
  return defaultCleanupScheduler.stopScheduler()
}

// Export types
export type {
  CleanupJobConfig as AutomatedCleanupJobConfig,
  CleanupJobResult as AutomatedCleanupJobResult,
  SchedulerConfig as AutomatedSchedulerConfig
}