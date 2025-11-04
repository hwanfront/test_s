import { render, screen, fireEvent } from '@/tests/setup/test-utils'
import { RiskHighlight } from '@/features/analysis-display/components/risk-highlight'
import { RiskCard } from '@/features/analysis-display/components/risk-card'
import { AnalysisSummary } from '@/features/analysis-display/components/analysis-summary'
import { ConfidenceIndicator } from '@/features/analysis-display/components/confidence-indicator'
import { ResultsViewer } from '@/features/analysis-display/components/results-viewer'

const mockRiskAssessment = {
  id: 'risk-1',
  clauseCategory: 'account-termination',
  riskLevel: 'critical' as const,
  riskScore: 95,
  confidenceScore: 92,
  summary: 'Arbitrary account termination without notice',
  rationale: 'This clause allows the service provider to terminate user accounts at any time without providing notice or justification, which is highly unfair to users.',
  suggestedAction: 'Look for services with clear termination policies that provide notice and appeal processes.',
  startPosition: 45,
  endPosition: 147,
  createdAt: '2025-11-05T10:30:15Z'
}

const mockAnalysisResult = {
  session: {
    id: 'session-1',
    contentLength: 1245,
    status: 'completed' as const,
    riskScore: 85,
    riskLevel: 'high' as const,
    confidenceScore: 92,
    processingTimeMs: 15420,
    createdAt: '2025-11-05T10:30:00Z',
    completedAt: '2025-11-05T10:30:15Z',
    expiresAt: '2025-11-12T10:30:00Z'
  },
  riskAssessments: [mockRiskAssessment],
  summary: {
    totalRisks: 3,
    riskBreakdown: {
      critical: 1,
      high: 1,
      medium: 1,
      low: 0
    },
    topCategories: [
      {
        category: 'account-termination',
        count: 1,
        averageRisk: 95
      }
    ],
    analysisLimitations: [
      'Analysis focused on mobile gaming industry patterns',
      'Legal interpretation may vary by jurisdiction'
    ],
    recommendedActions: [
      'Consider alternative services with fairer terms',
      'Review virtual currency policies carefully'
    ]
  }
}

