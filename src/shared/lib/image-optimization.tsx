/**
 * T129 [P] Implement image optimization and CDN setup
 * 
 * Image optimization utilities and CDN configuration
 */

import Image, { ImageProps } from 'next/image'
import React from 'react'

/**
 * Image optimization configuration
 */
export const imageConfig = {
  domains: [
    'lh3.googleusercontent.com', // Google profile images
    'phinf.pstatic.net',         // Naver profile images
    'images.unsplash.com',       // Unsplash images
    'res.cloudinary.com',        // Cloudinary CDN
    'cdn.jsdelivr.net',          // JSDeliver CDN
    'avatars.githubusercontent.com' // GitHub avatars
  ],
  formats: ['image/webp', 'image/avif'] as const,
  quality: {
    thumbnail: 50,
    medium: 75,
    high: 90,
    default: 75
  },
  sizes: {
    avatar: {
      sm: 32,
      md: 48,
      lg: 64,
      xl: 96
    },
    icon: {
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48
    },
    thumbnail: {
      sm: 150,
      md: 250,
      lg: 350
    },
    banner: {
      sm: 480,
      md: 768,
      lg: 1024,
      xl: 1280
    }
  }
}

/**
 * Optimized image component with automatic format selection
 */
interface OptimizedImageProps extends Omit<ImageProps, 'src' | 'quality'> {
  src: string
  fallback?: string
  aspectRatio?: 'square' | '16:9' | '4:3' | '3:2'
  quality?: 'thumbnail' | 'medium' | 'high' | number
  lazy?: boolean
  blur?: boolean
  cdn?: 'cloudinary' | 'imagekit' | 'none'
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallback,
  aspectRatio,
  quality = 'medium',
  lazy = true,
  blur = true,
  cdn = 'none',
  className,
  ...props
}) => {
  // Generate optimized src URL based on CDN
  const getOptimizedSrc = (originalSrc: string) => {
    if (cdn === 'cloudinary' && !originalSrc.includes('cloudinary.com')) {
      // Convert to Cloudinary URL with optimizations
      const cloudinaryBase = process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL
      if (cloudinaryBase) {
        const qualityParam = typeof quality === 'number' ? quality : imageConfig.quality[quality]
        return `${cloudinaryBase}/image/fetch/q_${qualityParam},f_auto,c_fill/${encodeURIComponent(originalSrc)}`
      }
    }
    
    if (cdn === 'imagekit' && !originalSrc.includes('imagekit.io')) {
      // Convert to ImageKit URL with optimizations
      const imagekitBase = process.env.NEXT_PUBLIC_IMAGEKIT_BASE_URL
      if (imagekitBase) {
        const qualityParam = typeof quality === 'number' ? quality : imageConfig.quality[quality]
        return `${imagekitBase}/tr:q-${qualityParam},f-auto/${encodeURIComponent(originalSrc)}`
      }
    }

    return originalSrc
  }

  // Generate responsive sizes string
  const getResponsiveSizes = () => {
    if (props.sizes) return props.sizes
    
    // Default responsive sizes based on aspect ratio
    if (aspectRatio === 'square') {
      return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
    }
    
    return '(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw'
  }

  // Generate aspect ratio styles
  const getAspectRatioStyles = () => {
    const ratios = {
      'square': 'aspect-square',
      '16:9': 'aspect-video',
      '4:3': 'aspect-[4/3]',
      '3:2': 'aspect-[3/2]'
    }
    
    return aspectRatio ? ratios[aspectRatio] : ''
  }

  // Error handling for broken images
  const [imageSrc, setImageSrc] = React.useState(getOptimizedSrc(src))
  const [hasError, setHasError] = React.useState(false)

  const handleError = () => {
    if (fallback && !hasError) {
      setImageSrc(fallback)
      setHasError(true)
    }
  }

  const qualityValue = typeof quality === 'number' ? quality : imageConfig.quality[quality]

  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={`${getAspectRatioStyles()} ${className || ''}`}
      sizes={getResponsiveSizes()}
      quality={qualityValue}
      placeholder={blur ? 'blur' : 'empty'}
      blurDataURL={blur ? generateBlurDataURL() : undefined}
      loading={lazy ? 'lazy' : 'eager'}
      onError={handleError}
      {...props}
    />
  )
}

/**
 * Avatar component with optimized sizing
 */
interface AvatarImageProps {
  src: string
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
  className?: string
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt,
  size = 'md',
  fallback,
  className
}) => {
  const sizeValue = imageConfig.sizes.avatar[size]
  
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={sizeValue}
      height={sizeValue}
      fallback={fallback}
      aspectRatio="square"
      quality="medium"
      className={`rounded-full ${className || ''}`}
      sizes={`${sizeValue}px`}
    />
  )
}

/**
 * Icon component with optimized sizing
 */
interface IconImageProps {
  src: string
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const IconImage: React.FC<IconImageProps> = ({
  src,
  alt,
  size = 'md',
  className
}) => {
  const sizeValue = imageConfig.sizes.icon[size]
  
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={sizeValue}
      height={sizeValue}
      quality="high"
      className={className}
      sizes={`${sizeValue}px`}
      blur={false}
    />
  )
}

/**
 * Responsive image component for different screen sizes
 */
interface ResponsiveImageProps extends OptimizedImageProps {
  breakpoints?: {
    mobile?: string
    tablet?: string
    desktop?: string
  }
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  breakpoints = {},
  ...props
}) => {
  const {
    mobile = '100vw',
    tablet = '75vw',
    desktop = '50vw'
  } = breakpoints

  const responsiveSizes = `(max-width: 640px) ${mobile}, (max-width: 1024px) ${tablet}, ${desktop}`

  return (
    <OptimizedImage
      {...props}
      sizes={responsiveSizes}
    />
  )
}

