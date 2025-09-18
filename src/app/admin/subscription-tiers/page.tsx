'use client'

import React, { useReducer, useEffect, useCallback, useMemo, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save, Users, Crown, Zap, Star, Dumbbell, Shield, Settings, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { debounce } from 'lodash'

// Optimized types
interface SubscriptionLimits {
  tier: string
  monthly_reading_limit: number | null
  can_see_leaderboard: boolean
  can_join_leaderboard: boolean
  can_see_book_stats: boolean
  can_export_data: boolean
  visible_user_stats: Record<string, boolean>
  visible_book_stats: Record<string, boolean>
  created_at: string
  updated_at: string
}

interface TierData {
  id: string
  name: string
  subscription: SubscriptionLimits
  hasChanges: boolean
  isLoading: boolean
  lastSaved?: number
}

interface AppState {
  tiers: Record<string, TierData>
  isLoading: boolean
  error: string | null
  lastFetch: number
}

// Optimized actions
type ActionType = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: TierData[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'UPDATE_FIELD'; payload: { tierId: string; field: string; value: unknown; section: 'subscription' } }
  | { type: 'SAVE_START'; payload: string }
  | { type: 'SAVE_SUCCESS'; payload: { tierId: string; data: SubscriptionLimits; section: 'subscription' } }
  | { type: 'SAVE_ERROR'; payload: { tierId: string; error: string } }
  | { type: 'RESET_CHANGES'; payload: string }

// Efficient shallow comparison
const shallowEqual = (obj1: Record<string, unknown>, obj2: Record<string, unknown>): boolean => {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  
  if (keys1.length !== keys2.length) return false
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false
  }
  return true
}

// Optimized reducer with immutable updates
function tierReducer(state: AppState, action: ActionType): AppState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null }
    
    case 'FETCH_SUCCESS':
      const tiersMap: Record<string, TierData> = {}
      action.payload.forEach(tier => {
        tiersMap[tier.id] = { ...tier, hasChanges: false, isLoading: false }
      })
      return { 
        ...state, 
        tiers: tiersMap, 
        isLoading: false, 
        error: null,
        lastFetch: Date.now()
      }
    
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload }
    
    case 'UPDATE_FIELD':
      const { tierId, field, value, section } = action.payload
      const currentTier = state.tiers[tierId]
      if (!currentTier) return state

      const updatedSection = { ...currentTier[section], [field]: value }
      const hasChanges = !shallowEqual(updatedSection as unknown as Record<string, unknown>, currentTier[section] as unknown as Record<string, unknown>)

      return {
        ...state,
        tiers: {
          ...state.tiers,
          [tierId]: {
            ...currentTier,
            [section]: updatedSection,
            hasChanges
          }
        }
      }
    
    case 'SAVE_START':
      return {
        ...state,
        tiers: {
          ...state.tiers,
          [action.payload]: {
            ...state.tiers[action.payload],
            isLoading: true
          }
        }
      }
    
    case 'SAVE_SUCCESS':
      const { tierId: saveId, data, section: saveSection } = action.payload
      return {
        ...state,
        tiers: {
          ...state.tiers,
          [saveId]: {
            ...state.tiers[saveId],
            [saveSection]: data,
            hasChanges: false,
            isLoading: false,
            lastSaved: Date.now()
          }
        }
      }
    
    case 'SAVE_ERROR':
      return {
        ...state,
        tiers: {
          ...state.tiers,
          [action.payload.tierId]: {
            ...state.tiers[action.payload.tierId],
            isLoading: false
          }
        },
        error: action.payload.error
      }
    
    case 'RESET_CHANGES':
      // Reset to original data by refetching
      return state
    
    default:
      return state
  }
}

// Memoized tier configuration
const TIER_CONFIG = {
  free: { icon: Users, color: 'bg-gray-400', badge: 'FREE' },
  reader: { icon: Crown, color: 'bg-blue-500', badge: 'READER' },
  pro: { icon: Zap, color: 'bg-purple-500', badge: 'PRO' }
} as const

