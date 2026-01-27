'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  FileText,
  Building2,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  Shield,
  BarChart3,
  Activity,
} from 'lucide-react'
import type { User, Company } from '@/types/database'

interface TopNavProps {
  user: User & { company: Company | null }
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contracts', href: '/dashboard/contracts', icon: FileText },
  { name: 'Properties', href: '/dashboard/properties', icon: Building2 },
  { name: 'Templates', href: '/dashboard/templates', icon: FileText },
  { name: 'Team', href: '/dashboard/team', icon: Users },
]

const adminNavigation = [
  { name: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
  { name: 'Activity', href: '/dashboard/admin/activity', icon: Activity },
  { name: 'Accounts', href: '/dashboard/admin/accounts', icon: Users },
  { name: 'Templates', href: '/dashboard/admin/templates', icon: Shield },
]

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <header className="h-16 bg-white border-b border-[var(--gray-200)] flex items-center px-6">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center mr-8">
        <Image
          src="https://ik.imagekit.io/de9yylqdb/Untitled%20design%20(3).jpg"
          alt="REI Sign"
          width={140}
          height={40}
          className="h-10 w-auto"
          priority
        />
      </Link>

      {/* Navigation Links */}
      <nav className="flex items-center space-x-1 flex-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors relative',
                isActive
                  ? 'text-[var(--primary-900)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--gray-900)]'
              )}
            >
              {item.name}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-900)]" />
              )}
            </Link>
          )
        })}

        {/* Admin Navigation - only show for system admins */}
        {(user.is_system_admin || user.role === 'admin') && (
          <>
            <span className="mx-2 text-[var(--gray-300)]">|</span>
            {adminNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-colors relative flex items-center gap-1',
                    isActive
                      ? 'text-[var(--primary-900)]'
                      : 'text-[var(--gray-600)] hover:text-[var(--gray-900)]'
                  )}
                >
                  <Shield className="h-4 w-4" />
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-900)]" />
                  )}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Right side - Settings & User Menu */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/settings"
          className={cn(
            'px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith('/dashboard/settings')
              ? 'text-[var(--primary-900)]'
              : 'text-[var(--gray-600)] hover:text-[var(--gray-900)]'
          )}
        >
          <Settings className="h-5 w-5" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center space-x-2 h-9 px-2 hover:bg-[var(--gray-100)]"
            >
              <div className="w-8 h-8 rounded bg-[var(--primary-900)] text-white flex items-center justify-center text-sm font-medium">
                {initials}
              </div>
              <ChevronDown className="h-4 w-4 text-[var(--gray-500)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-[var(--gray-900)]">
                  {user.full_name || 'User'}
                </p>
                <p className="text-xs text-[var(--gray-500)]">{user.email}</p>
                {user.company && (
                  <p className="text-xs text-[var(--gray-500)]">{user.company.name}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/dashboard/settings')}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-[var(--error-700)]">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
