'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle, RefreshCw, AlertCircle, Building2, Loader2, Eye, EyeOff } from 'lucide-react'

interface InviteData {
  email: string
  company_name: string
  role: string
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' }
  if (score <= 4) return { score, label: 'Strong', color: 'bg-green-500' }
  return { score, label: 'Very Strong', color: 'bg-green-600' }
}

function SignupLoading() {
  return (
    <div className="bg-white border border-[var(--gray-200)] rounded p-8">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-600)] mx-auto mb-4" />
        <p className="text-[var(--gray-600)]">Loading...</p>
      </div>
    </div>
  )
}

function SignupForm() {
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Invite state
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(!!inviteToken)

  const supabase = createClient()

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  // Load invite data if token present
  useEffect(() => {
    async function loadInvite() {
      if (!inviteToken) return

      try {
        // First check if user is already authenticated (coming from Supabase's invite email flow)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // User is already authenticated - accept the invite and redirect
          const acceptResponse = await fetch('/api/team/invite/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: inviteToken }),
          })

          if (acceptResponse.ok) {
            // Redirect to dashboard
            window.location.href = '/dashboard'
            return
          } else {
            const acceptData = await acceptResponse.json()
            // If invite already accepted or other error, just go to dashboard
            if (acceptData.error === 'This invite has already been used') {
              window.location.href = '/dashboard'
              return
            }
            setError(acceptData.error || 'Failed to accept invite')
            setLoadingInvite(false)
            return
          }
        }

        // User not authenticated - show signup form
        const response = await fetch(`/api/team/invite/verify?token=${inviteToken}`)
        if (response.ok) {
          const data = await response.json()
          setInviteData(data)
          setEmail(data.email)
        } else {
          setError('This invite link is invalid or has expired.')
        }
      } catch {
        setError('Failed to load invite details.')
      } finally {
        setLoadingInvite(false)
      }
    }

    loadInvite()
  }, [inviteToken, supabase.auth])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Only require company name if not an invite
    if (!inviteToken && !companyName.trim()) {
      setError('Company name is required')
      setLoading(false)
      return
    }

    // For invited users, set their password and sign them in directly
    if (inviteToken && inviteData) {
      // First, set the user's password via admin API
      const setupResponse = await fetch('/api/team/invite/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken, password }),
      })

      if (!setupResponse.ok) {
        const setupData = await setupResponse.json()
        setError(setupData.error || 'Failed to set up your account')
        setLoading(false)
        return
      }

      // Now sign them in with the password they just set
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      // Accept the invite (also updates the user's name)
      const acceptResponse = await fetch('/api/team/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken, full_name: fullName }),
      })

      if (!acceptResponse.ok) {
        const acceptData = await acceptResponse.json()
        // If already accepted, that's fine - just redirect
        if (acceptData.error !== 'This invite has already been used') {
          setError(acceptData.error || 'Failed to accept invite')
          setLoading(false)
          return
        }
      }

      // Redirect to dashboard
      window.location.href = '/dashboard'
      return
    }

    // Check if email already exists
    try {
      const checkResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const { exists } = await checkResponse.json()

      if (exists) {
        setError('An account with this email already exists. Please sign in instead.')
        setLoading(false)
        return
      }
    } catch (err) {
      console.error('Error checking email:', err)
      // Continue with signup if check fails
    }

    // Regular signup (non-invite)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if user was actually created (Supabase returns null user for existing emails)
    if (!data?.user?.identities?.length) {
      setError('An account with this email already exists. Please sign in instead.')
      setLoading(false)
      return
    }

    // Show success message
    setSuccess(true)
  }

  const handleResendEmail = async () => {
    setResending(true)
    setResendSuccess(false)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) {
        setError(error.message)
      } else {
        setResendSuccess(true)
        setTimeout(() => setResendSuccess(false), 5000)
      }
    } catch {
      setError('Failed to resend verification email')
    } finally {
      setResending(false)
    }
  }

  if (loadingInvite) {
    return (
      <div className="bg-white border border-[var(--gray-200)] rounded p-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--gray-600)]">Loading invite...</p>
        </div>
      </div>
    )
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
            Click the link in the email to confirm your account and get started.
          </p>

          {/* Resend button */}
          <div className="border-t border-[var(--gray-200)] pt-4 mt-4">
            <p className="text-sm text-[var(--gray-500)] mb-3">
              Didn&apos;t receive it? Check your spam folder or
            </p>
            <Button
              onClick={handleResendEmail}
              disabled={resending}
              variant="outline"
              className="gap-2"
            >
              {resending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Resend verification email
                </>
              )}
            </Button>
            {resendSuccess && (
              <p className="text-sm text-green-600 mt-2">Email sent! Check your inbox.</p>
            )}
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
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">
          {inviteData ? 'Accept Invitation' : 'Create an account'}
        </h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">
          {inviteData
            ? `You've been invited to join ${inviteData.company_name}`
            : 'Get started with REI Sign'}
        </p>
      </div>

      {/* Invite info banner */}
      {inviteData && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Joining {inviteData.company_name}</p>
              <p className="text-sm text-blue-700">
                You&apos;ll be added as a {inviteData.role === 'manager' ? 'Manager' : 'Team Member'}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className="p-3 bg-[var(--error-100)] border border-[var(--error-700)] rounded text-sm text-[var(--error-700)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
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

        {/* Only show company name field if not an invite */}
        {!inviteData && (
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
            disabled={!!inviteData}
            className="border-[var(--gray-300)] rounded disabled:bg-gray-100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-[var(--gray-700)]">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="border-[var(--gray-300)] rounded pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-600)]"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password strength indicator */}
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      level <= passwordStrength.score
                        ? passwordStrength.color
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs ${
                passwordStrength.score <= 1 ? 'text-red-600' :
                passwordStrength.score <= 2 ? 'text-orange-600' :
                passwordStrength.score <= 3 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {passwordStrength.label}
                {passwordStrength.score < 3 && ' - Try adding uppercase, numbers, or symbols'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-[var(--gray-700)]">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className={`border-[var(--gray-300)] rounded pr-10 ${
                confirmPassword.length > 0 && password !== confirmPassword
                  ? 'border-red-500 focus-visible:ring-red-500'
                  : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-600)]"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-xs text-red-600">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded"
          disabled={loading}
        >
          {loading ? 'Creating account...' : inviteData ? 'Accept & Create Account' : 'Create account'}
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

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupForm />
    </Suspense>
  )
}
