/**
 * T146: Test for preventing "Maximum update depth exceeded" error
 * 
 * This test validates that validateContent() does not mutate store state during render
 * and that the AnalysisForm component handles validation safely.
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalysisForm } from '@/widgets/analysis-form/ui/analysis-form'
import { useAnalysisFormStore } from '@/widgets/analysis-form/model/store'

// Mock quota display
jest.mock('@/widgets/analysis-form/ui/quota-display', () => ({
  QuotaDisplay: () => <div data-testid="quota-display">Quota: 3/3</div>,
  useQuotaStatus: () => ({ canAnalyze: true, quotaStatus: { remaining: 3, total: 3 } })
}))

describe('T146: Analysis Form Render Safety', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAnalysisFormStore.getState().reset()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should not call setState during render phase', () => {
    // Track store updates
    const storeUpdates: any[] = []
    const originalSet = useAnalysisFormStore.setState
    
    useAnalysisFormStore.setState = (update: any) => {
      storeUpdates.push({
        update,
        stack: new Error().stack
      })
      return originalSet(update)
    }

    const mockSubmit = jest.fn()

    // Render the component - this should not trigger store updates during render
    const { rerender } = render(
      <AnalysisForm onSubmit={mockSubmit} />
    )

    // Initial render should not cause setState during render
    expect(storeUpdates.length).toBe(0)

    // Re-render should also be safe
    rerender(<AnalysisForm onSubmit={mockSubmit} />)
    expect(storeUpdates.length).toBe(0)

    // Restore original setState
    useAnalysisFormStore.setState = originalSet
  })

  it('should call validateContent without side effects during render', () => {
    const mockSubmit = jest.fn()
    const { content, validateContent } = useAnalysisFormStore.getState()

    // validateContent should be callable during render without side effects
    render(<AnalysisForm onSubmit={mockSubmit} />)

    // Call validateContent (simulating what happens in render)
    const result = validateContent()

    // Should return validation result
    expect(result).toHaveProperty('isValid')
    expect(result).toHaveProperty('errors')

    // Store content should not have changed
    expect(useAnalysisFormStore.getState().content).toBe(content)
  })

  it('should handle validation errors through event handlers, not render', async () => {
    const user = userEvent.setup()
    const mockSubmit = jest.fn()

    render(<AnalysisForm onSubmit={mockSubmit} showAdvancedOptions={false} />)

    const textarea = screen.getByLabelText(/terms and conditions text/i)

    // Type short content (below minimum)
    await user.type(textarea, 'Too short')

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /analyze/i })
    await user.click(submitButton)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // onSubmit should not have been called
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('should not trigger infinite re-renders when content changes', async () => {
    const user = userEvent.setup()
    const mockSubmit = jest.fn()

    let renderCount = 0
    const RenderCounter = () => {
      renderCount++
      return <AnalysisForm onSubmit={mockSubmit} />
    }

    render(<RenderCounter />)

    const initialRenderCount = renderCount
    const textarea = screen.getByLabelText(/terms and conditions text/i)

    // Type content
    await user.type(textarea, 'Hello')

    // Wait for any potential re-renders to settle
    await waitFor(() => {
      expect(renderCount).toBeLessThan(initialRenderCount + 20) // Should not explode
    }, { timeout: 1000 })
  })

  it('should apply validation errors via setErrors in effects/handlers only', async () => {
    const user = userEvent.setup()
    const mockSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'))

    render(<AnalysisForm onSubmit={mockSubmit} />)

    const textarea = screen.getByLabelText(/terms and conditions text/i)

    // Type valid content
    const validContent = 'A'.repeat(200) // Above minimum
    await user.clear(textarea)
    await user.type(textarea, validContent)

    // Submit
    const submitButton = screen.getByRole('button', { name: /analyze/i })
    await user.click(submitButton)

    // Should handle submission error
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
