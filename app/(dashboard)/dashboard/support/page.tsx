'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LifeBuoy, CheckCircle2, Loader2 } from 'lucide-react'

interface Ticket {
  id: string
  subject: string
  category: string
  status: string
  created_at: string
}

export default function SupportPage() {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/support')
      const data = await res.json()
      if (data.tickets) {
        setTickets(data.tickets)
      }
    } catch {
      console.error('Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, category }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to submit ticket')
        return
      }

      setSubmitted(true)
      setSubject('')
      setCategory('general')
      setMessage('')
      fetchTickets()

      setTimeout(() => setSubmitted(false), 5000)
    } catch {
      setError('Failed to submit ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const categoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      general: 'General',
      bug: 'Bug',
      billing: 'Billing',
      feature: 'Feature Request',
    }
    return labels[cat] || cat
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Support</h1>
        <p className="text-sm text-[var(--gray-500)] mt-1">
          Submit a support ticket and we&apos;ll get back to you.
        </p>
      </div>

      {/* Ticket Form */}
      <div className="bg-white rounded-lg border border-[var(--gray-200)] p-6">
        <div className="flex items-center gap-2 mb-6">
          <LifeBuoy className="h-5 w-5 text-[var(--primary-900)]" />
          <h2 className="text-lg font-semibold text-[var(--gray-900)]">New Ticket</h2>
        </div>

        {submitted && (
          <div className="mb-6 flex items-center gap-2 rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Ticket submitted successfully. We&apos;ll get back to you soon.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Describe your issue in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Ticket'
            )}
          </Button>
        </form>
      </div>

      {/* Ticket List */}
      <div className="bg-white rounded-lg border border-[var(--gray-200)] p-6">
        <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-4">Your Tickets</h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--gray-400)]" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-[var(--gray-500)] py-8 text-center">
            No tickets submitted yet.
          </p>
        ) : (
          <div className="divide-y divide-[var(--gray-200)]">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--gray-900)] truncate">
                      {ticket.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabel(ticket.category)}
                      </Badge>
                      <span className="text-xs text-[var(--gray-500)]">
                        {formatDate(ticket.created_at)}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      ticket.status === 'open'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-green-200 bg-green-50 text-green-700'
                    }
                  >
                    {ticket.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
