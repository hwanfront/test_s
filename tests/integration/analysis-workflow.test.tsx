import { render, screen, fireEvent, waitFor } from '@/tests/setup/test-utils'
import { AnalysisWorkflow } from '@/features/ai-analysis/components/analysis-workflow'
import { mockAnalysisResult } from '@/tests/__mocks__/data'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Analysis Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('should complete full analysis workflow successfully', async () => {
    // Mock successful API responses
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'session-123',
          status: 'processing',
          estimatedTimeMs: 15000,
          contentLength: 67,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'session-123',
          status: 'completed',
          progress: 100
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResult
      })

    render(
      <AnalysisWorkflow
        onAnalysisComplete={() => {}}
        onAnalysisError={() => {}}
      />
    )

    // Step 1: Text input
    const textInput = screen.getByPlaceholderText('Copy and paste the terms and conditions text you want to analyze...')
    const sampleText = 'We reserve the right to terminate your account at any time without notice. This is a long enough sample text to meet the minimum requirements for analysis.'

    fireEvent.change(textInput, { target: { value: sampleText } })

    // Step 2: Submit analysis
    const submitButton = screen.getByText('Analyze Terms & Conditions')
    expect(submitButton).not.toBeDisabled()

    fireEvent.click(submitButton)

    // Step 3: Verify processing state
    await waitFor(() => {
      expect(screen.getByText('Analyzing Terms & Conditions')).toBeInTheDocument()
    })

    // Step 4: Wait for results
    await waitFor(() => {
      expect(screen.getByText('Analysis Summary')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Verify API calls were made
    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect(global.fetch).toHaveBeenCalledWith('/api/analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: sampleText.trim()
      })
    })
  })

  it('should handle analysis errors gracefully', async () => {
    // Mock API error
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Analysis failed'))

    render(
      <AnalysisWorkflow
        onAnalysisComplete={() => {}}
        onAnalysisError={() => {}}
      />
    )

    const textInput = screen.getByPlaceholderText('Copy and paste the terms and conditions text you want to analyze...')
    const sampleText = 'Short text that is long enough to meet the minimum requirements for testing error handling.'

    fireEvent.change(textInput, { target: { value: sampleText } })

    const submitButton = screen.getByText('Analyze Terms & Conditions')
    fireEvent.click(submitButton)

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Analysis Error')).toBeInTheDocument()
    })
  })

  it('should validate minimum text length', () => {
    render(
      <AnalysisWorkflow
        onAnalysisComplete={() => {}}
        onAnalysisError={() => {}}
      />
    )

    const textInput = screen.getByPlaceholderText('Copy and paste the terms and conditions text you want to analyze...')
    const submitButton = screen.getByText('Analyze Terms & Conditions')

    // Too short text
    fireEvent.change(textInput, { target: { value: 'Short text' } })
    expect(submitButton).toBeDisabled()

    // Valid length text
    const validText = 'This is a much longer text that meets the minimum character requirements for analysis processing.'
    fireEvent.change(textInput, { target: { value: validText } })
    expect(submitButton).not.toBeDisabled()
  })

  it('should handle quota exceeded error', async () => {
    // Mock quota exceeded response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        message: 'Daily analysis limit exceeded'
      })
    })

    render(
      <AnalysisWorkflow
        onAnalysisComplete={() => {}}
        onAnalysisError={() => {}}
      />
    )

    const textInput = screen.getByPlaceholderText('Copy and paste the terms and conditions text you want to analyze...')
    const sampleText = 'Valid length text for testing quota exceeded functionality in the analysis system.'

    fireEvent.change(textInput, { target: { value: sampleText } })

    const submitButton = screen.getByText('Analyze Terms & Conditions')
    fireEvent.click(submitButton)

    // Should show quota error
    await waitFor(() => {
      expect(screen.getByText('Daily analysis limit exceeded')).toBeInTheDocument()
    })
  })

  it('should handle authentication required error', async () => {
    // Mock authentication error
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401
    })

    render(
      <AnalysisWorkflow
        onAnalysisComplete={() => {}}
        onAnalysisError={() => {}}
      />
    )

    const textInput = screen.getByPlaceholderText('Copy and paste the terms and conditions text you want to analyze...')
    const sampleText = 'Valid length text for testing authentication required functionality in the analysis system.'

    fireEvent.change(textInput, { target: { value: sampleText } })

    const submitButton = screen.getByText('Analyze Terms & Conditions')
    fireEvent.click(submitButton)

    // Should show auth error
    await waitFor(() => {
      expect(screen.getByText('Please sign in to analyze terms and conditions')).toBeInTheDocument()
    })
  })
})