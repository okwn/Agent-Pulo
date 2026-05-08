'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { StatusBadge, VerdictBadge, PlanBadge } from '@/components/ui/badge';
import { UsageLimitMeter, TrendCard } from '@/components/ui/meters';
import { AlertCard } from '@/components/features/alert-card';
import { TruthReportCard } from '@/components/features/truth-report-card';
import { Button } from '@/components/ui/button';
import { mockDashboardData } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/utils';
import { ArrowRight, Bell, TrendingUp, Shield, FileText, Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const data = mockDashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Welcome back</h1>
          <p className="text-[--color-pulo-muted] mt-1">Here&apos;s what&apos;s happening with your PULO agent.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary">
            <Plus className="w-4 h-4" />
            New Draft
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-[--color-pulo-muted]">PULO Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <StatusBadge status={data.status} size="md" />
            <span className="text-xs text-[--color-pulo-muted]">
              Checked {formatRelativeTime(data.lastCheck)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-[--color-pulo-muted]">Your Plan</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <PlanBadge plan={data.user.plan} size="md" />
            {data.user.plan === 'free' && (
              <Link href="/dashboard/billing">
                <Button size="sm" variant="ghost">Upgrade</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-[--color-pulo-muted]">Daily Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageLimitMeter
              used={data.usage.castsUsed}
              limit={data.usage.castsLimit}
              label=""
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-[--color-pulo-muted]">Pending Drafts</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <span className="text-2xl font-bold text-[--color-pulo-accent]">{data.pendingDrafts}</span>
            <Link href="/dashboard/composer">
              <Button size="sm" variant="ghost">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Trends */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[--color-pulo-accent]" />
                <CardTitle>Active Trends</CardTitle>
              </div>
              <Link href="/dashboard/radar">
                <Button size="sm" variant="ghost">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.activeTrends.map((trend) => (
                <TrendCard key={trend.id} trend={trend} onClick={() => {}} />
              ))}
            </CardContent>
          </Card>

          {/* Recent Truth Checks */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[--color-pulo-accent]" />
                <CardTitle>Recent Truth Checks</CardTitle>
              </div>
              <Link href="/dashboard/truth">
                <Button size="sm" variant="ghost">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.recentTruthChecks.map((check) => (
                <TruthReportCard key={check.id} truthCheck={check} compact />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[--color-pulo-accent]" />
                <CardTitle>Recent Alerts</CardTitle>
              </div>
              <Link href="/dashboard/alerts">
                <Button size="sm" variant="ghost">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} compact />
              ))}
            </CardContent>
          </Card>

          {/* Safety Notices */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[--color-pulo-warning]" />
                <CardTitle>Safety Notices</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <span className="text-3xl font-bold text-[--color-pulo-text]">{data.safetyNotices}</span>
                <p className="text-sm text-[--color-pulo-muted] mt-1">Active flags</p>
              </div>
            </CardContent>
            <CardFooter className="justify-center">
              <Link href="/admin/safety">
                <Button size="sm" variant="ghost">Review</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
