'use client'

import { useState } from 'react'
import { AlertTriangle, CreditCard, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PaymentPastDueBanner() {
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const handleUpdatePayment = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Unable to open billing portal. Please try again.')
      }
    } catch {
      alert('Unable to open billing portal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (dismissed) {
    return null
  }

  return (
    <div className="bg-red-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Payment Past Due</p>
              <p className="text-sm text-red-100">
                Your payment has failed. Contract sending is disabled until payment is resolved.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleUpdatePayment}
              disabled={loading}
              size="sm"
              className="bg-white text-red-600 hover:bg-red-50 font-medium"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Update Payment Method
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-red-700 rounded"
              title="Dismiss (will reappear on page reload)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
