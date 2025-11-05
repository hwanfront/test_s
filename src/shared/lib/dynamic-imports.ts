/**
 * T128 [P] Optimize bundle size with dynamic imports
 * 
 * Dynamic import utilities for code splitting and lazy loading
 */

import dynamic from 'next/dynamic'

/**
 * Lazy loaded feature components with proper loading states
 */

// Analysis Feature Components
export const DynamicAnalysisForm = dynamic(
  () => import('@/widgets/analysis-form'),
  {
    loading: () => null, // Will use skeleton from parent
    ssr: false
  }
)

export const DynamicResultsDashboard = dynamic(
  () => import('@/widgets/results-dashboard'),
  {
    loading: () => null,
    ssr: false
  }
)

// Auth Components
export const DynamicAuthWidget = dynamic(
  () => import('@/widgets/auth-widget'),
  {
    loading: () => null,
    ssr: false
  }
)

// Privacy Components
export const DynamicPrivacyIndicator = dynamic(
  () => import('@/shared/ui/privacy-indicator').then(mod => ({ default: mod.PrivacyIndicator })),
  {
    loading: () => null,
    ssr: true
  }
)

/**
 * Utility function to preload components
 */
export function preloadComponent(componentPath: string): Promise<any> {
  switch (componentPath) {
    case 'analysis-form':
      return import('@/widgets/analysis-form')
    case 'results-dashboard':
      return import('@/widgets/results-dashboard')
    case 'auth-widget':
      return import('@/widgets/auth-widget')
    case 'privacy-indicator':
      return import('@/shared/ui/privacy-indicator')
    case 'error-boundary':
      return import('@/shared/ui/error-boundary')
    default:
      return Promise.resolve(null)
  }
}

/**
 * Preload critical components on user interaction
 */
export function useComponentPreloader() {
  const preloadOnHover = (componentPath: string) => {
    return {
      onMouseEnter: () => preloadComponent(componentPath),
      onFocus: () => preloadComponent(componentPath)
    }
  }

  const preloadOnClick = (componentPath: string) => {
    return {
      onClick: () => preloadComponent(componentPath)
    }
  }

  return {
    preloadOnHover,
    preloadOnClick,
    preloadComponent
  }
}

/**
 * Bundle size utilities
 */
export const bundleUtils = {
  /**
   * Get estimated bundle size impact
   */
  getBundleInfo: () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize,
        loadTime: navigation.loadEventEnd - navigation.loadEventStart
      }
    }
    return null
  },

  /**
   * Check if component should be lazy loaded
   */
  shouldLazyLoad: (componentSize: 'small' | 'medium' | 'large' | 'huge') => {
    // Don't lazy load on fast connections for small components
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection?.effectiveType === '4g' && componentSize === 'small') {
        return false
      }
    }

    // Always lazy load large components
    return componentSize === 'large' || componentSize === 'huge'
  }
}

/**
 * Route-based code splitting
 */
export const routeComponents = {
  // Public routes (preload)
  home: () => import('@/app/page'),
  
  // Auth routes (lazy load)
  signin: () => import('@/app/(auth)/signin/page'),
  
  // Feature routes (lazy load)
  analysis: () => import('@/app/analysis/page'),
  results: () => import('@/app/analysis/[sessionId]/page')
}

/**
 * Feature-based code splitting
 */
export const featureComponents = {
  // Core features
  analysis: {
    form: () => import('@/widgets/analysis-form'),
    results: () => import('@/widgets/results-dashboard')
  },
  
  // Auth features
  auth: {
    widget: () => import('@/widgets/auth-widget'),
    oauth: () => import('@/features/auth-oauth')
  },
  
  // Privacy features  
  privacy: {
    indicator: () => import('@/shared/ui/privacy-indicator'),
    controls: () => import('@/features/privacy-controls')
  }
}

/**
 * Intelligent preloading based on user behavior
 */
export class IntelligentPreloader {
  private preloadedComponents = new Set<string>()
  private userBehavior: { [key: string]: number } = {}

  trackUserBehavior(action: string, componentPath: string) {
    const key = `${action}:${componentPath}`
    this.userBehavior[key] = (this.userBehavior[key] || 0) + 1
    
    // Preload if user frequently interacts with this component
    if (this.userBehavior[key] > 3 && !this.preloadedComponents.has(componentPath)) {
      this.preloadComponent(componentPath)
    }
  }

  private async preloadComponent(componentPath: string) {
    if (this.preloadedComponents.has(componentPath)) {
      return
    }

    try {
      await preloadComponent(componentPath)
      this.preloadedComponents.add(componentPath)
    } catch (error) {
      console.warn(`Failed to preload component: ${componentPath}`, error)
    }
  }

  preloadCriticalPath(userRole: 'guest' | 'user' | 'admin') {
    const criticalComponents = {
      guest: ['analysis-form', 'auth-widget'],
      user: ['analysis-form', 'results-dashboard', 'privacy-indicator'],
      admin: ['analysis-form', 'results-dashboard']
    }

    criticalComponents[userRole].forEach(component => {
      this.preloadComponent(component)
    })
  }
}

