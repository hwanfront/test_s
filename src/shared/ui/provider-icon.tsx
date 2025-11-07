/**
 * Provider Icon Component (Task T101)
 * 
 * Shared UI component for displaying OAuth provider icons
 * Supports Google, Naver, and other authentication providers
 */

'use client'

import React from 'react'
import { cn } from '@/shared/lib'

export interface ProviderIconProps {
  /**
   * OAuth provider type
   */
  provider: 'google' | 'naver' | 'github' | 'discord' | 'apple' | 'kakao' | 'facebook'
  
  /**
   * Icon size
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Display variant
   */
  variant?: 'icon-only' | 'with-text' | 'branded'
  
  /**
   * Shape styling
   */
  shape?: 'square' | 'circle' | 'rounded'
  
  /**
   * Color scheme
   */
  colorScheme?: 'default' | 'monochrome' | 'branded'
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Show provider name text
   */
  showText?: boolean
  
  /**
   * Custom text override
   */
  text?: string
  
  /**
   * Loading state
   */
  loading?: boolean
  
  /**
   * Click handler
   */
  onClick?: () => void
}

/**
 * Size configuration
 */
const sizeConfig = {
  xs: { icon: 'w-4 h-4', text: 'text-xs', container: 'gap-1 px-2 py-1' },
  sm: { icon: 'w-5 h-5', text: 'text-sm', container: 'gap-1.5 px-3 py-1.5' },
  md: { icon: 'w-6 h-6', text: 'text-base', container: 'gap-2 px-4 py-2' },
  lg: { icon: 'w-8 h-8', text: 'text-lg', container: 'gap-2.5 px-5 py-2.5' },
  xl: { icon: 'w-10 h-10', text: 'text-xl', container: 'gap-3 px-6 py-3' }
}

/**
 * Provider configuration with colors and text
 */
const providerConfig = {
  google: {
    name: 'Google',
    brandColor: '#4285f4',
    brandBackground: '#ffffff',
    brandBorder: '#dadce0',
    textColor: '#3c4043'
  },
  naver: {
    name: 'Naver',
    brandColor: '#00c73c',
    brandBackground: '#00c73c',
    brandBorder: '#00c73c',
    textColor: '#ffffff'
  },
  github: {
    name: 'GitHub',
    brandColor: '#333333',
    brandBackground: '#24292e',
    brandBorder: '#24292e',
    textColor: '#ffffff'
  },
  discord: {
    name: 'Discord',
    brandColor: '#5865f2',
    brandBackground: '#5865f2',
    brandBorder: '#5865f2',
    textColor: '#ffffff'
  },
  apple: {
    name: 'Apple',
    brandColor: '#000000',
    brandBackground: '#000000',
    brandBorder: '#000000',
    textColor: '#ffffff'
  },
  kakao: {
    name: 'Kakao',
    brandColor: '#fee500',
    brandBackground: '#fee500',
    brandBorder: '#fee500',
    textColor: '#3c1e1e'
  },
  facebook: {
    name: 'Facebook',
    brandColor: '#1877f2',
    brandBackground: '#1877f2',
    brandBorder: '#1877f2',
    textColor: '#ffffff'
  }
}

/**
 * Shape styling
 */
const shapeStyles = {
  square: 'rounded-none',
  circle: 'rounded-full',
  rounded: 'rounded-md'
}

/**
 * Google SVG Icon
 */
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

/**
 * Naver SVG Icon
 * Official Naver brand icon without horizontal flip
 */
const NaverIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.273 12.845L7.376 0H0v24h7.726V11.155L16.624 24H24V0h-7.727z" />
  </svg>
)

/**
 * GitHub SVG Icon
 */
const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
)

/**
 * Discord SVG Icon
 */
const DiscordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

/**
 * Apple SVG Icon
 */
const AppleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
)

/**
 * Kakao SVG Icon
 */
const KakaoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3C6.486 3 2 6.262 2 10.5c0 2.665 1.76 5.017 4.41 6.44l-1.44 5.27c-.129.472.454.814.85.5l5.72-4.33C11.684 18.41 11.84 18.42 12 18.42c5.514 0 10-3.262 10-7.92C22 6.262 17.514 3 12 3z" />
  </svg>
)

/**
 * Facebook SVG Icon
 */
const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

/**
 * Icon component mapping
 */
const IconComponents = {
  google: GoogleIcon,
  naver: NaverIcon,
  github: GitHubIcon,
  discord: DiscordIcon,
  apple: AppleIcon,
  kakao: KakaoIcon,
  facebook: FacebookIcon
}

/**
 * Main provider icon component
 */
