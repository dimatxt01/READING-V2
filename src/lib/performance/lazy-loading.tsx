import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'

// Simple lazy loading with dynamic imports
export const LazyProgressChart = dynamic(
  () => import('@/components/dashboard/progress-chart').then(mod => ({ default: mod.ProgressChart })),
  {
    loading: () => <Skeleton className="h-[300px] w-full" />,
    ssr: false
  }
)

// ThreeTwoOne component - exercises currently disabled
export const LazyThreeTwoOnePage = dynamic(
  () => import('@/app/(authenticated)/exercises_disabled/3-2-1/page'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <Skeleton className="h-8 w-32 mx-auto mb-4" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    ),
    ssr: false
  }
)

export const LazyLeaderboard = dynamic(
  () => import('@/components/leaderboard/leaderboard').then(mod => ({ default: mod.Leaderboard })),
  {
    loading: () => (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    ),
    ssr: false
  }
)

export const LazyBookSearch = dynamic(
  () => import('@/components/books/book-search').then(mod => ({ default: mod.BookSearch })),
  {
    loading: () => <Skeleton className="h-10 w-full" />,
    ssr: false
  }
)

export const LazyAdminAnalytics = dynamic(
  () => import('@/app/admin/analytics/page'),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    ),
    ssr: false
  }
)

// Simple lazy image component
export function LazyImage({
  src,
  alt,
  className,
  width = 200,
  height = 200,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { width?: number; height?: number }) {
  return (
    <Image
      {...props}
      src={typeof src === 'string' ? src : ''}
      alt={alt || ''}
      width={width}
      height={height}
      className={className}
    />
  )
}