/**
 * Global preloader instance
 */
export const intelligentPreloader = new IntelligentPreloader()

/**
 * Development bundle analysis helpers
 */
export const devUtils = {
  /**
   * Log component load times in development
   */
  logLoadTime: (componentName: string, startTime: number) => {
    if (process.env.NODE_ENV === 'development') {
      const loadTime = performance.now() - startTime
      console.log(`📦 ${componentName} loaded in ${loadTime.toFixed(2)}ms`)
    }
  },

  /**
   * Analyze current bundle chunks
   */
  analyzeBundles: () => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      const chunks = scripts
        .map(script => script.getAttribute('src'))
        .filter(src => src?.includes('/_next/static/chunks/'))
        .map(src => ({
          src,
          estimated_size: 'unknown'
        }))
      
      console.table(chunks)
      return chunks
    }
    return []
  }
}

/**
 * Lazy loaded feature components
 */

// Analysis Feature Components
export const DynamicAnalysisForm = dynamicImport(
  () => import('@/widgets/analysis-form'),
  {
    loading: () => <SuspenseFallback type="component" message="Loading analysis form..." />,
    ssr: false
  }
)

export const DynamicResultsDashboard = dynamicImport(
  () => import('@/widgets/results-dashboard'),
  {
    loading: () => <SuspenseFallback type="component" message="Loading results..." />,
    ssr: false
  }
)

export const DynamicAnalysisViewer = dynamicImport(
  () => import('@/features/analysis-display/components/results-viewer'),
  {
    loading: () => <SuspenseFallback type="component" message="Loading analysis viewer..." />,
    ssr: false
  }
)

// Auth Components
export const DynamicAuthWidget = dynamicImport(
  () => import('@/widgets/auth-widget'),
  {
    loading: () => <SuspenseFallback type="component" message="Loading authentication..." />,
    ssr: false
  }
)

export const DynamicSignInForm = dynamicImport(
  () => import('@/features/auth-oauth/components/sign-in-form'),
  {
    loading: () => <SuspenseFallback type="component" message="Loading sign in..." />,
    ssr: false
  }
)

// Privacy Components
export const DynamicPrivacyIndicator = dynamicImport(
  () => import('@/shared/ui/privacy-indicator').then(mod => ({ default: mod.PrivacyIndicator })),
  {
    loading: () => <SuspenseFallback type="component" message="Loading privacy info..." />,
    ssr: true
  }
)

export const DynamicDataExportModal = dynamicImport(
  () => import('@/features/privacy-controls/components/data-export-modal'),
  {
    loading: () => <SuspenseFallback type="modal" message="Loading export options..." />,
    ssr: false
  }
)

// UI Components (heavy ones)
export const DynamicErrorBoundary = dynamicImport(
  () => import('@/shared/ui/error-boundary').then(mod => ({ default: mod.ErrorBoundary })),
  {
    loading: () => <div>Loading error handler...</div>,
    ssr: true
  }
)

export const DynamicChart = dynamicImport(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  {
    loading: () => <SuspenseFallback type="component" message="Loading charts..." />,
    ssr: false
  }
)

// Modal Components
export const DynamicModal = dynamicImport(
  () => import('@/shared/ui/modal'),
  {
    loading: () => <SuspenseFallback type="modal" />,
    ssr: false
  }
)

export const DynamicDialog = dynamicImport(
  () => import('@/shared/ui/dialog'),
  {
    loading: () => <SuspenseFallback type="modal" />,
    ssr: false
  }
)

/**
 * Lazy page components
 */
export const DynamicAnalysisPage = dynamicImport(
  () => import('@/app/analysis/page'),
  {
    loading: () => <SuspenseFallback type="page" message="Loading analysis page..." />,
    ssr: true
  }
)

export const DynamicSettingsPage = dynamicImport(
  () => import('@/app/settings/page'),
  {
    loading: () => <SuspenseFallback type="page" message="Loading settings..." />,
    ssr: false
  }
)

export const DynamicHelpPage = dynamicImport(
  () => import('@/app/help/page'),
  {
    loading: () => <SuspenseFallback type="page" message="Loading help..." />,
    ssr: true
  }
)

/**
 * Utility function to preload components
 */
export function preloadComponent(componentPath: string): Promise<any> {
  switch (componentPath) {
    case 'analysis-form':
      return import('@/widgets/analysis-form')
    case 'results-dashboard':
      return import('@/widgets/results-dashboard')
    case 'auth-widget':
      return import('@/widgets/auth-widget')
    case 'privacy-indicator':
      return import('@/shared/ui/privacy-indicator')
    case 'error-boundary':
      return import('@/shared/ui/error-boundary')
    default:
      return Promise.resolve(null)
  }
}

/**
 * Preload critical components on user interaction
 */
export function useComponentPreloader() {
  const preloadOnHover = (componentPath: string) => {
    return {
      onMouseEnter: () => preloadComponent(componentPath),
      onFocus: () => preloadComponent(componentPath)
    }
  }

  const preloadOnClick = (componentPath: string) => {
    return {
      onClick: () => preloadComponent(componentPath)
    }
  }

  return {
    preloadOnHover,
    preloadOnClick,
    preloadComponent
  }
}

