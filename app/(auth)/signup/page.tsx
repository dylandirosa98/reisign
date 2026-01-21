'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (!companyName.trim()) {
      setError('Company name is required')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
        },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Show success message
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="bg-white border border-[var(--gray-200)] rounded p-8">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)] mb-2">Check your email</h1>
          <p className="text-[var(--gray-600)] mb-4">
            We sent a confirmation link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-[var(--gray-500)] mb-6">
            Click the link in the email to confirm your account, then log in to set up your company.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--gray-500)]">
            <Mail className="w-4 h-4" />
            <span>Didn&apos;t receive it? Check your spam folder</span>
          </div>
          <div className="mt-6">
            <Link href="/login" className="text-[var(--primary-700)] hover:underline font-medium">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--gray-200)] rounded p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Create an account</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">
          Get started with REI Sign
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className="p-3 bg-[var(--error-100)] border border-[var(--error-700)] rounded text-sm text-[var(--error-700)]">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium text-[var(--gray-700)]">
            Full Name
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="border-[var(--gray-300)] rounded"
          />
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-[var(--gray-700)]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border-[var(--gray-300)] rounded"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-[var(--gray-700)]">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="border-[var(--gray-300)] rounded"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="text-sm text-[var(--gray-600)] text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--primary-700)] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
