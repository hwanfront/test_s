/**
 * User Avatar Component (Task T100)
 * 
 * Shared UI component for displaying user avatars with fallbacks
 * Supports OAuth provider avatars with proper loading states
 */

'use client'

import React, { useState } from 'react'
import { cn } from '@/shared/lib'
import { User, UserCheck, UserX } from 'lucide-react'

export interface UserAvatarProps {
  /**
   * User information
   */
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    provider?: 'google' | 'naver'
  } | null
  
  /**
   * Avatar size
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  
  /**
   * Shape variant
   */
  shape?: 'circle' | 'square' | 'rounded'
  
  /**
   * Status indicator
   */
  status?: 'online' | 'offline' | 'away' | 'busy' | null
  
  /**
   * Show status indicator
   */
  showStatus?: boolean
  
  /**
   * Fallback when no image available
   */
  fallback?: 'initials' | 'icon' | 'custom'
  
  /**
   * Custom fallback content
   */
  customFallback?: React.ReactNode
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Loading state
   */
  loading?: boolean
  
  /**
   * Click handler
   */
  onClick?: () => void
  
  /**
   * Alt text for accessibility
   */
  alt?: string
  
  /**
   * High quality image for larger sizes
   */
  priority?: boolean
}

/**
 * Size configuration mapping
 */
const sizeConfig = {
  xs: { 
    container: 'w-6 h-6', 
    text: 'text-xs', 
    status: 'w-2 h-2',
    statusPosition: '-bottom-0 -right-0'
  },
  sm: { 
    container: 'w-8 h-8', 
    text: 'text-sm', 
    status: 'w-2.5 h-2.5',
    statusPosition: '-bottom-0.5 -right-0.5'
  },
  md: { 
    container: 'w-10 h-10', 
    text: 'text-base', 
    status: 'w-3 h-3',
    statusPosition: '-bottom-0.5 -right-0.5'
  },
  lg: { 
    container: 'w-12 h-12', 
    text: 'text-lg', 
    status: 'w-3.5 h-3.5',
    statusPosition: '-bottom-1 -right-1'
  },
  xl: { 
    container: 'w-16 h-16', 
    text: 'text-xl', 
    status: 'w-4 h-4',
    statusPosition: '-bottom-1 -right-1'
  },
  '2xl': { 
    container: 'w-20 h-20', 
    text: 'text-2xl', 
    status: 'w-5 h-5',
    statusPosition: '-bottom-1.5 -right-1.5'
  }
}

/**
 * Status color mapping
 */
const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500'
}

/**
 * Shape styling mapping
 */
const shapeStyles = {
  circle: 'rounded-full',
  square: 'rounded-none',
  rounded: 'rounded-lg'
}

/**
 * Generate initials from name or email
 */
function generateInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('')
  }
  
  if (email) {
    return email.charAt(0).toUpperCase()
  }
  
  return '?'
}

/**
 * Get contrast color for background
 */
function getContrastColor(str: string): string {
  // Simple hash function to generate consistent colors
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Generate HSL color with good contrast
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 45%)`
}

/**
 * Main user avatar component
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  shape = 'circle',
  status,
  showStatus = false,
  fallback = 'initials',
  customFallback,
  className,
  loading = false,
  onClick,
  alt,
  priority = false
}) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  const config = sizeConfig[size]
  const hasImage = user?.image && !imageError
  const initials = generateInitials(user?.name, user?.email)
  const displayName = user?.name || user?.email || 'User'
  
  // Generate background color for initials
  const backgroundColor = user ? getContrastColor(user.email || user.name || '') : '#6b7280'
  
  const handleImageLoad = () => {
    setImageLoading(false)
  }
  
  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }
  
  const containerClasses = cn(
    'relative inline-flex items-center justify-center',
    'font-medium text-white overflow-hidden',
    'transition-all duration-200',
    config.container,
    shapeStyles[shape],
    onClick && 'cursor-pointer hover:opacity-80',
    loading && 'animate-pulse bg-muted',
    className
  )
  
  const renderFallback = () => {
    if (customFallback) {
      return customFallback
    }
    
    if (fallback === 'icon') {
      return <User className={cn('text-gray-400', size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5')} />
    }
    
    // Default to initials
    return (
      <span 
        className={cn(config.text, 'font-semibold')}
        style={{ color: 'white' }}
      >
        {initials}
      </span>
    )
  }
  
  return (
    <div 
      className={containerClasses}
      onClick={onClick}
      style={!hasImage ? { backgroundColor } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* User image */}
      {hasImage && !loading && (
        <img
          src={user!.image!}
          alt={alt || `Avatar for ${displayName}`}
          className={cn(
            'w-full h-full object-cover',
            shapeStyles[shape],
            imageLoading && 'opacity-0'
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}
      
      {/* Fallback content */}
      {(!hasImage || imageLoading) && !loading && renderFallback()}
      
      {/* Status indicator */}
      {showStatus && status && (
        <div
          className={cn(
            'absolute border-2 border-white rounded-full',
            config.status,
            config.statusPosition,
            statusColors[status]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  )
}

/**
 * Avatar group component for displaying multiple users
 */
export interface UserAvatarGroupProps {
  /**
   * Array of users to display
   */
  users: UserAvatarProps['user'][]
  
  /**
   * Maximum number of avatars to show
   */
  max?: number
  
  /**
   * Avatar size
   */
  size?: UserAvatarProps['size']
  
  /**
   * Avatar shape
   */
  shape?: UserAvatarProps['shape']
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Show count of remaining users
   */
  showCount?: boolean
  
  /**
   * Spacing between avatars
   */
  spacing?: 'tight' | 'normal' | 'loose'
}

const spacingConfig = {
  tight: '-space-x-1',
  normal: '-space-x-2',
  loose: '-space-x-3'
}

export const UserAvatarGroup: React.FC<UserAvatarGroupProps> = ({
  users,
  max = 3,
  size = 'md',
  shape = 'circle',
  className,
  showCount = true,
  spacing = 'normal'
}) => {
  const visibleUsers = users.slice(0, max)
  const remainingCount = Math.max(0, users.length - max)
  
  return (
    <div className={cn('flex items-center', spacingConfig[spacing], className)}>
      {visibleUsers.map((user, index) => (
        <UserAvatar
          key={user?.email || index}
          user={user}
          size={size}
          shape={shape}
          className="ring-2 ring-background"
        />
      ))}
      
      {showCount && remainingCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center',
            'bg-muted text-muted-foreground font-medium',
            'ring-2 ring-background',
            sizeConfig[size].container,
            sizeConfig[size].text,
            shapeStyles[shape]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

/**
 * Preset avatar variants for common use cases
 */
export const UserAvatarPresets = {
  /**
   * Header/navigation avatar
   */
  Header: (props: Omit<UserAvatarProps, 'size' | 'showStatus'>) => (
    <UserAvatar {...props} size="sm" showStatus={false} />
  ),
  
  /**
   * Profile page avatar
   */
  Profile: (props: Omit<UserAvatarProps, 'size' | 'showStatus'>) => (
    <UserAvatar {...props} size="2xl" showStatus={true} />
  ),
  
  /**
   * Comment/message avatar
   */
  Comment: (props: Omit<UserAvatarProps, 'size' | 'shape'>) => (
    <UserAvatar {...props} size="md" shape="circle" />
  ),
  
  /**
   * List item avatar
   */
  ListItem: (props: Omit<UserAvatarProps, 'size' | 'shape'>) => (
    <UserAvatar {...props} size="lg" shape="rounded" />
  )
}

export default UserAvatar