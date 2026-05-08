'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockAdminData } from '@/lib/mock-data';
import { Activity, Server, Database, AlertTriangle, CheckCircle, Zap, Users, Wrench } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const data = mockAdminData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--color-pulo-text]">Admin Overview</h1>
        <p className="text-[--color-pulo-muted] mt-1">System health and monitoring</p>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Worker Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[--color-pulo-accent]" />
              <CardTitle className="text-sm">Workers</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.workerHealth.map((worker) => (
              <div key={worker.id} className="flex items-center justify-between text-sm">
                <span className="text-[--color-pulo-muted]">{worker.id}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[--color-pulo-muted]">{worker.latency}ms</span>
                  <StatusBadge status={worker.status} size="sm" showLabel={false} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* API Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[--color-pulo-accent]" />
              <CardTitle className="text-sm">API Endpoints</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.apiHealth.map((api) => (
              <div key={api.endpoint} className="flex items-center justify-between text-sm">
                <span className="text-[--color-pulo-muted] truncate">{api.endpoint}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[--color-pulo-muted]">{api.latency}ms</span>
                  <StatusBadge status={api.status} size="sm" showLabel={false} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* DB Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[--color-pulo-accent]" />
              <CardTitle className="text-sm">Database</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--color-pulo-muted]">Status</span>
              <StatusBadge status={data.dbHealth.status} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--color-pulo-muted]">Connections</span>
              <span className="text-[--color-pulo-text]">{data.dbHealth.connections}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--color-pulo-muted]">Latency</span>
              <span className="text-[--color-pulo-text]">{data.dbHealth.latency}ms</span>
            </div>
          </CardContent>
        </Card>

        {/* Redis Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[--color-pulo-accent]" />
              <CardTitle className="text-sm">Redis</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--color-pulo-muted]">Status</span>
              <StatusBadge status={data.redisHealth.status} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--color-pulo-muted]">Memory</span>
              <span className="text-[--color-pulo-text]">{data.redisHealth.memory}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--color-pulo-muted]">Connections</span>
              <span className="text-[--color-pulo-text]">{data.redisHealth.connections}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[--color-pulo-accent]">{data.pendingTrendApprovals}</div>
            <div className="text-xs text-[--color-pulo-muted] mt-1">Pending Trends</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[--color-pulo-danger]">{data.safetyFlags}</div>
            <div className="text-xs text-[--color-pulo-muted] mt-1">Safety Flags</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[--color-pulo-warning]">{data.failedAgentRuns.length}</div>
            <div className="text-xs text-[--color-pulo-muted] mt-1">Failed Runs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[--color-pulo-text]">{data.technicalDebtCount}</div>
            <div className="text-xs text-[--color-pulo-muted] mt-1">Tech Debt Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[--color-pulo-text]">5</div>
            <div className="text-xs text-[--color-pulo-muted] mt-1">Active Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[--color-pulo-text]">10</div>
            <div className="text-xs text-[--color-pulo-muted] mt-1">Total Events</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Link href="/admin/events">
          <Card hover className="p-4 text-center">
            <Zap className="w-6 h-6 text-[--color-pulo-accent] mx-auto mb-2" />
            <div className="text-sm font-medium text-[--color-pulo-text]">Events</div>
          </Card>
        </Link>
        <Link href="/admin/runs">
          <Card hover className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-[--color-pulo-accent] mx-auto mb-2" />
            <div className="text-sm font-medium text-[--color-pulo-text]">Runs</div>
          </Card>
        </Link>
        <Link href="/admin/errors">
          <Card hover className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-[--color-pulo-danger] mx-auto mb-2" />
            <div className="text-sm font-medium text-[--color-pulo-text]">Errors</div>
          </Card>
        </Link>
        <Link href="/admin/radar">
          <Card hover className="p-4 text-center">
            <Activity className="w-6 h-6 text-[--color-pulo-accent] mx-auto mb-2" />
            <div className="text-sm font-medium text-[--color-pulo-text]">Radar</div>
          </Card>
        </Link>
        <Link href="/admin/safety">
          <Card hover className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-[--color-pulo-danger] mx-auto mb-2" />
            <div className="text-sm font-medium text-[--color-pulo-text]">Safety</div>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card hover className="p-4 text-center">
            <Users className="w-6 h-6 text-[--color-pulo-accent] mx-auto mb-2" />
            <div className="text-sm font-medium text-[--color-pulo-text]">Users</div>
          </Card>
        </Link>
        <Link href="/admin/technical-debt">
          <Card hover className="p-4 text-center">
            <Wrench className="w-6 h-6 text-[--color-pulo-warning] mx-auto mb-2" />
            <div className="text-sm font-medium text-[--color-pulo-text]">Tech Debt</div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
