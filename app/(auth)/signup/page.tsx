'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Redirect to onboarding to create company
    router.push('/onboarding')
    router.refresh()
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
