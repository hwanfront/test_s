/**
 * Results Dashboard Widget Export
 * Main export for the results dashboard widget
 */

export { ResultsDashboard } from './ui/results-dashboard'
export { useResultsDashboardStore, formatRiskLevel, getRiskLevelColor, formatDuration, formatCategoryName, calculateRiskDistribution } from './model/store'
export type { ResultsDashboardProps } from './ui/results-dashboard'
export type { ResultsDashboardState, SortBy, SortOrder, RiskLevel } from './model/store'