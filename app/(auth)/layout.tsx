import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--gray-50)]">
      {/* Simple header with logo */}
      <header className="h-16 flex items-center px-6 border-b border-[var(--gray-200)] bg-white">
        <Link href="/" className="flex items-center">
          <Image
            src="https://ik.imagekit.io/de9yylqdb/Untitled%20design%20(3).jpg"
            alt="REI Sign"
            width={140}
            height={40}
            className="h-10 w-auto"
            priority
          />
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
        Contract Management for Real Estate Wholesalers
      </footer>
    </div>
  )
}
