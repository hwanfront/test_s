/**
 * Secure Hash Comparison (Task T108)
 * 
 * Provides timing-attack resistant hash comparison and validation utilities
 * for privacy-safe content matching without exposing original data.
 * 
 * Constitutional Principle II: Legal Risk Minimization
 * - Secure comparison prevents timing-based content inference
 * - No original content exposure through side-channel attacks
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto'

/**
 * Hash comparison result
 */
interface HashComparisonResult {
  isMatch: boolean
  confidence: number
  metadata: {
    comparedAt: string
    processingTime: number
    method: 'timing-safe' | 'hmac-verified' | 'salted-hash'
    securityLevel: 'standard' | 'high' | 'maximum'
  }
}

/**
 * Hash validation result
 */
interface HashValidationResult {
  isValid: boolean
  format: 'sha256' | 'sha512' | 'unknown'
  strength: 'weak' | 'moderate' | 'strong'
  errors: string[]
  warnings: string[]
}

/**
 * Secure comparison configuration
 */
interface SecureComparisonConfig {
  enableTimingSafety: boolean
  requireHmacVerification: boolean
  saltLength: number
  hmacKey?: string
  maxHashAge: number
  securityLevel: 'standard' | 'high' | 'maximum'
}

/**
 * Secure hash comparison service
 */
export class SecureHashComparison {
  private config: Required<SecureComparisonConfig>
  private hmacKey: Buffer

  constructor(config?: Partial<SecureComparisonConfig>) {
    this.config = {
      enableTimingSafety: true,
      requireHmacVerification: false,
      saltLength: 32,
      hmacKey: config?.hmacKey || process.env.HASH_COMPARISON_KEY || 'default-comparison-key',
      maxHashAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      securityLevel: 'high',
      ...config
    }

    this.hmacKey = Buffer.from(this.config.hmacKey, 'utf-8')
  }

