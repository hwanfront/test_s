import { z } from 'zod'

// Analysis schemas
export const CreateAnalysisSessionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  termsText: z.string().min(100, 'Terms text must be at least 100 characters').max(50000, 'Terms text too long'),
})

export const UpdateAnalysisSessionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
})

// User schemas
export const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  avatar_url: z.string().url('Invalid URL').optional(),
})

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
})

export const AnalysisFilterSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// Request validation helper
export const validateRequest = async <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> => {
  try {
    return await schema.parseAsync(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.map((err: z.ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      throw new Error(`Validation failed: ${fieldErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`)
    }
    throw error
  }
}

// Synchronous validation helper
export const validateInput = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T => {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = (error as any).errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      throw new Error(`Validation failed: ${fieldErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`)
    }
    throw error
  }
}

// Export types
export type CreateAnalysisSessionData = z.infer<typeof CreateAnalysisSessionSchema>
export type UpdateAnalysisSessionData = z.infer<typeof UpdateAnalysisSessionSchema>
export type UpdateUserData = z.infer<typeof UpdateUserSchema>
export type PaginationParams = z.infer<typeof PaginationSchema>
export type AnalysisFilterParams = z.infer<typeof AnalysisFilterSchema>