/**
 * Results Dashboard State Management Store
 * T067 [US1] Create results dashboard state management
 * 
 * Zustand store for managing results dashboard state including filters, sorting, and display options
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { AnalysisResults } from '@/features/analysis-display/components/results-viewer'

export type SortBy = 'riskScore' | 'confidenceScore' | 'category' | 'position' | 'createdAt'
export type SortOrder = 'asc' | 'desc'
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

export interface ResultsDashboardState {
  // Data
  analysisResult: AnalysisResults | null
  loading: boolean
  error: string | null

  // Filters and sorting
  selectedRiskLevels: RiskLevel[]
  sortBy: SortBy
  sortOrder: SortOrder
  searchQuery: string

  // UI state
  showDetails: boolean
  expandedRisks: Set<string>
  activeTab: 'summary' | 'risks' | 'timeline'

  // View preferences
  viewMode: 'cards' | 'table' | 'timeline'
  showConfidenceScores: boolean
  showPositions: boolean

  // Actions
  setAnalysisResult: (result: AnalysisResults | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedRiskLevels: (levels: RiskLevel[]) => void
  setSortBy: (sortBy: SortBy) => void
  setSortOrder: (order: SortOrder) => void
  setSearchQuery: (query: string) => void
  toggleDetails: () => void
  toggleRiskExpansion: (riskId: string) => void
  setActiveTab: (tab: ResultsDashboardState['activeTab']) => void
  setViewMode: (mode: ResultsDashboardState['viewMode']) => void
  toggleConfidenceScores: () => void
  togglePositions: () => void
  reset: () => void

  // Computed getters
  getFilteredRisks: () => any[]
  getSortedRisks: () => any[]
  getRiskCounts: () => Record<RiskLevel, number>
  getHighestRiskCategory: () => string | null
}

export const useResultsDashboardStore = create<ResultsDashboardState>()(
  devtools(
    (set, get) => ({
      // Initial state
      analysisResult: null,
      loading: false,
      error: null,
      selectedRiskLevels: ['critical', 'high', 'medium', 'low'],
      sortBy: 'riskScore',
      sortOrder: 'desc',
      searchQuery: '',
      showDetails: false,
      expandedRisks: new Set(),
      activeTab: 'summary',
      viewMode: 'cards',
      showConfidenceScores: true,
      showPositions: false,

      // Actions
      setAnalysisResult: (analysisResult) => {
        set({ 
          analysisResult,
          loading: false,
          error: null 
        })
      },

      setLoading: (loading) => {
        set({ loading })
        if (loading) {
          set({ error: null })
        }
      },

      setError: (error) => {
        set({ 
          error,
          loading: false 
        })
      },

      setSelectedRiskLevels: (selectedRiskLevels) => {
        set({ selectedRiskLevels })
      },

      setSortBy: (sortBy) => {
        set({ sortBy })
      },

      setSortOrder: (sortOrder) => {
        set({ sortOrder })
      },

      setSearchQuery: (searchQuery) => {
        set({ searchQuery })
      },

      toggleDetails: () => {
        set((state) => ({ showDetails: !state.showDetails }))
      },

      toggleRiskExpansion: (riskId) => {
        set((state) => {
          const expandedRisks = new Set(state.expandedRisks)
          if (expandedRisks.has(riskId)) {
            expandedRisks.delete(riskId)
          } else {
            expandedRisks.add(riskId)
          }
          return { expandedRisks }
        })
      },

      setActiveTab: (activeTab) => {
        set({ activeTab })
      },

      setViewMode: (viewMode) => {
        set({ viewMode })
      },

      toggleConfidenceScores: () => {
        set((state) => ({ showConfidenceScores: !state.showConfidenceScores }))
      },

      togglePositions: () => {
        set((state) => ({ showPositions: !state.showPositions }))
      },

      reset: () => {
        set({
          analysisResult: null,
          loading: false,
          error: null,
          selectedRiskLevels: ['critical', 'high', 'medium', 'low'],
          sortBy: 'riskScore',
          sortOrder: 'desc',
          searchQuery: '',
          showDetails: false,
          expandedRisks: new Set(),
          activeTab: 'summary',
          viewMode: 'cards',
          showConfidenceScores: true,
          showPositions: false
        })
      },

      // Computed getters
      getFilteredRisks: () => {
        const { analysisResult, selectedRiskLevels, searchQuery } = get()
        if (!analysisResult?.riskAssessments) return []

        let filtered = analysisResult.riskAssessments.filter(risk =>
          selectedRiskLevels.includes(risk.riskLevel)
        )

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(risk =>
            risk.summary.toLowerCase().includes(query) ||
            risk.rationale.toLowerCase().includes(query) ||
            risk.clauseCategory.toLowerCase().includes(query)
          )
        }

        return filtered
      },

      getSortedRisks: () => {
        const { sortBy, sortOrder } = get()
        const filtered = get().getFilteredRisks()

        return [...filtered].sort((a, b) => {
          let aValue: any
          let bValue: any

          switch (sortBy) {
            case 'riskScore':
              aValue = a.riskScore
              bValue = b.riskScore
              break
            case 'confidenceScore':
              aValue = a.confidenceScore
              bValue = b.confidenceScore
              break
            case 'category':
              aValue = a.clauseCategory
              bValue = b.clauseCategory
              break
            case 'position':
              aValue = a.startPosition
              bValue = b.startPosition
              break
            case 'createdAt':
              aValue = new Date(a.createdAt).getTime()
              bValue = new Date(b.createdAt).getTime()
              break
            default:
              return 0
          }

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue)
            return sortOrder === 'asc' ? comparison : -comparison
          }

          const comparison = aValue - bValue
          return sortOrder === 'asc' ? comparison : -comparison
        })
      },

      getRiskCounts: () => {
        const { analysisResult } = get()
        if (!analysisResult?.riskAssessments) {
          return { critical: 0, high: 0, medium: 0, low: 0 }
        }

        return analysisResult.riskAssessments.reduce((counts, risk) => {
          counts[risk.riskLevel]++
          return counts
        }, { critical: 0, high: 0, medium: 0, low: 0 })
      },

      getHighestRiskCategory: () => {
        const { analysisResult } = get()
        if (!analysisResult?.summary?.topCategories?.length) return null

        return analysisResult.summary.topCategories[0].category
      }
    }),
    {
      name: 'results-dashboard-store'
    }
  )
)

/**
 * Utility functions for dashboard
 */

export function formatRiskLevel(level: RiskLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1)
}

export function getRiskLevelColor(level: RiskLevel): string {
  const colors = {
    critical: 'text-red-700 bg-red-100 border-red-200',
    high: 'text-red-600 bg-red-50 border-red-200',
    medium: 'text-orange-600 bg-orange-50 border-orange-200',
    low: 'text-yellow-600 bg-yellow-50 border-yellow-200'
  }
  return colors[level] || 'text-gray-600 bg-gray-50 border-gray-200'
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

export function formatCategoryName(category: string): string {
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function calculateRiskDistribution(riskCounts: Record<RiskLevel, number>) {
  const total = Object.values(riskCounts).reduce((sum, count) => sum + count, 0)
  if (total === 0) return { critical: 0, high: 0, medium: 0, low: 0 }

  return {
    critical: Math.round((riskCounts.critical / total) * 100),
    high: Math.round((riskCounts.high / total) * 100),
    medium: Math.round((riskCounts.medium / total) * 100),
    low: Math.round((riskCounts.low / total) * 100)
  }
}