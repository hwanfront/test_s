import { createHash } from 'crypto'

export interface ContentHash {
  hash: string
  algorithm: string
  length: number
  timestamp: string
}

export interface HashingOptions {
  algorithm?: 'sha256' | 'sha1' | 'md5'
  includeTimestamp?: boolean
  includeSalt?: boolean
  salt?: string
}

/**
 * Content hashing service for generating unique identifiers for text content
 * Used for caching, deduplication, and content tracking
 */
export class ContentHasher {
  private defaultSalt: string

  constructor() {
    // Generate a default salt from environment or create one
    this.defaultSalt = process.env.CONTENT_HASH_SALT || 'terms-watcher-default-salt'
  }

  /**
   * Generate a hash for the given content
   * @param content Text content to hash
   * @param options Hashing configuration
   * @returns Hash string
   */
  generateHash(content: string, options: HashingOptions = {}): string {
    const config: Required<HashingOptions> = {
      algorithm: 'sha256',
      includeTimestamp: false,
      includeSalt: true,
      salt: this.defaultSalt,
      ...options
    }

    let hashInput = content

    // Add salt if enabled
    if (config.includeSalt) {
      hashInput = config.salt + hashInput
    }

    // Add timestamp if enabled
    if (config.includeTimestamp) {
      const timestamp = new Date().toISOString()
      hashInput = hashInput + timestamp
    }

    // Generate the hash
    const hash = createHash(config.algorithm)
      .update(hashInput, 'utf8')
      .digest('hex')

    return hash
  }

  /**
   * Generate a hash with full metadata
   * @param content Text content to hash
   * @param options Hashing configuration
   * @returns Hash object with metadata
   */
  generateHashWithMetadata(content: string, options: HashingOptions = {}): ContentHash {
    const hash = this.generateHash(content, options)
    const algorithm = options.algorithm || 'sha256'
    
    return {
      hash,
      algorithm,
      length: hash.length,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Generate a simple hash for content (convenience method)
   * @param content Content to hash
   * @returns Hash string
   */
  hash(content: string): string {
    return this.generateHash(content)
  }

  /**
   * Generate a hash with salt for security
   * @param content Content to hash
   * @param salt Custom salt value
   * @returns Hash string
   */
  hashWithSalt(content: string, salt: string): string {
    return this.generateHash(content, { salt, includeSalt: true })
  }

  /**
   * Generate a time-based hash (includes timestamp)
   * @param content Content to hash
   * @returns Hash object with timestamp
   */
  hashWithTimestamp(content: string): ContentHash {
    return this.generateHashWithMetadata(content, { includeTimestamp: true })
  }

  /**
   * Verify that a hash matches the given content
   * @param content Original content
   * @param expectedHash Hash to verify against
   * @param options Options used when generating the original hash
   * @returns True if hash matches
   */
  verifyHash(
    content: string,
    expectedHash: string,
    options: HashingOptions = {}
  ): boolean {
    const generated = this.generateHash(content, {
      ...options,
      includeTimestamp: false // Timestamp would make verification impossible
    })
    
    return generated === expectedHash
  }

  /**
   * Generate a content fingerprint for deduplication
   * This is a normalized hash that should be the same for similar content
   * @param content Content to fingerprint
   * @returns Fingerprint hash
   */
  generateFingerprint(content: string): string {
    // Normalize content for fingerprinting
    const normalized = this.normalizeForFingerprint(content)
    
    return this.generateHash(normalized, {
      algorithm: 'sha256',
      includeSalt: false, // No salt for fingerprints to allow comparison
      includeTimestamp: false
    })
  }

  /**
   * Normalize content for consistent fingerprinting
   */
  private normalizeForFingerprint(content: string): string {
    return content
      // Convert to lowercase
      .toLowerCase()
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove punctuation (keep basic structure)
      .replace(/[^\w\s]/g, '')
      // Trim
      .trim()
  }

  /**
   * Generate a short hash suitable for URLs or IDs
   * @param content Content to hash
   * @param length Desired length (default 8)
   * @returns Short hash string
   */
  generateShortHash(content: string, length: number = 8): string {
    const fullHash = this.hash(content)
    return fullHash.substring(0, length)
  }

  /**
   * Generate multiple hashes with different algorithms
   * @param content Content to hash
   * @returns Object with different algorithm hashes
   */
  generateMultipleHashes(content: string): {
    sha256: string
    sha1: string
    md5: string
  } {
    return {
      sha256: this.generateHash(content, { algorithm: 'sha256' }),
      sha1: this.generateHash(content, { algorithm: 'sha1' }),
      md5: this.generateHash(content, { algorithm: 'md5' })
    }
  }

  /**
   * Check if two pieces of content have the same fingerprint
   * @param content1 First content
   * @param content2 Second content
   * @returns True if fingerprints match
   */
  haveSameFingerprint(content1: string, content2: string): boolean {
    const fp1 = this.generateFingerprint(content1)
    const fp2 = this.generateFingerprint(content2)
    return fp1 === fp2
  }

  /**
   * Generate a hash for tracking content versions
   * @param content Content to hash
   * @param version Version identifier
   * @returns Hash that includes version info
   */
  generateVersionHash(content: string, version: string): string {
    const versionedContent = `${version}:${content}`
    return this.generateHash(versionedContent)
  }
}

// Convenience functions for common use cases
export function hashContent(content: string): string {
  const hasher = new ContentHasher()
  return hasher.hash(content)
}

export function generateContentFingerprint(content: string): string {
  const hasher = new ContentHasher()
  return hasher.generateFingerprint(content)
}

export function generateShortId(content: string, length: number = 8): string {
  const hasher = new ContentHasher()
  return hasher.generateShortHash(content, length)
}