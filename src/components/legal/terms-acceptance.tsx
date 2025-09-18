'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, FileText, Users, Database, Lock } from 'lucide-react'
// import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface TermsAcceptanceProps {
  userId?: string
  onAcceptance?: (accepted: boolean) => void
  required?: boolean
}

interface ConsentItem {
  id: string
  title: string
  description: string
  required: boolean
  type: 'terms' | 'privacy' | 'marketing' | 'analytics'
  icon: React.ComponentType<{ className?: string }>
}

const consentItems: ConsentItem[] = [
  {
    id: 'terms_of_service',
    title: 'Terms of Service',
    description: 'I agree to the Terms of Service and User Agreement',
    required: true,
    type: 'terms',
    icon: FileText,
  },
  {
    id: 'privacy_policy',
    title: 'Privacy Policy',
    description: 'I acknowledge and agree to the Privacy Policy',
    required: true,
    type: 'privacy',
    icon: Shield,
  },
  {
    id: 'data_processing',
    title: 'Data Processing',
    description: 'I consent to the processing of my personal data for service provision',
    required: true,
    type: 'privacy',
    icon: Database,
  },
  {
    id: 'marketing_communications',
    title: 'Marketing Communications',
    description: 'I agree to receive marketing emails and product updates (optional)',
    required: false,
    type: 'marketing',
    icon: Users,
  },
  {
    id: 'analytics_tracking',
    title: 'Analytics & Performance',
    description: 'I consent to analytics tracking to improve the service (optional)',
    required: false,
    type: 'analytics',
    icon: Lock,
  },
]

