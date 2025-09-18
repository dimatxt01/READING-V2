import { NextRequest } from 'next/server'
import React from 'react'

// Performance metrics collection
export class PerformanceMonitor {
  private static metrics: Map<string, {
    count: number
    totalTime: number
    avgTime: number
    minTime: number
    maxTime: number
    errors: number
    lastUpdated: number
  }> = new Map()

  private static observers: PerformanceObserver[] = []

  // Initialize performance monitoring
  static init() {
    if (typeof window !== 'undefined') {
      // Browser-side monitoring
      this.initBrowserMonitoring()
    } else {
      // Server-side monitoring
      this.initServerMonitoring()
    }
  }

  private static initBrowserMonitoring() {
    // Core Web Vitals monitoring
    this.observeWebVitals()
    
    // Navigation timing
    this.observeNavigationTiming()
    
    // Resource timing
    this.observeResourceTiming()
    
    // Long tasks
    this.observeLongTasks()
  }

  private static initServerMonitoring() {
    // Server-side performance monitoring setup
    console.log('Server-side performance monitoring initialized')
  }

  private static observeWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('LCP', entry.startTime)
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEntry & { processingStart: number; startTime: number }
        this.recordMetric('FID', fidEntry.processingStart - fidEntry.startTime)
      }
    }).observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number }
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value
        }
      }
      this.recordMetric('CLS', clsValue)
    }).observe({ entryTypes: ['layout-shift'] })
  }

  private static observeNavigationTiming() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const navEntry = entry as PerformanceNavigationTiming
        this.recordMetric('DOMContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart)
        this.recordMetric('LoadComplete', navEntry.loadEventEnd - navEntry.loadEventStart)
        this.recordMetric('TTFB', navEntry.responseStart - navEntry.requestStart)
      }
    }).observe({ entryTypes: ['navigation'] })
  }

  private static observeResourceTiming() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming
        const duration = resourceEntry.responseEnd - resourceEntry.requestStart
        
        // Categorize by resource type
        if (resourceEntry.name.includes('.js')) {
          this.recordMetric('JavaScript Load Time', duration)
        } else if (resourceEntry.name.includes('.css')) {
          this.recordMetric('CSS Load Time', duration)
        } else if (resourceEntry.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
          this.recordMetric('Image Load Time', duration)
        }
      }
    }).observe({ entryTypes: ['resource'] })
  }

  private static observeLongTasks() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('Long Task', entry.duration)
        
        // Alert for tasks longer than 100ms
        if (entry.duration > 100) {
          console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`)
        }
      }
    }).observe({ entryTypes: ['longtask'] })
  }

  // Record a performance metric
  static recordMetric(name: string, value: number, isError: boolean = false) {
    const existing = this.metrics.get(name) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      lastUpdated: Date.now()
    }

    existing.count++
    existing.totalTime += value
    existing.avgTime = existing.totalTime / existing.count
    existing.minTime = Math.min(existing.minTime, value)
    existing.maxTime = Math.max(existing.maxTime, value)
    existing.lastUpdated = Date.now()
    
    if (isError) {
      existing.errors++
    }

    this.metrics.set(name, existing)
  }

  // Get all metrics
  static getMetrics() {
    return Object.fromEntries(this.metrics.entries())
  }

  // Get specific metric
  static getMetric(name: string) {
    return this.metrics.get(name)
  }

  // Clear metrics
  static clearMetrics() {
    this.metrics.clear()
  }

  // Export metrics for analysis
  static exportMetrics() {
    const metrics = this.getMetrics()
    const export_data = {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server',
      metrics
    }
    
    return export_data
  }
}

// API route performance middleware
export function withPerformanceMonitoring(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (req: NextRequest): Promise<Response> => {
    const startTime = performance.now()
    const route = new URL(req.url).pathname
    
    try {
      const response = await handler(req)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      PerformanceMonitor.recordMetric(`API:${route}`, duration)
      
      // Add performance headers
      response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`)
      
      return response
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      PerformanceMonitor.recordMetric(`API:${route}`, duration, true)
      throw error
    }
  }
}

