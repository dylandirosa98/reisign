'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="bg-white border border-[var(--gray-200)] rounded p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Sign in</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">
          Enter your credentials to access your account
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="p-3 bg-[var(--error-100)] border border-[var(--error-700)] rounded text-sm text-[var(--error-700)]">
            {error}
          </div>
        )}

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
            className="border-[var(--gray-300)] rounded focus:ring-2 focus:ring-[var(--primary-700)] focus:border-[var(--primary-700)]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-[var(--gray-700)]">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border-[var(--gray-300)] rounded focus:ring-2 focus:ring-[var(--primary-700)] focus:border-[var(--primary-700)]"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="text-sm text-[var(--gray-600)] text-center">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[var(--primary-700)] hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  )
}
