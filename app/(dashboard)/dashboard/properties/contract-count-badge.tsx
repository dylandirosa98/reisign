'use client'

import { useState, useRef, useEffect } from 'react'
import { FileText } from 'lucide-react'

interface ContractInfo {
  id: string
  status: string | null
  templateName: string | null
}

interface ContractCountBadgeProps {
  total: number
  contracts: ContractInfo[]
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-[var(--gray-100)] text-[var(--gray-700)]' },
  sent: { label: 'Sent', color: 'bg-[var(--info-100)] text-[var(--info-700)]' },
  viewed: { label: 'Viewed', color: 'bg-[var(--warning-100)] text-[var(--warning-700)]' },
  completed: { label: 'Completed', color: 'bg-[var(--success-100)] text-[var(--success-700)]' },
  cancelled: { label: 'Cancelled', color: 'bg-[var(--error-100)] text-[var(--error-700)]' },
  seller_signed: { label: 'Seller Signed', color: 'bg-[var(--info-100)] text-[var(--info-700)]' },
  buyer_pending: { label: 'Buyer Pending', color: 'bg-[var(--warning-100)] text-[var(--warning-700)]' },
}

export function ContractCountBadge({ total, contracts }: ContractCountBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (total === 0) {
    return (
      <span className="text-sm text-[var(--gray-400)]">-</span>
    )
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--primary-50)] text-[var(--primary-700)] text-sm font-medium hover:bg-[var(--primary-100)] transition-colors"
      >
        <FileText className="h-3.5 w-3.5" />
        {total}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-1 left-0 bg-white border border-[var(--gray-200)] rounded-lg shadow-lg p-3 min-w-[250px]"
        >
          <div className="text-xs font-medium text-[var(--gray-500)] uppercase tracking-wide mb-2">
            Documents
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {contracts.map((contract) => {
              const status = contract.status || 'draft'
              const config = statusConfig[status] || statusConfig.draft
              const templateName = contract.templateName || 'Untitled Template'

              return (
                <div key={contract.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[var(--gray-900)] truncate flex-1" title={templateName}>
                    {templateName}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
