'use client'

import Link from 'next/link'
import { FileText, PenTool } from 'lucide-react'

interface ContractTabsProps {
  activeTab: string
  unsignedCount: number
}

export function ContractTabs({ activeTab, unsignedCount }: ContractTabsProps) {
  return (
    <div className="border-b border-[var(--gray-200)]">
      <nav className="flex gap-4" aria-label="Tabs">
        <Link
          href="/dashboard/contracts"
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-[var(--primary-600)] text-[var(--primary-600)]'
              : 'border-transparent text-[var(--gray-600)] hover:text-[var(--gray-900)] hover:border-[var(--gray-300)]'
          }`}
        >
          <FileText className="w-4 h-4" />
          All Contracts
        </Link>
        <Link
          href="/dashboard/contracts?tab=unsigned"
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'unsigned'
              ? 'border-[var(--primary-600)] text-[var(--primary-600)]'
              : 'border-transparent text-[var(--gray-600)] hover:text-[var(--gray-900)] hover:border-[var(--gray-300)]'
          }`}
        >
          <PenTool className="w-4 h-4" />
          Pending Signature
          {unsignedCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-[var(--warning-100)] text-[var(--warning-700)] rounded-full">
              {unsignedCount}
            </span>
          )}
        </Link>
      </nav>
    </div>
  )
}
