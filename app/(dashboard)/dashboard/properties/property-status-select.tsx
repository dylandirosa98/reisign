'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PropertyStatus = 'none' | 'in_escrow' | 'terminated' | 'pending' | 'closed'

interface PropertyStatusSelectProps {
  propertyId: string
  currentStatus: PropertyStatus
}

const statusConfig: Record<PropertyStatus, { label: string; color: string }> = {
  none: { label: 'None', color: 'bg-[var(--gray-100)] text-[var(--gray-700)]' },
  pending: { label: 'Pending', color: 'bg-[var(--warning-100)] text-[var(--warning-700)]' },
  in_escrow: { label: 'In Escrow', color: 'bg-[var(--info-100)] text-[var(--info-700)]' },
  closed: { label: 'Closed', color: 'bg-[var(--success-100)] text-[var(--success-700)]' },
  terminated: { label: 'Terminated', color: 'bg-[var(--error-100)] text-[var(--error-700)]' },
}

export function PropertyStatusSelect({ propertyId, currentStatus }: PropertyStatusSelectProps) {
  const [status, setStatus] = useState<PropertyStatus>(currentStatus)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const handleChange = async (newStatus: PropertyStatus) => {
    if (newStatus === status) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/properties/${propertyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setStatus(newStatus)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const config = statusConfig[status]

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value as PropertyStatus)}
      disabled={isUpdating}
      className={`text-xs px-2 py-1 rounded border-0 cursor-pointer ${config.color} ${isUpdating ? 'opacity-50' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {Object.entries(statusConfig).map(([value, { label }]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
}