export const ProviderIcon: React.FC<ProviderIconProps> = ({
  provider,
  size = 'md',
  variant = 'icon-only',
  shape = 'rounded',
  colorScheme = 'default',
  className,
  showText = false,
  text,
  loading = false,
  onClick
}) => {
  const config = providerConfig[provider]
  const sizeSettings = sizeConfig[size]
  const IconComponent = IconComponents[provider]
  
  if (!config || !IconComponent) {
    console.warn(`Unsupported provider: ${provider}`)
    return null
  }
  
  const displayText = text || config.name
  const shouldShowText = showText || variant === 'with-text'
  
  // Determine styling based on color scheme and variant
  const getBrandedStyles = () => {
    if (colorScheme === 'branded' || variant === 'branded') {
      return {
        backgroundColor: config.brandBackground,
        borderColor: config.brandBorder,
        color: config.textColor
      }
    }
    return {}
  }
  
  const containerClasses = cn(
    'inline-flex items-center justify-center',
    'transition-all duration-200',
    // Base styling
    variant !== 'icon-only' && sizeSettings.container,
    variant === 'icon-only' && sizeSettings.icon,
    // Shape
    shapeStyles[shape],
    // Color scheme
    colorScheme === 'monochrome' && 'text-muted-foreground',
    colorScheme === 'default' && 'text-foreground',
    // Interactive states
    onClick && 'cursor-pointer hover:opacity-80',
    // Loading state
    loading && 'animate-pulse opacity-50',
    // Border for branded variant
    (colorScheme === 'branded' || variant === 'branded') && 'border',
    className
  )
  
  const iconClasses = cn(
    sizeSettings.icon,
    colorScheme === 'monochrome' && 'text-muted-foreground',
    colorScheme === 'branded' && provider === 'google' && 'text-transparent' // Google icon has built-in colors
  )
  
  const handleClick = () => {
    if (!loading && onClick) {
      onClick()
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }
  
  return (
    <div
      className={containerClasses}
      style={getBrandedStyles()}
      onClick={handleClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Sign in with ${config.name}` : `${config.name} icon`}
    >
      {/* Loading state */}
      {loading ? (
        <div className={cn(sizeSettings.icon, 'bg-muted animate-pulse rounded')} />
      ) : (
        <>
          <IconComponent className={iconClasses} />
          {shouldShowText && (
            <span className={cn(sizeSettings.text, 'font-medium ml-2')}>
              {displayText}
            </span>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Provider icon group for displaying multiple providers
 */
export interface ProviderIconGroupProps {
  /**
   * Array of providers to display
   */
  providers: ProviderIconProps['provider'][]
  
  /**
   * Icon size
   */
  size?: ProviderIconProps['size']
  
  /**
   * Display variant
   */
  variant?: ProviderIconProps['variant']
  
  /**
   * Shape styling
   */
  shape?: ProviderIconProps['shape']
  
  /**
   * Color scheme
   */
  colorScheme?: ProviderIconProps['colorScheme']
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Spacing between icons
   */
  spacing?: 'tight' | 'normal' | 'loose'
  
  /**
   * Click handler with provider
   */
  onProviderClick?: (provider: ProviderIconProps['provider']) => void
}

const spacingClasses = {
  tight: 'gap-1',
  normal: 'gap-2',
  loose: 'gap-4'
}

export const ProviderIconGroup: React.FC<ProviderIconGroupProps> = ({
  providers,
  size = 'md',
  variant = 'icon-only',
  shape = 'rounded',
  colorScheme = 'default',
  className,
  spacing = 'normal',
  onProviderClick
}) => {
  return (
    <div className={cn('flex items-center', spacingClasses[spacing], className)}>
      {providers.map((provider) => (
        <ProviderIcon
          key={provider}
          provider={provider}
          size={size}
          variant={variant}
          shape={shape}
          colorScheme={colorScheme}
          onClick={onProviderClick ? () => onProviderClick(provider) : undefined}
        />
      ))}
    </div>
  )
}

/**
 * Preset provider icon variants for common use cases
 */
export const ProviderIconPresets = {
  /**
   * Sign-in button variant
   */
  SignInButton: (props: Omit<ProviderIconProps, 'variant' | 'showText'>) => (
    <ProviderIcon {...props} variant="with-text" showText={true} />
  ),
  
  /**
   * Compact icon for headers/lists
   */
  CompactIcon: (props: Omit<ProviderIconProps, 'size' | 'variant'>) => (
    <ProviderIcon {...props} size="sm" variant="icon-only" />
  ),
  
  /**
   * Branded button with provider colors
   */
  BrandedButton: (props: Omit<ProviderIconProps, 'variant' | 'colorScheme'>) => (
    <ProviderIcon {...props} variant="branded" colorScheme="branded" />
  )
}

export default ProviderIcon