export function TermsAcceptance({ userId, onAcceptance, required = false }: TermsAcceptanceProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [consents, setConsents] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [hasAccepted, setHasAccepted] = useState(false)
  const { toast } = useToast()
  
  // TODO: Use for consent management
  // const supabase = createClient()

  useEffect(() => {
    if (required && !hasAccepted) {
      setIsOpen(true)
    }
  }, [required, hasAccepted])

  const checkExistingConsents = useCallback(async () => {
    if (!userId) return

    try {
      // TODO: Implement user_consents table when needed
      // For now, just return empty data
      const data: Array<{ consent_type: string; granted: boolean }> = []
      const error = null

      if (error) throw error

      // Get the latest consent for each type
      const latestConsents: Record<string, boolean> = {}
      data?.forEach(consent => {
        if (!latestConsents[consent.consent_type]) {
          latestConsents[consent.consent_type] = consent.granted
        }
      })

      setConsents(latestConsents)
      
      // Check if all required consents are granted
      const requiredConsents = consentItems.filter(item => item.required)
      const allRequiredAccepted = requiredConsents.every(item => latestConsents[item.id])
      setHasAccepted(allRequiredAccepted)

    } catch (error) {
      console.error('Failed to check existing consents:', error)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      checkExistingConsents()
    }
  }, [userId, checkExistingConsents])

  const handleConsentChange = (consentId: string, granted: boolean) => {
    setConsents(prev => ({
      ...prev,
      [consentId]: granted
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      // Check if all required consents are granted
      const requiredConsents = consentItems.filter(item => item.required)
      const allRequiredAccepted = requiredConsents.every(item => consents[item.id])

      if (!allRequiredAccepted) {
        toast({
          title: 'Required Consents Missing',
          description: 'Please accept all required terms to continue.',
          variant: 'destructive',
        })
        return
      }

      // Record all consents
      if (userId) {
        // TODO: Store consent records in database
        // const consentRecords = Object.entries(consents).map(([consentType, granted]) => ({
        //   // Prepare consent record structure
        //   user_id: userId,
        //   consent_type: consentType,
        //   granted,
        //   recorded_at: new Date().toISOString(),
        //   metadata: {
        //     version: '1.0',
        //     ip_address: 'client', // In production, get from server
        //     user_agent: navigator.userAgent,
        //   },
        // }))

        // TODO: Implement user_consents table when needed
        // For now, just simulate success
        const error = null

        if (error) throw error
      }

      setHasAccepted(allRequiredAccepted)
      setIsOpen(false)
      onAcceptance?.(allRequiredAccepted)

      toast({
        title: 'Preferences Updated',
        description: 'Your consent preferences have been saved.',
      })

    } catch (error) {
      console.error('Failed to record consents:', error)
      toast({
        title: 'Error',
        description: 'Failed to save consent preferences. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const canProceed = consentItems
    .filter(item => item.required)
    .every(item => consents[item.id])

  return (
    <>
      {!required && (
        <Button 
          variant="outline" 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2"
        >
          <Shield className="h-4 w-4" />
          Privacy Settings
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={required ? undefined : setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Terms Agreement
            </DialogTitle>
            <DialogDescription>
              Please review and accept our terms and privacy policies. You can update these preferences at any time.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {consentItems.map((item) => {
                const Icon = item.icon
                const isChecked = consents[item.id] || false

                return (
                  <Card key={item.id} className={`${item.required ? 'border-orange-200' : 'border-gray-200'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={item.id}
                          checked={isChecked}
                          onChange={(e) => 
                            handleConsentChange(item.id, e.target.checked)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {item.title}
                            {item.required && (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Required
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {item.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Expandable content for terms details */}
                    {item.type === 'terms' && (
                      <CardContent className="pt-0">
                        <details className="text-sm text-gray-600">
                          <summary className="cursor-pointer hover:text-gray-800 mb-2">
                            View Terms Summary
                          </summary>
                          <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                            <p>• You must be 13 years or older to use this service</p>
                            <p>• Account sharing is not permitted</p>
                            <p>• Content uploaded must not violate copyright</p>
                            <p>• Service availability is not guaranteed</p>
                            <p>• Terms may be updated with notice</p>
                          </div>
                        </details>
                      </CardContent>
                    )}

                    {item.type === 'privacy' && item.id === 'privacy_policy' && (
                      <CardContent className="pt-0">
                        <details className="text-sm text-gray-600">
                          <summary className="cursor-pointer hover:text-gray-800 mb-2">
                            View Privacy Summary
                          </summary>
                          <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                            <p>• We collect reading activity and performance data</p>
                            <p>• Data is used to provide and improve our service</p>
                            <p>• No data is sold to third parties</p>
                            <p>• You can request data deletion at any time</p>
                            <p>• Data is stored securely with encryption</p>
                          </div>
                        </details>
                      </CardContent>
                    )}
                  </Card>
                )
              })}

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-blue-900">Your Rights</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        You have the right to access, rectify, or delete your personal data. 
                        You can also object to processing or request data portability. 
                        Contact us at privacy@readspeed.app for data requests.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Last updated: December 2024
            </div>
            <div className="flex gap-2">
              {!required && (
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleSubmit}
                disabled={!canProceed || loading}
                className="min-w-[120px]"
              >
                {loading ? 'Saving...' : (required ? 'Accept & Continue' : 'Save Preferences')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Hook for checking terms acceptance status
export function useTermsAcceptance(userId?: string) {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  // TODO: Use for checking acceptance status
  // const supabase = createClient()

  useEffect(() => {
    if (userId) {
      checkTermsAcceptance()
    } else {
      setLoading(false)
    }
  }, [userId])

  const checkTermsAcceptance = async () => {
    try {
      // TODO: Implement user_consents table when needed
      // For now, return default not accepted
      const data: Array<{ consent_type: string; granted: boolean }> = []
      const error = null

      if (error) throw error

      // Check if all required consents are granted
      const requiredTypes = ['terms_of_service', 'privacy_policy', 'data_processing']
      const latestConsents: Record<string, boolean> = {}
      
      data?.forEach(consent => {
        if (!latestConsents[consent.consent_type]) {
          latestConsents[consent.consent_type] = consent.granted
        }
      })

      const allAccepted = requiredTypes.every(type => latestConsents[type])
      setHasAccepted(allAccepted)

    } catch (error) {
      console.error('Failed to check terms acceptance:', error)
      setHasAccepted(false)
    } finally {
      setLoading(false)
    }
  }

  return { hasAccepted, loading, refresh: checkTermsAcceptance }
}