const USER_STATS = [
  { key: 'total_users', label: 'Total Users', icon: Users },
  { key: 'active_users', label: 'Active Users', icon: CheckCircle },
  { key: 'conversion_rate', label: 'Conversion Rate', icon: Star },
  { key: 'retention_rate', label: 'Retention Rate', icon: Shield }
] as const

const BOOK_STATS = [
  { key: 'reader_count', label: 'Reader Count', icon: Users },
  { key: 'avg_rating', label: 'Average Rating', icon: Star },
  { key: 'avg_reading_speed', label: 'Average Reading Speed', icon: Dumbbell },
  { key: 'completion_rate', label: 'Completion Rate', icon: Shield },
  { key: 'session_analytics', label: 'Session Analytics', icon: Settings }
] as const

// Optimized debounced input component
const DebouncedInput = memo(({ 
  value, 
  onChange, 
  type = 'text',
  placeholder,
  className,
  disabled
}: {
  value: string | number
  onChange: (value: string | number) => void
  type?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}) => {
  const debouncedOnChange = useMemo(
    () => debounce((val: string | number) => onChange(val), 300),
    [onChange]
  )

  return (
    <Input
      type={type}
      defaultValue={value}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      onChange={(e) => {
        const val = type === 'number' ? (e.target.value ? parseInt(e.target.value) : '') : e.target.value
        debouncedOnChange(val)
      }}
    />
  )
})

DebouncedInput.displayName = 'DebouncedInput'

