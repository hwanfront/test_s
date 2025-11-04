export * from './errors'
export * from './validation'
export * from './api-utils'
// Note: auth middleware is exported separately due to jose dependency

// Utility function for conditional class names (similar to clsx)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}