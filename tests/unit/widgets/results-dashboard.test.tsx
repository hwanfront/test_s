/**
 * Component tests for Results Dashboard Widget
 * Test: T043 [US1] Component test for results dashboard widget
 * 
 * This tests the results dashboard widget UI components and user interactions
 * Following TDD approach: These tests should FAIL before implementation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsDashboard } from '@/widgets/results-dashboard/ui/results-dashboard';
import { useResultsDashboardStore } from '@/widgets/results-dashboard/model/store';
import { createWrapper } from '@/tests/setup/test-utils';

// Mock the store
jest.mock('@/widgets/results-dashboard/model/store');

describe('Results Dashboard Widget', () => {
  const mockAnalysisResult = {
    session: {
      id: 'session-123',
      contentLength: 1500,
      status: 'completed' as const,
      riskScore: 85,
      riskLevel: 'high' as const,
      confidenceScore: 88,
      processingTimeMs: 25000,
      createdAt: '2025-11-05T10:30:00Z',
      completedAt: '2025-11-05T10:30:25Z',
      expiresAt: '2025-11-12T10:30:00Z'
    },
    riskAssessments: [
      {
        id: 'risk-1',
        clauseCategory: 'account-termination',
        riskLevel: 'critical' as const,
        riskScore: 95,
        confidenceScore: 90,
        summary: 'Arbitrary account termination',
        rationale: 'Service can terminate without notice',
        suggestedAction: 'Look for fairer alternatives',
        startPosition: 100,
        endPosition: 200,
        createdAt: '2025-11-05T10:30:15Z'
      },
      {
        id: 'risk-2',
        clauseCategory: 'virtual-currency',
        riskLevel: 'high' as const,
        riskScore: 80,
        confidenceScore: 85,
        summary: 'Virtual currency forfeiture',
        rationale: 'Currency can be lost without compensation',
        suggestedAction: 'Understand virtual currency risks',
        startPosition: 300,
        endPosition: 400,
        createdAt: '2025-11-05T10:30:20Z'
      }
    ],
    summary: {
      totalRisks: 2,
      riskBreakdown: {
        critical: 1,
        high: 1,
        medium: 0,
        low: 0
      },
      topCategories: [
        { category: 'account-termination', count: 1, averageRisk: 95 },
        { category: 'virtual-currency', count: 1, averageRisk: 80 }
      ],
      analysisLimitations: [
        'Analysis focused on mobile gaming patterns',
        'Legal interpretation may vary by jurisdiction'
      ],
      recommendedActions: [
        'Consider alternative services',
        'Review virtual currency policies carefully'
      ]
    }
  };

  const defaultStoreState = {
    analysisResult: null,
    loading: false,
    error: null,
    selectedRiskLevels: ['critical', 'high', 'medium', 'low'],
    sortBy: 'riskScore' as const,
    sortOrder: 'desc' as const,
    showDetails: false,
    expandedRisks: new Set(),
    activeTab: 'summary' as const,
    viewMode: 'cards' as const,
    showConfidenceScores: true,
    showPositions: false,
    searchQuery: '',
    setAnalysisResult: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    setSelectedRiskLevels: jest.fn(),
    setSortBy: jest.fn(),
    setSortOrder: jest.fn(),
    setSearchQuery: jest.fn(),
    toggleDetails: jest.fn(),
    toggleRiskExpansion: jest.fn(),
    setActiveTab: jest.fn(),
    setViewMode: jest.fn(),
    toggleConfidenceScores: jest.fn(),
    togglePositions: jest.fn(),
    reset: jest.fn(),
    getFilteredRisks: jest.fn(() => []),
    getSortedRisks: jest.fn(() => []),
    getRiskCounts: jest.fn(() => ({ critical: 0, high: 0, medium: 0, low: 0 })),
    getHighestRiskCategory: jest.fn(() => null)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useResultsDashboardStore as jest.Mock).mockReturnValue(defaultStoreState);
  });

  describe('Dashboard Layout and Structure', () => {
    it('should render dashboard with all sections when results available', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult,
        getSortedRisks: jest.fn(() => mockAnalysisResult.riskAssessments),
        getRiskCounts: jest.fn(() => ({ critical: 1, high: 1, medium: 0, low: 0 }))
      });

      render(<ResultsDashboard />, { wrapper: createWrapper() });

      expect(screen.getByRole('main', { name: /results dashboard/i })).toBeInTheDocument();
      expect(screen.getByTestId('analysis-summary-section')).toBeInTheDocument();
      expect(screen.getByTestId('risk-assessments-section')).toBeInTheDocument();
      expect(screen.getByTestId('analysis-metadata-section')).toBeInTheDocument();
    });

    it('should display analysis summary with key metrics', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('High Risk (85%)')).toBeInTheDocument();
      expect(screen.getByText('2 risks found')).toBeInTheDocument();
      expect(screen.getByText('88% confidence')).toBeInTheDocument();
      expect(screen.getByText('25.0s processing time')).toBeInTheDocument();
    });

    it('should show risk breakdown with visual indicators', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('1 Critical')).toBeInTheDocument();
      expect(screen.getByText('1 High')).toBeInTheDocument();
      expect(screen.getByText('0 Medium')).toBeInTheDocument();
      expect(screen.getByText('0 Low')).toBeInTheDocument();
    });

    it('should display session metadata and expiration info', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('1,500 characters analyzed')).toBeInTheDocument();
      expect(screen.getByText(/expires.*nov.*12/i)).toBeInTheDocument();
      expect(screen.getByTestId('expiration-timer')).toBeInTheDocument();
    });
  });

  describe('Risk Assessment Display', () => {
    it('should display all risk assessments by default', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('Arbitrary account termination')).toBeInTheDocument();
      expect(screen.getByText('Virtual currency forfeiture')).toBeInTheDocument();
      expect(screen.getAllByTestId('risk-assessment-card')).toHaveLength(2);
    });

    it('should support filtering by risk level', async () => {
      const user = userEvent.setup();
      const mockSetSelectedRiskLevels = jest.fn();

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult,
        selectedRiskLevels: ['critical'],
        setSelectedRiskLevels: mockSetSelectedRiskLevels
      });

      render(<ResultsDashboard />);

      const criticalFilter = screen.getByLabelText(/critical risks only/i);
      await user.click(criticalFilter);

      expect(mockSetSelectedRiskLevels).toHaveBeenCalledWith(['critical']);
      
      // Should only show critical risks
      expect(screen.getByText('Arbitrary account termination')).toBeInTheDocument();
      expect(screen.queryByText('Virtual currency forfeiture')).not.toBeInTheDocument();
    });

    it('should support sorting by different criteria', async () => {
      const user = userEvent.setup();
      const mockSetSortBy = jest.fn();

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult,
        setSortBy: mockSetSortBy
      });

      render(<ResultsDashboard />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'category');

      expect(mockSetSortBy).toHaveBeenCalledWith('category');
    });

    it('should toggle between ascending and descending sort', async () => {
      const user = userEvent.setup();
      const mockSetSortOrder = jest.fn();

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult,
        sortOrder: 'desc',
        setSortOrder: mockSetSortOrder
      });

      render(<ResultsDashboard />);

      const sortOrderButton = screen.getByRole('button', { name: /sort.*descending/i });
      await user.click(sortOrderButton);

      expect(mockSetSortOrder).toHaveBeenCalledWith('asc');
    });

    it('should expand/collapse detailed view', async () => {
      const user = userEvent.setup();
      const mockToggleDetails = jest.fn();

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult,
        showDetails: false,
        toggleDetails: mockToggleDetails
      });

      render(<ResultsDashboard />);

      const detailsToggle = screen.getByRole('button', { name: /show details/i });
      await user.click(detailsToggle);

      expect(mockToggleDetails).toHaveBeenCalled();
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading state while analysis is processing', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        loading: true
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('Analyzing Terms & Conditions')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show progress indicator during analysis', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        loading: true,
        progress: 65
      });

      render(<ResultsDashboard />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '65');
      expect(screen.getByText('65% complete')).toBeInTheDocument();
    });

    it('should display error state with retry option', () => {
      const error = 'Analysis failed due to API error';
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        error
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('Analysis Failed')).toBeInTheDocument();
      expect(screen.getByText(error)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should handle empty results gracefully', () => {
      const emptyResult = {
        ...mockAnalysisResult,
        riskAssessments: [],
        summary: {
          ...mockAnalysisResult.summary,
          totalRisks: 0,
          riskBreakdown: { critical: 0, high: 0, medium: 0, low: 0 }
        }
      };

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: emptyResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('No Significant Risks Found')).toBeInTheDocument();
      expect(screen.getByText(/appears to be fair/i)).toBeInTheDocument();
    });

    it('should handle expired session state', () => {
      const expiredResult = {
        ...mockAnalysisResult,
        session: {
          ...mockAnalysisResult.session,
          status: 'expired' as const
        }
      };

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: expiredResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('Results Expired')).toBeInTheDocument();
      expect(screen.getByText(/results are no longer available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze again/i })).toBeInTheDocument();
    });
  });

  describe('Analysis Limitations and Transparency', () => {
    it('should display analysis limitations prominently', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('Analysis Limitations')).toBeInTheDocument();
      expect(screen.getByText('Analysis focused on mobile gaming patterns')).toBeInTheDocument();
      expect(screen.getByText('Legal interpretation may vary by jurisdiction')).toBeInTheDocument();
    });

    it('should show recommended actions clearly', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('Recommended Actions')).toBeInTheDocument();
      expect(screen.getByText('Consider alternative services')).toBeInTheDocument();
      expect(screen.getByText('Review virtual currency policies carefully')).toBeInTheDocument();
    });

    it('should display confidence indicators for each assessment', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByText('90% confident')).toBeInTheDocument(); // First assessment
      expect(screen.getByText('85% confident')).toBeInTheDocument(); // Second assessment
    });

    it('should show constitutional compliance indicators', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByTestId('transparency-indicator')).toBeInTheDocument();
      expect(screen.getByText(/detailed rationale provided/i)).toBeInTheDocument();
      expect(screen.getByText(/confidence levels disclosed/i)).toBeInTheDocument();
    });
  });

  describe('User Interaction Features', () => {
    it('should support risk assessment highlighting', async () => {
      const user = userEvent.setup();
      const onHighlight = jest.fn();

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard onHighlight={onHighlight} />);

      const firstRiskCard = screen.getAllByTestId('risk-assessment-card')[0];
      await user.click(firstRiskCard);

      expect(onHighlight).toHaveBeenCalledWith({
        startPosition: 100,
        endPosition: 200,
        riskLevel: 'critical'
      });
    });

    it('should support exporting analysis results', async () => {
      const user = userEvent.setup();
      const mockExport = jest.fn();

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard onExport={mockExport} />);

      const exportButton = screen.getByRole('button', { name: /export results/i });
      await user.click(exportButton);

      expect(mockExport).toHaveBeenCalledWith(mockAnalysisResult);
    });

    it('should support sharing analysis results', async () => {
      const user = userEvent.setup();
      
      // Mock navigator.share
      Object.assign(navigator, {
        share: jest.fn().mockResolvedValue(undefined)
      });

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      const shareButton = screen.getByRole('button', { name: /share results/i });
      await user.click(shareButton);

      expect(navigator.share).toHaveBeenCalledWith({
        title: 'Terms Analysis Results',
        text: 'Analysis found 2 risks (High Risk - 85%)',
        url: expect.stringContaining('session-123')
      });
    });

    it('should handle print functionality', async () => {
      const user = userEvent.setup();
      
      // Mock window.print
      window.print = jest.fn();

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      const printButton = screen.getByRole('button', { name: /print results/i });
      await user.click(printButton);

      expect(window.print).toHaveBeenCalled();
    });
  });

  describe('Responsive Design and Layout', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      const dashboard = screen.getByTestId('results-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
      
      // Should stack sections vertically on mobile
      expect(screen.getByTestId('risk-assessments-section')).toHaveClass('flex-col');
    });

    it('should show/hide sections based on screen size', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      // Metadata section should be collapsible on small screens
      const metadataSection = screen.getByTestId('analysis-metadata-section');
      expect(metadataSection).toHaveClass('lg:block', 'md:hidden');
    });
  });

  describe('Accessibility and Screen Reader Support', () => {
    it('should provide proper heading structure', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      expect(screen.getByRole('heading', { level: 1, name: /analysis results/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /risk summary/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /identified risks/i })).toBeInTheDocument();
    });

    it('should announce status changes to screen readers', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        loading: true
      });

      const { rerender } = render(<ResultsDashboard />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveTextContent(/analyzing/i);

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      rerender(<ResultsDashboard />);

      expect(statusRegion).toHaveTextContent(/analysis complete/i);
    });

    it('should support keyboard navigation through results', async () => {
      const user = userEvent.setup();

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /filter risks/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/sort by/i)).toHaveFocus();

      await user.tab();
      expect(screen.getAllByTestId('risk-assessment-card')[0]).toHaveFocus();
    });

    it('should provide descriptive labels for all interactive elements', () => {
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult
      });

      render(<ResultsDashboard />);

      const filterButton = screen.getByRole('button', { name: /filter risks/i });
      expect(filterButton).toHaveAttribute('aria-expanded');
      expect(filterButton).toHaveAttribute('aria-controls');

      const sortSelect = screen.getByLabelText(/sort by/i);
      expect(sortSelect).toHaveAttribute('aria-describedby');
    });
  });

  describe('Performance and Optimization', () => {
    it('should virtualize long lists of risk assessments', () => {
      const manyRisks = Array.from({ length: 100 }, (_, i) => ({
        ...mockAnalysisResult.riskAssessments[0],
        id: `risk-${i}`,
        summary: `Risk assessment ${i}`
      }));

      const largeResult = {
        ...mockAnalysisResult,
        riskAssessments: manyRisks,
        summary: { ...mockAnalysisResult.summary, totalRisks: 100 }
      };

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: largeResult
      });

      render(<ResultsDashboard />);

      // Should only render visible items
      const visibleCards = screen.getAllByTestId('risk-assessment-card');
      expect(visibleCards.length).toBeLessThan(20); // Virtual scrolling
      expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
    });

    it('should memoize expensive calculations', () => {
      const { rerender } = render(<ResultsDashboard />);

      // Mock expensive calculation
      const mockCalculateRiskStats = jest.fn();

      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult,
        calculateRiskStats: mockCalculateRiskStats
      });

      rerender(<ResultsDashboard />);
      rerender(<ResultsDashboard />);

      // Should only calculate once due to memoization
      expect(mockCalculateRiskStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with Dashboard Store', () => {
    it('should synchronize with store state correctly', () => {
      const storeState = {
        ...defaultStoreState,
        analysisResult: mockAnalysisResult,
        selectedRiskLevels: ['critical', 'high'],
        sortBy: 'category' as const,
        showDetails: true
      };

      (useResultsDashboardStore as jest.Mock).mockReturnValue(storeState);

      render(<ResultsDashboard />);

      // Should reflect store state in UI
      expect(screen.getByDisplayValue('category')).toBeInTheDocument();
      expect(screen.getByText(/hide details/i)).toBeInTheDocument();
    });

    it('should handle store updates reactively', () => {
      const mockSetAnalysisResult = jest.fn();

      const { rerender } = render(<ResultsDashboard />);

      // Update with new result
      (useResultsDashboardStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        analysisResult: mockAnalysisResult,
        setAnalysisResult: mockSetAnalysisResult
      });

      rerender(<ResultsDashboard analysisResult={mockAnalysisResult} />);

      expect(mockSetAnalysisResult).toHaveBeenCalledWith(mockAnalysisResult);
    });
  });
});