// Memoized tier card component
const TierCard = memo(({ 
  tier, 
  onUpdate, 
  onSave 
}: { 
  tier: TierData
  onUpdate: (field: string, value: unknown, section: 'subscription') => void
  onSave: (section: 'subscription') => void
}) => {
  const config = TIER_CONFIG[tier.id as keyof typeof TIER_CONFIG]
  const Icon = config.icon

  const handleSubscriptionSave = useCallback(() => onSave('subscription'), [onSave])

  const subscriptionUpdate = useCallback((field: string, value: unknown) => 
    onUpdate(field, value, 'subscription'), [onUpdate])

  return (
    <Card className="relative min-h-[700px] flex flex-col">
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage {tier.name.toLowerCase()} tier limits and features
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="h-6">
            {config.badge}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <Tabs defaultValue="limits" className="space-y-4 flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="limits">Limits</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="limits" className="space-y-6 flex-1 flex flex-col">
            {/* Reading Limits */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium">Reading Limits</h4>
              <div className="max-w-sm">
                <div>
                  <Label className="text-sm font-medium">Monthly Submissions</Label>
                  <DebouncedInput
                    type="number"
                    value={tier.subscription.monthly_reading_limit || ''}
                    onChange={(value) => subscriptionUpdate('monthly_reading_limit', value === '' ? null : value)}
                    placeholder="Unlimited"
                    className="mt-1"
                    disabled={tier.isLoading}
                  />
                </div>
              </div>
            </div>


            <div className="mt-auto pt-6">
              <Button
                onClick={handleSubscriptionSave}
                disabled={!tier.hasChanges || tier.isLoading}
                className="w-full"
              >
                {tier.isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Limits
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6 flex-1 flex flex-col">
            <div className="space-y-4">
              <h4 className="text-lg font-medium">Feature Access</h4>
              <div className="space-y-3">
                {[
                  { key: 'can_see_leaderboard', label: 'View Leaderboard' },
                  { key: 'can_join_leaderboard', label: 'Join Leaderboard' },
                  { key: 'can_see_book_stats', label: 'View Book Statistics' },
                  { key: 'can_export_data', label: 'Export Data' }
                ].map(feature => (
                  <div key={feature.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <Label className="text-sm font-medium">{feature.label}</Label>
                    <Switch
                      checked={tier.subscription[feature.key as keyof SubscriptionLimits] as boolean || false}
                      onCheckedChange={(checked) => subscriptionUpdate(feature.key, checked)}
                      disabled={tier.isLoading}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-6">
              <Button
                onClick={handleSubscriptionSave}
                disabled={!tier.hasChanges || tier.isLoading}
                className="w-full"
              >
                {tier.isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Features
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6 flex-1 flex flex-col">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Visible User Statistics</h4>
                <div className="space-y-3">
                  {USER_STATS.map(stat => (
                    <div key={stat.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <stat.icon className="h-4 w-4" />
                        <Label className="text-sm font-medium">{stat.label}</Label>
                      </div>
                      <Switch
                        checked={tier.subscription.visible_user_stats?.[stat.key] || false}
                        onCheckedChange={(checked) => 
                          subscriptionUpdate('visible_user_stats', {
                            ...tier.subscription.visible_user_stats,
                            [stat.key]: checked
                          })
                        }
                        disabled={tier.isLoading}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Visible Book Statistics</h4>
                <div className="space-y-3">
                  {BOOK_STATS.map(stat => (
                    <div key={stat.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <stat.icon className="h-4 w-4" />
                        <Label className="text-sm font-medium">{stat.label}</Label>
                      </div>
                      <Switch
                        checked={tier.subscription.visible_book_stats?.[stat.key] || false}
                        onCheckedChange={(checked) => 
                          subscriptionUpdate('visible_book_stats', {
                            ...tier.subscription.visible_book_stats,
                            [stat.key]: checked
                          })
                        }
                        disabled={tier.isLoading}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <Button
                onClick={handleSubscriptionSave}
                disabled={!tier.hasChanges || tier.isLoading}
                className="w-full"
              >
                {tier.isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Statistics
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
})

TierCard.displayName = 'TierCard'

// Main optimized component
export default function SubscriptionTiersPage() {
  const { toast } = useToast()
  
  const [state, dispatch] = useReducer(tierReducer, {
    tiers: {},
    isLoading: true,
    error: null,
    lastFetch: 0
  })

  // Optimized API calls
  const fetchTiers = useCallback(async () => {
    dispatch({ type: 'FETCH_START' })
    try {
      const response = await fetch('/api/admin/subscription-tiers/unified')
      if (!response.ok) throw new Error('Failed to fetch tiers')
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to fetch tiers')
      
      dispatch({ type: 'FETCH_SUCCESS', payload: result.data })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      dispatch({ type: 'FETCH_ERROR', payload: message })
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }, [toast])

  // Optimized save function
  const saveTier = useCallback(async (tierId: string, section: 'subscription') => {
    const tier = state.tiers[tierId]
    if (!tier || !tier.hasChanges) return

    dispatch({ type: 'SAVE_START', payload: tierId })
    
    try {
      const response = await fetch('/api/admin/subscription-tiers/unified', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierId,
          type: section,
          data: tier[section]
        })
      })

      if (!response.ok) throw new Error('Failed to save changes')
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to save changes')

      dispatch({ 
        type: 'SAVE_SUCCESS', 
        payload: { tierId, data: result.data, section } 
      })

      toast({
        title: 'Success',
        description: result.message || 'Changes saved successfully'
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      dispatch({ 
        type: 'SAVE_ERROR', 
        payload: { tierId, error: message } 
      })
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }, [state.tiers, toast])

  // Optimized field update
  const updateField = useCallback((tierId: string, field: string, value: unknown, section: 'subscription') => {
    dispatch({ 
      type: 'UPDATE_FIELD', 
      payload: { tierId, field, value, section } 
    })
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchTiers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Memoized tier list
  const tierList = useMemo(() => 
    Object.values(state.tiers).sort((a, b) => {
      const order = { free: 0, reader: 1, pro: 2 }
      return order[a.id as keyof typeof order] - order[b.id as keyof typeof order]
    }),
    [state.tiers]
  )

  if (state.isLoading && tierList.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading subscription tiers...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Tiers</h1>
          <p className="text-muted-foreground">
            Manage subscription tier limits, features, and permissions
          </p>
        </div>
        
      </div>

      {state.error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">{state.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tierList.map(tier => (
          <TierCard
            key={tier.id}
            tier={tier}
            onUpdate={(field, value, section) => updateField(tier.id, field, value, section)}
            onSave={(section) => saveTier(tier.id, section)}
          />
        ))}
      </div>
    </div>
  )
}