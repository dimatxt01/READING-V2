'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  DotProps,
} from 'recharts'
import { subDays } from 'date-fns'

interface ChartDataPoint {
  date: string
  pages: number
  formattedDate: string
  hasAvatar?: boolean
  avatarUrl?: string
}

interface ProgressChartProps {
  userId: string
}

type TimeRange = 'week' | 'month' | 'year' | 'all'

// Custom dot component to show avatars at endpoints
const AvatarDot = (props: DotProps & { payload?: ChartDataPoint; dataLength?: number }) => {
  const { cx = 0, cy = 0, payload, index = 0, dataLength } = props as DotProps & { payload?: ChartDataPoint; dataLength?: number; cx?: number; cy?: number; index?: number }
  
  // Only show avatars at first and last points
  if (!dataLength || (index !== 0 && index !== dataLength - 1)) {
    return <circle cx={cx} cy={cy} r={4} fill="#059669" />
  }
  
  if (payload?.avatarUrl) {
    return (
      <g>
        <defs>
          <clipPath id={`avatar-clip-${index}`}>
            <circle cx={cx} cy={cy} r={18} />
          </clipPath>
          <pattern id={`avatar-pattern-${index}`} x="0" y="0" width="100%" height="100%">
            <image
              x="0"
              y="0"
              width={36}
              height={36}
              href={payload.avatarUrl}
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        </defs>
        <circle cx={cx} cy={cy} r={18} fill={`url(#avatar-pattern-${index})`} />
        <circle cx={cx} cy={cy} r={18} fill="none" stroke="#e5e7eb" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={19} fill="none" stroke="#059669" strokeWidth={2} />
      </g>
    )
  }
  
  return <circle cx={cx} cy={cy} r={6} fill="#059669" />
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: ChartDataPoint }> }) => {
  if (active && payload && payload[0]) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium">{payload[0].payload.formattedDate}</p>
        <p className="text-sm text-muted-foreground">
          Pages: <span className="font-medium text-foreground">{payload[0].value}</span>
        </p>
      </div>
    )
  }
  return null
}

// Time range selector component
const TimeRangeSelector = ({
  value,
  onChange,
}: {
  value: TimeRange
  onChange: (value: TimeRange) => void
}) => {
  const ranges: TimeRange[] = ['week', 'month', 'year', 'all']
  
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {ranges.map((range) => (
        <Button
          key={range}
          variant={value === range ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(range)}
          className="capitalize"
        >
          {range}
        </Button>
      ))}
    </div>
  )
}

export function ProgressChart({ userId }: ProgressChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Get date range
        const endDate = new Date()
        let startDate: Date
        
        switch (timeRange) {
          case 'week':
            startDate = subDays(endDate, 7)
            break
          case 'month':
            startDate = subDays(endDate, 30)
            break
          case 'year':
            startDate = subDays(endDate, 365)
            break
          case 'all':
            startDate = new Date('2024-01-01') // Or fetch user's first submission date
            break
        }

        // Fetch actual reading data from database
        const { data: submissions, error } = await fetch('/api/dashboard/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            startDate: startDate.toISOString(), 
            endDate: endDate.toISOString(),
            timeRange 
          })
        }).then(res => res.json()).catch(() => ({ data: null, error: 'Failed to fetch' }))

        if (error) {
          console.error('Error fetching progress data:', error)
          setData([])
          return
        }
        
        const chartData = submissions || []
        
        // Fetch user's actual avatar from profile
        const profileRes = await fetch('/api/user/profile')
        const profileData = await profileRes.json()
        const avatarUrl = profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
        
        // Add avatar to endpoints
        if (chartData.length > 0) {
          chartData[0].avatarUrl = avatarUrl
          chartData[0].hasAvatar = true
          chartData[chartData.length - 1].avatarUrl = avatarUrl
          chartData[chartData.length - 1].hasAvatar = true
        }
        
        setData(chartData)
      } catch (error) {
        console.error('Error fetching chart data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [timeRange, userId])



  const getYAxisDomain = () => {
    if (data.length === 0) return [0, 100]
    const maxPages = Math.max(...data.map(d => d.pages))
    const minPages = Math.min(...data.map(d => d.pages))
    return [Math.max(0, minPages - 10), maxPages + 10]
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reading Progress</CardTitle>
            <CardDescription>Track your daily reading progress over time</CardDescription>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="formattedDate"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickLine={{ stroke: 'currentColor' }}
              />
              <YAxis
                className="text-xs"
                domain={getYAxisDomain()}
                tick={{ fill: 'currentColor' }}
                tickLine={{ stroke: 'currentColor' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="pages"
                stroke="#059669"
                strokeWidth={2}
                dot={(props: DotProps) => {
                  const { key, ...otherProps } = props as DotProps & { key?: string }
                  return (
                    <AvatarDot key={key} {...otherProps} dataLength={data.length} />
                  )
                }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No reading data available</p>
              <p className="text-sm text-muted-foreground">Start tracking your reading to see progress here</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}