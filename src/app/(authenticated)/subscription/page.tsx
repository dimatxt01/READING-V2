import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Crown, Check, Zap } from 'lucide-react'

export default async function SubscriptionPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user profile with subscription info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const currentPlan = profile?.subscription_tier || 'free'
  const subscriptionStatus = profile?.subscription_status || 'inactive'
  const memberSince = profile?.created_at ? new Date(profile.created_at) : new Date()

  const plans = [
    {
      name: 'Free',
      tier: 'free',
      price: '$0',
      description: 'Perfect for getting started',
      features: [
        '30 submissions per month',
        '1 basic exercise',
        'View leaderboard',
        'Basic analytics'
      ],
      current: currentPlan === 'free'
    },
    {
      name: 'Reader',
      tier: 'reader',
      price: '$8.99',
      period: '/month',
      description: 'For serious readers',
      features: [
        'Unlimited submissions',
        '5 exercises',
        'Join leaderboard',
        'Book analytics',
        'Custom texts storage'
      ],
      current: currentPlan === 'reader',
      popular: true
    },
    {
      name: 'Pro',
      tier: 'pro',
      price: '$15.99',
      period: '/month',
      description: 'Everything you need',
      features: [
        'Everything in Reader',
        'All exercises',
        'Advanced analytics',
        'Unlimited custom texts',
        'Export data (CSV, PDF)',
        'Priority support',
        'All future features'
      ],
      current: currentPlan === 'pro'
    }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
        <p className="mt-2 text-gray-600">
          Choose the plan that&apos;s right for your reading journey
        </p>
      </div>

      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold capitalize">{currentPlan} Plan</p>
                <p className="text-sm text-gray-600">
                  {currentPlan === 'free' && 'Limited features available'}
                  {currentPlan === 'reader' && 'Great choice for regular readers'}
                  {currentPlan === 'pro' && 'Access to all features'}
                </p>
              </div>
              <Badge variant={currentPlan === 'pro' ? 'default' : 'secondary'}>
                {currentPlan === 'free' && 'Free'}
                {currentPlan === 'reader' && 'Reader'}
                {currentPlan === 'pro' && 'Pro'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium capitalize">
                  {subscriptionStatus === 'active' && (
                    <span className="text-green-600">Active</span>
                  )}
                  {subscriptionStatus === 'inactive' && (
                    <span className="text-gray-600">Inactive</span>
                  )}
                  {subscriptionStatus === 'cancelled' && (
                    <span className="text-red-600">Cancelled</span>
                  )}
                  {subscriptionStatus === 'past_due' && (
                    <span className="text-yellow-600">Past Due</span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="font-medium">
                  {memberSince.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">
                  {currentPlan === 'free' ? 'Submissions Used' : 'Next Billing'}
                </p>
                <p className="font-medium">
                  {currentPlan === 'free' 
                    ? `${profile?.total_pages_read || 0} pages read`
                    : subscriptionStatus === 'active' 
                      ? 'Next month'
                      : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card key={plan.tier} className={`relative ${plan.popular ? 'ring-2 ring-emerald-500' : ''}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-emerald-500 text-white">
                  <Zap className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                {plan.period && <span className="text-gray-600">{plan.period}</span>}
              </div>
              <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full mt-6" 
                variant={plan.current ? 'outline' : 'default'}
                disabled={plan.current}
              >
                {plan.current ? 'Current Plan' : `Upgrade to ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle>Add-ons</CardTitle>
          <p className="text-sm text-gray-600">One-time purchases to enhance your experience</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Lifetime Pro</h3>
              <p className="text-sm text-gray-600">Get Pro features forever with a one-time payment</p>
              <Badge variant="secondary" className="mt-1">Limited Time</Badge>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">$399</p>
              <Button size="sm">Purchase</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}