/**
 * Generate blur data URL for placeholder
 */
function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null
  if (!canvas) {
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
  }

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, width, height)
  }
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

/**
 * Image preloader utility
 */
export class ImagePreloader {
  private cache = new Set<string>()

  preload(src: string): Promise<void> {
    if (this.cache.has(src)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const img = new window.Image()
      
      img.onload = () => {
        this.cache.add(src)
        resolve()
      }
      
      img.onerror = reject
      img.src = src
    })
  }

  preloadMultiple(sources: string[]): Promise<void[]> {
    return Promise.all(sources.map(src => this.preload(src)))
  }

  isPreloaded(src: string): boolean {
    return this.cache.has(src)
  }

  clearCache(): void {
    this.cache.clear()
  }
}

/**
 * Global image preloader instance
 */
export const imagePreloader = new ImagePreloader()

/**
 * Image optimization utilities
 */
export const imageUtils = {
  /**
   * Get optimized image URL for different CDNs
   */
  getOptimizedUrl: (src: string, options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpeg' | 'png'
    cdn?: 'cloudinary' | 'imagekit'
  } = {}) => {
    const {
      width,
      height,
      quality = 75,
      format = 'webp',
      cdn = 'cloudinary'
    } = options

    if (cdn === 'cloudinary') {
      const cloudinaryBase = process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL
      if (cloudinaryBase) {
        let transformations = [`q_${quality}`, `f_${format}`]
        
        if (width) transformations.push(`w_${width}`)
        if (height) transformations.push(`h_${height}`)
        
        return `${cloudinaryBase}/image/fetch/${transformations.join(',')}/${encodeURIComponent(src)}`
      }
    }

    if (cdn === 'imagekit') {
      const imagekitBase = process.env.NEXT_PUBLIC_IMAGEKIT_BASE_URL
      if (imagekitBase) {
        let transformations = [`q-${quality}`, `f-${format}`]
        
        if (width) transformations.push(`w-${width}`)
        if (height) transformations.push(`h-${height}`)
        
        return `${imagekitBase}/tr:${transformations.join(',')}/${encodeURIComponent(src)}`
      }
    }

    return src
  },

  /**
   * Generate responsive srcSet for images
   */
  generateSrcSet: (src: string, widths: number[] = [480, 768, 1024, 1280]) => {
    return widths
      .map(width => `${imageUtils.getOptimizedUrl(src, { width })} ${width}w`)
      .join(', ')
  },

  /**
   * Check if image format is supported
   */
  supportsFormat: (format: 'webp' | 'avif'): boolean => {
    if (typeof window === 'undefined') return false
    
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    
    return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0
  },

  /**
   * Get best format for current browser
   */
  getBestFormat: (): 'avif' | 'webp' | 'jpeg' => {
    if (imageUtils.supportsFormat('avif')) return 'avif'
    if (imageUtils.supportsFormat('webp')) return 'webp'
    return 'jpeg'
  },

  /**
   * Preload critical images
   */
  preloadCritical: (images: string[]) => {
    images.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })
  }
}

/**
 * React hook for image optimization
 */
export function useImageOptimization() {
  const [format, setFormat] = React.useState<'avif' | 'webp' | 'jpeg'>('jpeg')
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const bestFormat = imageUtils.getBestFormat()
    setFormat(bestFormat)
    setIsLoading(false)
  }, [])

  const optimizeImage = React.useCallback((src: string, options: {
    width?: number
    height?: number
    quality?: number
  } = {}) => {
    if (isLoading) return src
    
    return imageUtils.getOptimizedUrl(src, {
      format,
      ...options
    })
  }, [format, isLoading])

  return {
    optimizeImage,
    format,
    isLoading,
    preload: imagePreloader.preload,
    utils: imageUtils
  }
}

/**
 * Image loading performance monitor
 */
export class ImagePerformanceMonitor {
  private metrics: Array<{
    src: string
    loadTime: number
    size: number
    timestamp: number
  }> = []

  startTracking(src: string) {
    const startTime = performance.now()
    
    const img = new window.Image()
    
    img.onload = () => {
      const loadTime = performance.now() - startTime
      const size = this.estimateImageSize(img)
      
      this.metrics.push({
        src,
        loadTime,
        size,
        timestamp: Date.now()
      })
      
      this.reportMetrics(src, loadTime, size)
    }
    
    img.src = src
  }

  private estimateImageSize(img: HTMLImageElement): number {
    // Rough estimation based on dimensions
    return img.naturalWidth * img.naturalHeight * 0.001 // KB estimate
  }

  private reportMetrics(src: string, loadTime: number, size: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🖼️ Image loaded: ${src.substring(0, 50)}...`)
      console.log(`⏱️ Load time: ${loadTime.toFixed(2)}ms`)
      console.log(`📊 Estimated size: ${size.toFixed(2)}KB`)
    }
  }

  getMetrics() {
    return {
      totalImages: this.metrics.length,
      averageLoadTime: this.metrics.reduce((sum, m) => sum + m.loadTime, 0) / this.metrics.length,
      totalSize: this.metrics.reduce((sum, m) => sum + m.size, 0),
      recentMetrics: this.metrics.slice(-10)
    }
  }

  clearMetrics() {
    this.metrics = []
  }
}

/**
 * Global performance monitor instance
 */
export const imagePerformanceMonitor = new ImagePerformanceMonitor()