  /**
   * Perform timing-safe hash comparison
   */
  async compareHashes(
    hash1: string,
    hash2: string,
    options?: {
      requireExactMatch?: boolean
      enableHmacVerification?: boolean
    }
  ): Promise<HashComparisonResult> {
    const startTime = Date.now()

    try {
      // Validate input hashes
      const validation1 = this.validateHash(hash1)
      const validation2 = this.validateHash(hash2)

      if (!validation1.isValid || !validation2.isValid) {
        return {
          isMatch: false,
          confidence: 0,
          metadata: {
            comparedAt: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            method: 'timing-safe',
            securityLevel: this.config.securityLevel
          }
        }
      }

      // Ensure hashes are same length for timing-safe comparison
      const normalizedHash1 = this.normalizeHashForComparison(hash1)
      const normalizedHash2 = this.normalizeHashForComparison(hash2)

      let isMatch = false
      let method: 'timing-safe' | 'hmac-verified' | 'salted-hash' = 'timing-safe'

      if (this.config.enableTimingSafety) {
        // Timing-safe comparison using Node.js crypto
        if (normalizedHash1.length === normalizedHash2.length) {
          const buffer1 = Buffer.from(normalizedHash1, 'hex')
          const buffer2 = Buffer.from(normalizedHash2, 'hex')
          isMatch = timingSafeEqual(buffer1, buffer2)
        }
      } else {
        // Standard string comparison (less secure)
        isMatch = normalizedHash1 === normalizedHash2
      }

      // Optional HMAC verification for high-security scenarios
      if (options?.enableHmacVerification && this.config.requireHmacVerification) {
        const hmacMatch = await this.verifyHmacHashes(hash1, hash2)
        isMatch = isMatch && hmacMatch
        method = 'hmac-verified'
      }

      const confidence = isMatch ? 1.0 : 0.0

      return {
        isMatch,
        confidence,
        metadata: {
          comparedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          method,
          securityLevel: this.config.securityLevel
        }
      }

    } catch (error) {
      throw new Error(`Hash comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Compare content hash with stored hash securely
   */
  async compareContentHash(
    content: string,
    storedHash: string,
    salt?: string
  ): Promise<HashComparisonResult> {
    const startTime = Date.now()

    try {
      // Generate hash from content with same method as stored hash
      const contentHash = await this.generateSecureHash(content, salt)
      
      // Use timing-safe comparison
      const result = await this.compareHashes(contentHash, storedHash)

      return {
        ...result,
        metadata: {
          ...result.metadata,
          processingTime: Date.now() - startTime,
          method: 'salted-hash'
        }
      }

    } catch (error) {
      throw new Error(`Content hash comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate hash format and strength
   */
  validateHash(hash: string): HashValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    let format: 'sha256' | 'sha512' | 'unknown' = 'unknown'
    let strength: 'weak' | 'moderate' | 'strong' = 'weak'

    // Check if hash is string
    if (typeof hash !== 'string') {
      errors.push('Hash must be a string')
      return { isValid: false, format, strength, errors, warnings }
    }

    // Check if hash is empty
    if (!hash || hash.trim().length === 0) {
      errors.push('Hash cannot be empty')
      return { isValid: false, format, strength, errors, warnings }
    }

    // Normalize hash (remove whitespace, convert to lowercase)
    const normalizedHash = hash.trim().toLowerCase()

    // Check hex format
    if (!/^[a-f0-9]+$/.test(normalizedHash)) {
      errors.push('Hash must contain only hexadecimal characters')
      return { isValid: false, format, strength, errors, warnings }
    }

    // Determine format based on length
    switch (normalizedHash.length) {
      case 64:
        format = 'sha256'
        strength = 'strong'
        break
      case 128:
        format = 'sha512'
        strength = 'strong'
        break
      case 32:
        warnings.push('MD5 hash detected - consider upgrading to SHA-256')
        strength = 'moderate'
        break
      case 40:
        warnings.push('SHA-1 hash detected - consider upgrading to SHA-256')
        strength = 'moderate'
        break
      default:
        warnings.push(`Unusual hash length: ${normalizedHash.length} characters`)
        strength = 'weak'
    }

    // Check for obvious weak patterns
    if (normalizedHash === '0'.repeat(normalizedHash.length)) {
      errors.push('Hash appears to be all zeros')
      strength = 'weak'
    }

    if (normalizedHash === 'f'.repeat(normalizedHash.length)) {
      errors.push('Hash appears to be all maximum values')
      strength = 'weak'
    }

    // Check for repeated patterns
    if (this.hasRepeatedPattern(normalizedHash)) {
      warnings.push('Hash contains repeated patterns')
    }

    const isValid = errors.length === 0

    return {
      isValid,
      format,
      strength,
      errors,
      warnings
    }
  }

  /**
   * Generate secure hash with salt
   */
  async generateSecureHash(
    content: string,
    salt?: string,
    algorithm: 'sha256' | 'sha512' = 'sha256'
  ): Promise<string> {
    const actualSalt = salt || await this.generateSalt()
    const hashInput = content + actualSalt

    return createHash(algorithm)
      .update(hashInput)
      .digest('hex')
  }

  /**
   * Generate cryptographically secure salt
   */
  async generateSalt(length: number = this.config.saltLength): Promise<string> {
    const { randomBytes } = await import('crypto')
    return randomBytes(length).toString('hex')
  }

  /**
   * Create HMAC for hash verification
   */
  async createHmac(hash: string, key?: Buffer): Promise<string> {
    const actualKey = key || this.hmacKey
    return createHmac('sha256', actualKey)
      .update(hash)
      .digest('hex')
  }

  /**
   * Verify HMAC-protected hashes
   */
  private async verifyHmacHashes(hash1: string, hash2: string): Promise<boolean> {
    try {
      const hmac1 = await this.createHmac(hash1)
      const hmac2 = await this.createHmac(hash2)

      // Use timing-safe comparison for HMACs too
      if (hmac1.length === hmac2.length) {
        const buffer1 = Buffer.from(hmac1, 'hex')
        const buffer2 = Buffer.from(hmac2, 'hex')
        return timingSafeEqual(buffer1, buffer2)
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Normalize hash for secure comparison
   */
  private normalizeHashForComparison(hash: string): string {
    return hash.trim().toLowerCase()
  }

  /**
   * Check if hash has repeated patterns (potential weakness)
   */
  private hasRepeatedPattern(hash: string): boolean {
    const chunkSize = 4
    const chunks = []

    for (let i = 0; i < hash.length; i += chunkSize) {
      chunks.push(hash.substring(i, i + chunkSize))
    }

    const uniqueChunks = new Set(chunks)
    return uniqueChunks.size < chunks.length * 0.8 // Less than 80% unique chunks
  }

  /**
   * Compare multiple hashes efficiently
   */
  async compareHashList(
    targetHash: string,
    hashList: string[]
  ): Promise<{
    matches: Array<{ index: number; hash: string; confidence: number }>
    processingTime: number
    totalComparisons: number
  }> {
    const startTime = Date.now()
    const matches: Array<{ index: number; hash: string; confidence: number }> = []

    for (let i = 0; i < hashList.length; i++) {
      const result = await this.compareHashes(targetHash, hashList[i])
      if (result.isMatch) {
        matches.push({
          index: i,
          hash: hashList[i],
          confidence: result.confidence
        })
      }
    }

    return {
      matches,
      processingTime: Date.now() - startTime,
      totalComparisons: hashList.length
    }
  }

  /**
   * Benchmark comparison performance
   */
  async benchmarkComparison(iterations: number = 1000): Promise<{
    averageTime: number
    totalTime: number
    iterations: number
    hashesPerSecond: number
  }> {
    const testHash1 = 'a'.repeat(64) // SHA-256 length
    const testHash2 = 'b'.repeat(64)

    const startTime = Date.now()

    for (let i = 0; i < iterations; i++) {
      await this.compareHashes(testHash1, testHash2)
    }

    const totalTime = Date.now() - startTime
    const averageTime = totalTime / iterations
    const hashesPerSecond = Math.round((iterations * 1000) / totalTime)

    return {
      averageTime,
      totalTime,
      iterations,
      hashesPerSecond
    }
  }

  /**
   * Get security configuration report
   */
  getSecurityReport(): {
    configuration: SecureComparisonConfig
    securityFeatures: {
      timingSafeComparison: boolean
      hmacVerification: boolean
      saltedHashing: boolean
      secureRandomSalt: boolean
    }
    recommendations: string[]
  } {
    const recommendations: string[] = []

    if (!this.config.enableTimingSafety) {
      recommendations.push('Enable timing-safe comparison to prevent timing attacks')
    }

    if (this.config.securityLevel === 'standard') {
      recommendations.push('Consider upgrading to high or maximum security level')
    }

    if (this.config.saltLength < 16) {
      recommendations.push('Use salt length of at least 16 bytes for better security')
    }

    if (this.config.hmacKey === 'default-comparison-key') {
      recommendations.push('Set a custom HMAC key in production')
    }

    return {
      configuration: this.config,
      securityFeatures: {
        timingSafeComparison: this.config.enableTimingSafety,
        hmacVerification: this.config.requireHmacVerification,
        saltedHashing: this.config.saltLength > 0,
        secureRandomSalt: true // We use crypto.randomBytes
      },
      recommendations
    }
  }
}

/**
 * Default secure hash comparison instance
 */
export const defaultHashComparison = new SecureHashComparison({
  enableTimingSafety: true,
  securityLevel: 'high',
  saltLength: 32
})

/**
 * High-security hash comparison instance
 */
export const secureHashComparison = new SecureHashComparison({
  enableTimingSafety: true,
  requireHmacVerification: true,
  securityLevel: 'maximum',
  saltLength: 64
})

// Export types
export type { 
  HashComparisonResult, 
  HashValidationResult, 
  SecureComparisonConfig 
}