'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingUser, setCheckingUser] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Check if user already has a company
      const { data: userDataRaw } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const userData = userDataRaw as { company_id: string | null } | null

      if (userData?.company_id) {
        router.push('/dashboard')
        return
      }

      setCheckingUser(false)
    }

    checkUser()
  }, [router, supabase])

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    // Create company
    const { data: companyRaw, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName })
      .select()
      .single()

    if (companyError) {
      setError(companyError.message)
      setLoading(false)
      return
    }

    const company = companyRaw as { id: string } | null

    if (!company) {
      setError('Failed to create company')
      setLoading(false)
      return
    }

    // Update user with company_id and set as manager
    const { error: userError } = await supabase
      .from('users')
      .update({
        company_id: company.id,
        role: 'manager'
      })
      .eq('id', user.id)

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (checkingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Set up your company</CardTitle>
            <CardDescription>
              Create your company to start managing contracts
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateCompany}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Wholesaling LLC"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create Company'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
