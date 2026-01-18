'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText } from 'lucide-react'

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
      <div className="min-h-screen flex flex-col bg-[var(--gray-50)]">
        <header className="h-16 flex items-center px-6 border-b border-[var(--gray-200)] bg-white">
          <Link href="/" className="flex items-center space-x-2">
            <FileText className="h-7 w-7 text-[var(--primary-900)]" />
            <span className="text-lg font-bold text-[var(--gray-900)]">REI Sign</span>
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gray-50)]">
      <header className="h-16 flex items-center px-6 border-b border-[var(--gray-200)] bg-white">
        <Link href="/" className="flex items-center space-x-2">
          <FileText className="h-7 w-7 text-[var(--primary-900)]" />
          <span className="text-lg font-bold text-[var(--gray-900)]">REI Sign</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white border border-[var(--gray-200)] rounded p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[var(--gray-900)]">Set up your company</h1>
              <p className="text-sm text-[var(--gray-600)] mt-1">
                Create your company to start managing contracts
              </p>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              {error && (
                <div className="p-3 bg-[var(--error-100)] border border-[var(--error-700)] rounded text-sm text-[var(--error-700)]">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium text-[var(--gray-700)]">
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Wholesaling LLC"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="border-[var(--gray-300)] rounded"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Company'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