/**
 * Bundle size utilities
 */
export const bundleUtils = {
  /**
   * Load component only when needed
   */
  loadOnDemand: <T extends ComponentType>(
    importFn: () => Promise<{ default: T }>,
    trigger: 'click' | 'hover' | 'visible' = 'click'
  ) => {
    let componentPromise: Promise<{ default: T }> | null = null
    
    const loadComponent = () => {
      if (!componentPromise) {
        componentPromise = importFn()
      }
      return componentPromise
    }

    return {
      load: loadComponent,
      preload: () => loadComponent(),
      trigger
    }
  },

  /**
   * Get estimated bundle size impact
   */
  getBundleInfo: () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize,
        loadTime: navigation.loadEventEnd - navigation.loadEventStart
      }
    }
    return null
  },

  /**
   * Check if component should be lazy loaded
   */
  shouldLazyLoad: (componentSize: 'small' | 'medium' | 'large' | 'huge') => {
    // Don't lazy load on fast connections
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection?.effectiveType === '4g' && componentSize === 'small') {
        return false
      }
    }

    // Always lazy load large components
    return componentSize === 'large' || componentSize === 'huge'
  }
}

/**
 * Route-based code splitting
 */
export const routeComponents = {
  // Public routes (preload)
  home: () => import('@/app/page'),
  about: () => import('@/app/about/page'),
  
  // Auth routes (lazy load)
  signin: () => import('@/app/(auth)/signin/page'),
  signup: () => import('@/app/(auth)/signup/page'),
  
  // Feature routes (lazy load)
  analysis: () => import('@/app/analysis/page'),
  results: () => import('@/app/analysis/[sessionId]/page'),
  settings: () => import('@/app/settings/page'),
  help: () => import('@/app/help/page'),
  
  // Admin routes (lazy load)
  admin: () => import('@/app/admin/page'),
  analytics: () => import('@/app/admin/analytics/page')
}

/**
 * Feature-based code splitting
 */
export const featureComponents = {
  // Core features (might preload)
  analysis: {
    form: () => import('@/widgets/analysis-form'),
    results: () => import('@/widgets/results-dashboard'),
    viewer: () => import('@/features/analysis-display')
  },
  
  // Auth features (lazy load)
  auth: {
    widget: () => import('@/widgets/auth-widget'),
    oauth: () => import('@/features/auth-oauth'),
    profile: () => import('@/features/user-profile')
  },
  
  // Privacy features (lazy load)
  privacy: {
    controls: () => import('@/features/privacy-controls'),
    export: () => import('@/features/data-export'),
    audit: () => import('@/features/privacy-audit')
  },
  
  // Admin features (lazy load)
  admin: {
    dashboard: () => import('@/features/admin-dashboard'),
    analytics: () => import('@/features/analytics'),
    monitoring: () => import('@/features/monitoring')
  }
}

/**
 * Intelligent preloading based on user behavior
 */
export class IntelligentPreloader {
  private preloadedComponents = new Set<string>()
  private userBehavior: { [key: string]: number } = {}

  trackUserBehavior(action: string, componentPath: string) {
    const key = `${action}:${componentPath}`
    this.userBehavior[key] = (this.userBehavior[key] || 0) + 1
    
    // Preload if user frequently interacts with this component
    if (this.userBehavior[key] > 3 && !this.preloadedComponents.has(componentPath)) {
      this.preloadComponent(componentPath)
    }
  }

  private async preloadComponent(componentPath: string) {
    if (this.preloadedComponents.has(componentPath)) {
      return
    }

    try {
      await preloadComponent(componentPath)
      this.preloadedComponents.add(componentPath)
    } catch (error) {
      console.warn(`Failed to preload component: ${componentPath}`, error)
    }
  }

  preloadCriticalPath(userRole: 'guest' | 'user' | 'admin') {
    const criticalComponents = {
      guest: ['analysis-form', 'auth-widget'],
      user: ['analysis-form', 'results-dashboard', 'privacy-indicator'],
      admin: ['analysis-form', 'results-dashboard', 'admin-dashboard']
    }

    criticalComponents[userRole].forEach(component => {
      this.preloadComponent(component)
    })
  }
}

/**
 * Global preloader instance
 */
export const intelligentPreloader = new IntelligentPreloader()

/**
 * Development bundle analysis helpers
 */
export const devUtils = {
  /**
   * Log component load times in development
   */
  logLoadTime: (componentName: string, startTime: number) => {
    if (process.env.NODE_ENV === 'development') {
      const loadTime = performance.now() - startTime
      console.log(`📦 ${componentName} loaded in ${loadTime.toFixed(2)}ms`)
    }
  },

  /**
   * Analyze current bundle chunks
   */
  analyzeBundles: () => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      const chunks = scripts
        .map(script => script.getAttribute('src'))
        .filter(src => src?.includes('/_next/static/chunks/'))
        .map(src => ({
          src,
          estimated_size: 'unknown'
        }))
      
      console.table(chunks)
      return chunks
    }
    return []
  }
}