describe('Analysis Display Components', () => {
  describe('RiskHighlight', () => {
    it('should render risk highlight with proper styling', () => {
      render(
        <RiskHighlight
          riskLevel="critical"
          summary="Account termination clause"
          onHover={() => {}}
        >
          We reserve the right to terminate your account
        </RiskHighlight>
      )

      const highlight = screen.getByText('We reserve the right to terminate your account')
      expect(highlight).toBeInTheDocument()
      expect(highlight).toHaveClass('risk-critical')
    })

    it('should show tooltip on hover', () => {
      const mockOnHover = jest.fn()
      
      render(
        <RiskHighlight
          riskLevel="high"
          summary="Data collection issue"
          onHover={mockOnHover}
        >
          We collect your personal data
        </RiskHighlight>
      )

      const highlight = screen.getByText('We collect your personal data')
      fireEvent.mouseEnter(highlight)

      expect(mockOnHover).toHaveBeenCalled()
      expect(screen.getByText('Data collection issue')).toBeInTheDocument()
    })

    it('should render different risk levels with appropriate styles', () => {
      const { rerender } = render(
        <RiskHighlight riskLevel="low" summary="Minor issue">
          Low risk content
        </RiskHighlight>
      )

      expect(screen.getByText('Low risk content')).toHaveClass('risk-low')

      rerender(
        <RiskHighlight riskLevel="critical" summary="Critical issue">
          Critical risk content
        </RiskHighlight>
      )

      expect(screen.getByText('Critical risk content')).toHaveClass('risk-critical')
    })
  })

  describe('RiskCard', () => {
    it('should display risk assessment information', () => {
      render(<RiskCard assessment={mockRiskAssessment} />)

      expect(screen.getByText('Arbitrary account termination without notice')).toBeInTheDocument()
      expect(screen.getByText('Account Termination')).toBeInTheDocument()
      expect(screen.getByText('Critical Risk')).toBeInTheDocument()
      expect(screen.getByText('95%')).toBeInTheDocument() // Risk score
      expect(screen.getByText('92%')).toBeInTheDocument() // Confidence score
    })

    it('should show detailed rationale when expanded', () => {
      render(<RiskCard assessment={mockRiskAssessment} />)

      const expandButton = screen.getByText('Show Details')
      fireEvent.click(expandButton)

      expect(screen.getByText(mockRiskAssessment.rationale)).toBeInTheDocument()
      expect(screen.getByText(mockRiskAssessment.suggestedAction!)).toBeInTheDocument()
    })

    it('should display confidence indicator', () => {
      render(<RiskCard assessment={mockRiskAssessment} />)

      const confidenceElement = screen.getByTestId('confidence-indicator')
      expect(confidenceElement).toBeInTheDocument()
      expect(confidenceElement).toHaveAttribute('aria-label', 'Confidence: 92%')
    })

    it('should handle different risk levels with appropriate styling', () => {
      const lowRiskAssessment = {
        ...mockRiskAssessment,
        riskLevel: 'low' as const,
        riskScore: 25
      }

      render(<RiskCard assessment={lowRiskAssessment} />)

      expect(screen.getByText('Low Risk')).toBeInTheDocument()
      expect(screen.getByTestId('risk-card')).toHaveClass('risk-low')
    })
  })

  describe('AnalysisSummary', () => {
    it('should display overall risk statistics', () => {
      render(<AnalysisSummary summary={mockAnalysisResult.summary} />)

      expect(screen.getByText('3 risks found')).toBeInTheDocument()
      expect(screen.getByText('1 Critical')).toBeInTheDocument()
      expect(screen.getByText('1 High')).toBeInTheDocument()
      expect(screen.getByText('1 Medium')).toBeInTheDocument()
    })

    it('should show top risk categories', () => {
      render(<AnalysisSummary summary={mockAnalysisResult.summary} />)

      expect(screen.getByText('Account Termination')).toBeInTheDocument()
      expect(screen.getByText('95% avg risk')).toBeInTheDocument()
    })

    it('should display analysis limitations', () => {
      render(<AnalysisSummary summary={mockAnalysisResult.summary} />)

      expect(screen.getByText('Analysis Limitations')).toBeInTheDocument()
      expect(screen.getByText('Analysis focused on mobile gaming industry patterns')).toBeInTheDocument()
    })

    it('should show recommended actions', () => {
      render(<AnalysisSummary summary={mockAnalysisResult.summary} />)

      expect(screen.getByText('Recommended Actions')).toBeInTheDocument()
      expect(screen.getByText('Consider alternative services with fairer terms')).toBeInTheDocument()
    })

    it('should handle zero risks gracefully', () => {
      const noRisksSummary = {
        ...mockAnalysisResult.summary,
        totalRisks: 0,
        riskBreakdown: { critical: 0, high: 0, medium: 0, low: 0 },
        topCategories: []
      }

      render(<AnalysisSummary summary={noRisksSummary} />)

      expect(screen.getByText('No significant risks found')).toBeInTheDocument()
    })
  })

  describe('ConfidenceIndicator', () => {
    it('should display confidence percentage', () => {
      render(<ConfidenceIndicator confidence={85} />)

      expect(screen.getByText('85%')).toBeInTheDocument()
      expect(screen.getByText('High Confidence')).toBeInTheDocument()
    })

    it('should show appropriate confidence levels', () => {
      const { rerender } = render(<ConfidenceIndicator confidence={95} />)
      expect(screen.getByText('Very High Confidence')).toBeInTheDocument()

      rerender(<ConfidenceIndicator confidence={75} />)
      expect(screen.getByText('High Confidence')).toBeInTheDocument()

      rerender(<ConfidenceIndicator confidence={55} />)
      expect(screen.getByText('Medium Confidence')).toBeInTheDocument()

      rerender(<ConfidenceIndicator confidence={35} />)
      expect(screen.getByText('Low Confidence')).toBeInTheDocument()
    })

    it('should display confidence bar with correct width', () => {
      render(<ConfidenceIndicator confidence={75} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '75')
      expect(progressBar).toHaveStyle('width: 75%')
    })

    it('should include accessibility attributes', () => {
      render(<ConfidenceIndicator confidence={88} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label', 'Analysis confidence: 88%')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('ResultsViewer', () => {
    it('should render complete analysis results', () => {
      render(<ResultsViewer result={mockAnalysisResult} />)

      expect(screen.getByText('Analysis Results')).toBeInTheDocument()
      expect(screen.getByText('High Risk (85%)')).toBeInTheDocument()
      expect(screen.getByText('Processed 1,245 characters')).toBeInTheDocument()
    })

    it('should display all risk assessments', () => {
      render(<ResultsViewer result={mockAnalysisResult} />)

      expect(screen.getByText('Arbitrary account termination without notice')).toBeInTheDocument()
      expect(screen.getByText('Account Termination')).toBeInTheDocument()
    })

    it('should show analysis metadata', () => {
      render(<ResultsViewer result={mockAnalysisResult} />)

      expect(screen.getByText('Processing Time: 15.4s')).toBeInTheDocument()
      expect(screen.getByText('Confidence: 92%')).toBeInTheDocument()
      expect(screen.getByText('Expires: Nov 12, 2025')).toBeInTheDocument()
    })

    it('should handle loading state', () => {
      render(<ResultsViewer result={null} loading={true} />)

      expect(screen.getByText('Analyzing terms...')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should handle error state', () => {
      const error = 'Analysis failed due to API error'
      render(<ResultsViewer result={null} error={error} />)

      expect(screen.getByText('Analysis Failed')).toBeInTheDocument()
      expect(screen.getByText(error)).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('should handle expired session', () => {
      const expiredResult = {
        ...mockAnalysisResult,
        session: {
          ...mockAnalysisResult.session,
          status: 'expired' as const
        }
      }

      render(<ResultsViewer result={expiredResult} />)

      expect(screen.getByText('Results Expired')).toBeInTheDocument()
      expect(screen.getByText('These analysis results have expired and are no longer available.')).toBeInTheDocument()
    })

    it('should allow filtering by risk level', () => {
      const multiRiskResult = {
        ...mockAnalysisResult,
        riskAssessments: [
          mockRiskAssessment,
          { ...mockRiskAssessment, id: 'risk-2', riskLevel: 'medium' as const },
          { ...mockRiskAssessment, id: 'risk-3', riskLevel: 'low' as const }
        ]
      }

      render(<ResultsViewer result={multiRiskResult} />)

      const criticalFilter = screen.getByText('Critical Only')
      fireEvent.click(criticalFilter)

      // Should only show critical risks
      expect(screen.getAllByTestId('risk-card')).toHaveLength(1)
    })
  })
})