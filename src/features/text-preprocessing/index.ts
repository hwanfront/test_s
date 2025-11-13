// Text Preprocessing Module
// Handles cleaning, normalization, and content hashing for user-submitted text

export { 
  TextPreprocessor, 
  preprocessText,
  type PreprocessingOptions,
  type PreprocessingResult
} from './lib/preprocessor'

export { 
  ContentHasher,
  hashContent,
  generateContentFingerprint,
  generateShortId,
  type ContentHash,
  type HashingOptions
} from './lib/content-hasher'

export { TextSanitizer } from './lib/text-sanitizer'

// Re-export commonly used functions for convenience
export { preprocessText as preprocess } from './lib/preprocessor'
export { hashContent as hash } from './lib/content-hasher'