'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

interface UserData {
  userId: string
  userName: string
  avatarUrl?: string
  color: string
  rank?: number
  isCurrentUser?: boolean
}

interface ChartDataPoint {
  date: string
  formattedDate: string
  [userId: string]: number | string // Dynamic keys for each user's pages
}

interface MultiUserProgressChartProps {
  currentUserId: string
  topUserIds?: string[] // Top 3 users from leaderboard
  title?: string
  description?: string
}

type TimeRange = 'week' | 'month' | 'year' | 'all'

// Color palette for different users
const USER_COLORS = [
  '#059669', // Green for current user
  '#dc2626', // Red for #1
  '#2563eb', // Blue for #2
  '#7c3aed', // Purple for #3
  '#ea580c', // Orange for #4
]

// Custom dot component to show avatars at endpoints
const MultiUserAvatarDot = (props: DotProps & { 
  payload?: ChartDataPoint
  dataLength?: number
  userData?: UserData
  userId?: string
}) => {
  const { cx = 0, cy = 0, index = 0, dataLength, userData } = props as DotProps & { 
    payload?: ChartDataPoint
    dataLength?: number
    userData?: UserData
    userId?: string
    cx?: number
    cy?: number
    index?: number
  }
  
  // Only show avatars at last point for each user
  if (!dataLength || index !== dataLength - 1 || !userData?.avatarUrl) {
    return <circle cx={cx} cy={cy} r={3} fill={userData?.color || '#059669'} />
  }
  
  const avatarSize = userData.isCurrentUser ? 20 : 16 // Bigger for current user
  
  return (
    <g>
      <defs>
        <clipPath id={`avatar-clip-${userData.userId}-${index}`}>
          <circle cx={cx} cy={cy} r={avatarSize} />
        </clipPath>
        <pattern id={`avatar-pattern-${userData.userId}-${index}`} x="0" y="0" width="100%" height="100%">
          <image
            x="0"
            y="0"
            width={avatarSize * 2}
            height={avatarSize * 2}
            href={userData.avatarUrl}
            preserveAspectRatio="xMidYMid slice"
          />
        </pattern>
      </defs>
      <circle cx={cx} cy={cy} r={avatarSize} fill={`url(#avatar-pattern-${userData.userId}-${index})`} />
      <circle cx={cx} cy={cy} r={avatarSize} fill="none" stroke="#e5e7eb" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={avatarSize + 1} fill="none" stroke={userData.color} strokeWidth={2} />
    </g>
  )
}

// Custom tooltip for multiple users
const MultiUserTooltip = ({ active, payload, label, users }: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
  users?: UserData[]
}) => {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload
          .sort((a, b) => b.value - a.value)
          .map((entry) => {
            const user = users?.find((u: UserData) => u.userId === entry.dataKey)
            if (!user || entry.value === 0) return null
            return (
              <div key={entry.dataKey} className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-muted-foreground">
                    {user.userName}
                    {user.isCurrentUser && ' (You)'}
                  </span>
                </div>
                <span className="text-sm font-medium">{entry.value} pages</span>
              </div>
            )
          })}
      </div>
    )
  }
  return null
}

// Custom legend with avatars
const CustomLegend = ({ users }: { users: UserData[] }) => {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-4">
      {users.map((user) => (
        <div key={user.userId} className="flex items-center gap-2">
          {user.avatarUrl ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback>{user.userName.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: user.color }} />
          )}
          <span className="text-sm text-muted-foreground">
            {user.rank && `#${user.rank} `}
            {user.userName}
            {user.isCurrentUser && ' (You)'}
          </span>
        </div>
      ))}
    </div>
  )
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

export function MultiUserProgressChart({ 
  currentUserId, 
  topUserIds = [],
  title = "Reading Progress Comparison",
  description = "Compare reading progress with top performers"
}: MultiUserProgressChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [users, setUsers] = useState<UserData[]>([])
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
            startDate = new Date('2024-01-01')
            break
        }

        // Combine current user with top users (max 5 total)
        const userIds = [currentUserId, ...topUserIds.filter(id => id !== currentUserId)].slice(0, 5)

        // Fetch data for multiple users
        const response = await fetch('/api/leaderboard/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userIds,
            startDate: startDate.toISOString(), 
            endDate: endDate.toISOString(),
            timeRange 
          })
        })

        const result = await response.json()
        
        if (result.error) {
          console.error('Error fetching progress data:', result.error)
          setData([])
          return
        }

        // Process the data
        const { data: usersData, chartData } = result
        
        // Set users with proper colors and rankings
        const processedUsers = usersData.map((user: UserData & { userId: string; userName: string }, index: number) => ({
          ...user,
          color: user.userId === currentUserId ? USER_COLORS[0] : USER_COLORS[index],
          isCurrentUser: user.userId === currentUserId
        }))
        
        setUsers(processedUsers)
        setData(chartData)
        
      } catch (error) {
        console.error('Error fetching chart data:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [timeRange, currentUserId, topUserIds])

  const getYAxisDomain = () => {
    if (data.length === 0) return [0, 100]
    
    let maxPages = 0
    let minPages = Infinity
    
    data.forEach(point => {
      users.forEach(user => {
        const value = point[user.userId] as number
        if (typeof value === 'number') {
          maxPages = Math.max(maxPages, value)
          minPages = Math.min(minPages, value)
        }
      })
    })
    
    return [Math.max(0, minPages - 10), maxPages + 10]
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        ) : data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={400}>
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
                <Tooltip content={<MultiUserTooltip users={users} />} />
                
                {users.map((user) => (
                  <Line
                    key={user.userId}
                    type="monotone"
                    dataKey={user.userId}
                    stroke={user.color}
                    strokeWidth={user.isCurrentUser ? 3 : 2}
                    strokeOpacity={user.isCurrentUser ? 1 : 0.7}
                    dot={(props: DotProps) => (
                      <MultiUserAvatarDot 
                        {...props} 
                        dataLength={data.length} 
                        userData={user}
                      />
                    )}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <CustomLegend users={users} />
          </>
        ) : (
          <div className="h-[400px] flex items-center justify-center">
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