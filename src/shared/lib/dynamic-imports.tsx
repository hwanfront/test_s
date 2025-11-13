import React from 'react';
import dynamic from 'next/dynamic';
import { ComponentType, ReactElement } from 'react';

/**
 * Enhanced dynamic import utility with proper type safety and loading states
 */

interface DynamicImportOptions {
  loading?: () => ReactElement;
  ssr?: boolean;
}

/**
 * Type-safe dynamic import wrapper
 */
function dynamicImport<T = any>(
  dynamicImport: () => Promise<{ default: ComponentType<T> }>,
  options: DynamicImportOptions = {}
): ComponentType<T> {
  return dynamic(dynamicImport as any, {
    loading: options.loading || (() => <div>Loading...</div>),
    ssr: options.ssr ?? true
  });
}

/**
 * Suspense fallback component
 */
interface SuspenseFallbackProps {
  type?: 'component' | 'page' | 'modal';
  message?: string;
}

function SuspenseFallback({ type = 'component', message = 'Loading...' }: SuspenseFallbackProps) {
  const baseClasses = "flex items-center justify-center p-4";
  const typeClasses = {
    component: "min-h-[100px]",
    page: "min-h-[400px]",
    modal: "min-h-[200px]"
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Lazy loaded UI components
 */

// Basic UI Components
export const DynamicButton = dynamicImport(
  (() => import('@/shared/ui/button').then(mod => ({ default: mod.Button }))) as any,
  {
    loading: () => <div className="h-10 w-20 bg-gray-200 animate-pulse rounded" />,
    ssr: true
  }
);

// export const DynamicInput = dynamicImport(
//   (() => import('@/shared/ui/input').then(mod => ({ default: mod.Input }))) as any,
//   {
//     loading: () => <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />,
//     ssr: true
//   }
// );

// export const DynamicTextarea = dynamicImport(
//   (() => import('@/shared/ui/textarea').then(mod => ({ default: mod.Textarea }))) as any,
//   {
//     loading: () => <div className="h-20 w-full bg-gray-200 animate-pulse rounded" />,
//     ssr: true
//   }
// );

export const DynamicCard = dynamicImport(
  (() => import('@/shared/ui/card').then(mod => ({ default: mod.Card }))) as any,
  {
    loading: () => <div className="h-32 w-full bg-gray-200 animate-pulse rounded-lg" />,
    ssr: true
  }
);

// export const DynamicDialog = dynamicImport(
//   (() => import('@/shared/ui/dialog')) as any,
//   {
//     loading: () => <SuspenseFallback type="modal" />,
//     ssr: false
//   }
// );

export const DynamicDropdownMenu = dynamicImport(
  (() => import('@/shared/ui/dropdown-menu')) as any,
  {
    loading: () => <div className="h-8 w-8 bg-gray-200 animate-pulse rounded" />,
    ssr: false
  }
);

// export const DynamicTabs = dynamicImport(
//   (() => import('@/shared/ui/tabs')) as any,
//   {
//     loading: () => <div className="h-40 w-full bg-gray-200 animate-pulse rounded" />,
//     ssr: true
//   }
// );

/**
 * Lazy loaded feature components
 */

// Analysis Feature Components
export const DynamicAnalysisForm = dynamicImport(
  (() => import('@/widgets/analysis-form')) as any,
  {
    loading: () => <SuspenseFallback type="component" message="Loading analysis form..." />,
    ssr: false
  }
);

export const DynamicResultsDashboard = dynamicImport(
  (() => import('@/widgets/results-dashboard')) as any,
  {
    loading: () => <SuspenseFallback type="component" message="Loading results..." />,
    ssr: false
  }
);

// Auth Feature Components
export const DynamicAuthWidget = dynamicImport(
  (() => import('@/widgets/auth-widget')) as any,
  {
    loading: () => <SuspenseFallback type="component" message="Loading authentication..." />,
    ssr: false
  }
);

/**
 * Utility function to create dynamic component with default loading state
 */
export function createDynamicComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  loadingMessage?: string,
  type: 'component' | 'page' | 'modal' = 'component'
): ComponentType<T> {
  return dynamicImport(importFn, {
    loading: () => <SuspenseFallback type={type} message={loadingMessage} />,
    ssr: type === 'page'
  });
}

/**
 * Preload function for critical components
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  if (typeof window !== 'undefined') {
    // Only preload on client side
    importFn().catch(console.warn);
  }
}

/**
 * Critical components to preload
 */
export function preloadCriticalComponents(): void {
  if (typeof window !== 'undefined') {
    // Preload critical UI components
    preloadComponent(() => import('@/shared/ui/button'));
    // preloadComponent(() => import('@/shared/ui/input'));
    preloadComponent(() => import('@/shared/ui/card'));
    
    // Preload critical feature components
    preloadComponent(() => import('@/widgets/analysis-form'));
    preloadComponent(() => import('@/widgets/auth-widget'));
  }
}

export default dynamicImport;