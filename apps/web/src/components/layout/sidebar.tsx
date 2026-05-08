'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  PenSquare,
  Radar,
  Shield,
  Bell,
  Settings,
  CreditCard,
  Users,
  Activity,
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckCircle,
  FileText,
  Database,
  AlertTriangle,
  Wrench,
  Server,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isAdmin?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const dashboardNav: NavSection[] = [
  {
    items: [
      { label: 'Home', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Inbox', href: '/dashboard/inbox', icon: <Inbox className="w-5 h-5" /> },
      { label: 'Composer', href: '/dashboard/composer', icon: <PenSquare className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { label: 'Radar', href: '/dashboard/radar', icon: <Radar className="w-5 h-5" /> },
      { label: 'Truth', href: '/dashboard/truth', icon: <Shield className="w-5 h-5" /> },
      { label: 'Alerts', href: '/dashboard/alerts', icon: <Bell className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'General', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
      { label: 'Voice', href: '/dashboard/settings/voice', icon: <Zap className="w-5 h-5" /> },
      { label: 'Alerts', href: '/dashboard/settings/alerts', icon: <Bell className="w-5 h-5" /> },
      { label: 'Billing', href: '/dashboard/billing', icon: <CreditCard className="w-5 h-5" /> },
    ],
  },
];

const adminNav: NavSection[] = [
  {
    title: 'Admin',
    items: [
      { label: 'Overview', href: '/admin', icon: <Activity className="w-5 h-5" /> },
      { label: 'Events', href: '/admin/events', icon: <Zap className="w-5 h-5" /> },
      { label: 'Runs', href: '/admin/runs', icon: <CheckCircle className="w-5 h-5" /> },
      { label: 'Radar', href: '/admin/radar', icon: <Radar className="w-5 h-5" /> },
      { label: 'Truth Checks', href: '/admin/truth-checks', icon: <Shield className="w-5 h-5" /> },
      { label: 'Alerts', href: '/admin/alerts', icon: <Bell className="w-5 h-5" /> },
      { label: 'Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
      { label: 'Safety', href: '/admin/safety', icon: <AlertTriangle className="w-5 h-5" /> },
      { label: 'Tech Debt', href: '/admin/technical-debt', icon: <Wrench className="w-5 h-5" /> },
      { label: 'System', href: '/admin/system', icon: <Server className="w-5 h-5" /> },
    ],
  },
];

export function Sidebar({ collapsed, onToggle, isAdmin = false }: SidebarProps) {
  const pathname = usePathname();

  const renderNavSection = (section: NavSection) => (
    <div className="mb-6">
      {section.title && !collapsed && (
        <div className="px-3 mb-2 text-xs font-medium text-[--color-pulo-muted] uppercase tracking-wider">
          {section.title}
        </div>
      )}
      <nav className="space-y-1">
        {section.items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative',
                'hover:bg-[--color-pulo-surface]',
                isActive && 'bg-[--color-pulo-accent-muted] text-[--color-pulo-accent]',
                isActive && 'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-[--color-pulo-accent] before:rounded-r'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className={cn(isActive ? 'text-[--color-pulo-accent]' : 'text-[--color-pulo-muted]')}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className={cn('text-sm font-medium', isActive ? 'text-[--color-pulo-accent]' : 'text-[--color-pulo-text]')}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-[--color-pulo-surface] border-r border-[--color-pulo-border]',
        'flex flex-col transition-all duration-200 z-40',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[--color-pulo-border]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[--color-pulo-accent] flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-white text-sm">P</span>
          </div>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-[--color-pulo-text]">PULO</span>
              <span className="text-[10px] bg-[--color-pulo-bg] border border-[--color-pulo-border] rounded px-1.5 py-0.5 text-[--color-pulo-muted] font-medium">
                BETA
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        {dashboardNav.map(renderNavSection)}
        {isAdmin && adminNav.map(renderNavSection)}
      </div>

      {/* Toggle button */}
      <div className="p-3 border-t border-[--color-pulo-border]">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-[--color-pulo-border] transition-colors text-[--color-pulo-muted]"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