// React component performance HOC
export function withComponentPerformance<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceWrappedComponent(props: T) {
    const startTime = performance.now()
    
    React.useEffect(() => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      PerformanceMonitor.recordMetric(`Component:${componentName}`, renderTime)
      
      if (renderTime > 16) { // Longer than one frame (60fps)
        console.warn(`Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`)
      }
    })
    
    return React.createElement(Component, props)
  }
}

// Performance alerts
export class PerformanceAlerts {
  private static thresholds = {
    LCP: 2500, // 2.5 seconds
    FID: 100, // 100ms
    CLS: 0.1, // 0.1
    TTFB: 600, // 600ms
    'API Response': 1000, // 1 second
    'Component Render': 16 // 16ms (60fps)
  }

  static checkThresholds() {
    const metrics = PerformanceMonitor.getMetrics()
    const alerts = []

    for (const [name, data] of Object.entries(metrics)) {
      const threshold = this.thresholds[name as keyof typeof this.thresholds]
      if (threshold && data.avgTime > threshold) {
        alerts.push({
          metric: name,
          value: data.avgTime,
          threshold,
          severity: data.avgTime > threshold * 2 ? 'high' : 'medium'
        })
      }
    }

    return alerts
  }

  static reportAlerts() {
    const alerts = this.checkThresholds()
    
    if (alerts.length > 0) {
      console.group('Performance Alerts')
      alerts.forEach(alert => {
        const style = alert.severity === 'high' ? 'color: red' : 'color: orange'
        console.warn(`%c${alert.metric}: ${alert.value.toFixed(2)}ms (threshold: ${alert.threshold}ms)`, style)
      })
      console.groupEnd()
    }
    
    return alerts
  }
}

// Bundle size monitoring
export class BundleMonitor {
  static trackBundleSize() {
    if (typeof window !== 'undefined') {
      // Estimate JavaScript bundle size
      const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[]
      let totalSize = 0
      
      scripts.forEach(script => {
        if (script.src && !script.src.includes('external')) {
          // This is an approximation - real bundle analysis would require build tools
          fetch(script.src, { method: 'HEAD' })
            .then(response => {
              const size = parseInt(response.headers.get('content-length') || '0')
              totalSize += size
              PerformanceMonitor.recordMetric('Bundle Size', totalSize)
            })
            .catch(() => {
              // Ignore errors for bundle size tracking
            })
        }
      })
    }
  }

  static getOptimizationSuggestions() {
    const metrics = PerformanceMonitor.getMetrics()
    const suggestions = []

    // Check for large bundles
    const bundleSize = metrics['Bundle Size']
    if (bundleSize && bundleSize.avgTime > 500000) { // 500KB
      suggestions.push('Consider code splitting to reduce bundle size')
    }

    // Check for slow API responses
    Object.entries(metrics).forEach(([name, data]) => {
      if (name.startsWith('API:') && data.avgTime > 1000) {
        suggestions.push(`Optimize ${name} - average response time: ${data.avgTime.toFixed(2)}ms`)
      }
    })

    // Check for slow component renders
    Object.entries(metrics).forEach(([name, data]) => {
      if (name.startsWith('Component:') && data.avgTime > 16) {
        suggestions.push(`Optimize ${name} rendering - average time: ${data.avgTime.toFixed(2)}ms`)
      }
    })

    return suggestions
  }
}

// Initialize monitoring when module loads
if (typeof window !== 'undefined') {
  // Client-side initialization
  PerformanceMonitor.init()
  BundleMonitor.trackBundleSize()
  
  // Report performance every 30 seconds
  setInterval(() => {
    PerformanceAlerts.reportAlerts()
  }, 30000)
}