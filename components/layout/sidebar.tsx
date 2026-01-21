'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Building2,
  Settings,
  Users,
  CreditCard,
  Shield,
  FileCode2,
} from 'lucide-react'
import type { User, Company } from '@/types/database'

interface SidebarProps {
  user: User & { company: Company | null }
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contracts', href: '/dashboard/contracts', icon: FileText },
  { name: 'Templates', href: '/dashboard/templates', icon: FileCode2 },
  { name: 'Properties', href: '/dashboard/properties', icon: Building2 },
  { name: 'Team', href: '/dashboard/team', icon: Users },
]

const settingsNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard },
]

const adminNavigation = [
  { name: 'Manage Accounts', href: '/dashboard/admin/accounts', icon: Shield },
  { name: 'Admin Templates', href: '/dashboard/admin/templates', icon: FileCode2 },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const isSystemAdmin = user.is_system_admin || user.role === 'admin'

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <FileText className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">REI Sign</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}

        {/* Settings Section */}
        <div className="pt-4 mt-4 border-t border-gray-100">
          <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Settings
          </div>
          {settingsNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* Admin Section - Only for system admins */}
        {isSystemAdmin && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <div className="px-3 mb-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Admin
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-gray-600 hover:bg-amber-50'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          {user.company?.name}
        </div>
        <div className="text-xs text-gray-400 capitalize">
          {user.company?.actual_plan || user.company?.plan || 'free'} plan
        </div>
      </div>
    </div>
  )
}
