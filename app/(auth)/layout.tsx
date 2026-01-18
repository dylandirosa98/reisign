import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--gray-50)]">
      {/* Simple header with logo */}
      <header className="h-16 flex items-center px-6 border-b border-[var(--gray-200)] bg-white">
        <Link href="/" className="flex items-center space-x-2">
          <FileText className="h-7 w-7 text-[var(--primary-900)]" />
          <span className="text-lg font-bold text-[var(--gray-900)]">REI Sign</span>
        </Link>
      </header>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Simple footer */}
      <footer className="py-4 text-center text-sm text-[var(--gray-500)] border-t border-[var(--gray-200)]">
        REI Sign - Contract Management for Real Estate Wholesalers
      </footer>
    </div>
  )
}
