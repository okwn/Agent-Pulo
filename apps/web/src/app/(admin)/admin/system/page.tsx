'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import {
  getDeepHealth,
  type HealthCheckResult,
  type MetricsSnapshot,
} from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { Server, Database, Zap, Globe, Brain, AlertTriangle, CheckCircle, RefreshCw, Activity } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface DeepHealth {
  status: string;
  timestamp: string;
  uptime: number;
  checks: HealthCheckResult[];
  metrics: MetricsSnapshot;
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState<DeepHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const healthData = await getDeepHealth();
      setHealth(healthData as DeepHealth);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Failed to load system data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getMetricValue = (name: string): number => {
    if (!health?.metrics?.metrics) return 0;
    const metric = health.metrics.metrics.find(m => m.name === name);
    return metric?.value ?? 0;
  };

  const getComponentStatus = (component: string): 'operational' | 'degraded' | 'down' => {
    if (!health?.checks) return 'operational';
    const check = health.checks.find(c => c.component === component);
    if (!check) return 'operational';
    if (check.status === 'error') return 'down';
    if (check.status === 'degraded') return 'degraded';
    return 'operational';
  };

  const getComponentDetails = (component: string): Record<string, unknown> | undefined => {
    if (!health?.checks) return undefined;
    const check = health.checks.find(c => c.component === component);
    return check?.details;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">System Health</h1>
          <p className="text-[--color-pulo-muted] mt-1">
            Last updated: {formatRelativeTime(lastRefresh)}
            {health?.uptime && ` • Uptime: ${formatUptime(health.uptime)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={health?.status === 'ok' ? 'success' : health?.status === 'degraded' ? 'warning' : 'danger'}
            size="sm"
          >
            {health?.status || 'Loading...'}
          </Badge>
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className={health?.status !== 'ok' ? 'border-[--color-pulo-warning]' : ''}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {health?.status === 'ok' ? (
              <CheckCircle className="w-12 h-12 text-[--color-pulo-success]" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-[--color-pulo-warning]" />
            )}
            <div>
              <h2 className="text-xl font-bold text-[--color-pulo-text]">
                {health?.status === 'ok' ? 'All Systems Operational' : 'System Issues Detected'}
              </h2>
              <p className="text-[--color-pulo-muted]">
                {health?.status === 'ok'
                  ? 'All services are running normally.'
                  : 'Some services are experiencing issues.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* API */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[--color-pulo-accent]" />
                <CardTitle className="text-sm">API Server</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--color-pulo-muted]">Status</span>
                <StatusBadge status={getComponentStatus('api')} size="sm" />
              </div>
              {getComponentDetails('api')?.version && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Version</span>
                  <span className="text-sm">{getComponentDetails('api')?.version as string}</span>
                </div>
              )}
              {getComponentDetails('api')?.nodeVersion && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Node</span>
                  <span className="text-sm">{(getComponentDetails('api')?.nodeVersion as string)?.slice(1, 7)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Database */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[--color-pulo-accent]" />
                <CardTitle className="text-sm">Database</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--color-pulo-muted]">Status</span>
                <StatusBadge status={getComponentStatus('database')} size="sm" />
              </div>
              {getComponentDetails('database')?.poolSize && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Pool Size</span>
                  <span className="text-sm">{getComponentDetails('database')?.poolSize as number}</span>
                </div>
              )}
              {getComponentDetails('database')?.availableConnections && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Available</span>
                  <span className="text-sm">{getComponentDetails('database')?.availableConnections as number}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Redis */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[--color-pulo-accent]" />
                <CardTitle className="text-sm">Redis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--color-pulo-muted]">Status</span>
                <StatusBadge status={getComponentStatus('redis')} size="sm" />
              </div>
              {getComponentDetails('redis')?.memoryUsedMb && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Memory</span>
                  <span className="text-sm">{getComponentDetails('redis')?.memoryUsedMb as number}MB</span>
                </div>
              )}
              {getComponentDetails('redis')?.connectedClients && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Clients</span>
                  <span className="text-sm">{getComponentDetails('redis')?.connectedClients as number}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Far caster */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[--color-pulo-accent]" />
                <CardTitle className="text-sm">Farcaster</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--color-pulo-muted]">Status</span>
                <StatusBadge status={getComponentStatus('farcaster')} size="sm" />
              </div>
              {getComponentDetails('farcaster')?.rateLimitRemaining && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Rate Limit</span>
                  <span className="text-sm">{getComponentDetails('farcaster')?.rateLimitRemaining as number} remaining</span>
                </div>
              )}
              {getComponentDetails('farcaster')?.mode && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Mode</span>
                  <Badge variant="secondary" size="sm">{getComponentDetails('farcaster')?.mode as string}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LLM */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[--color-pulo-accent]" />
                <CardTitle className="text-sm">LLM Service</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[--color-pulo-muted]">Status</span>
                <StatusBadge status={getComponentStatus('llm')} size="sm" />
              </div>
              {getComponentDetails('llm')?.quotaRemaining && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Quota</span>
                  <span className="text-sm">{(getComponentDetails('llm')?.quotaRemaining as number)?.toLocaleString()} remaining</span>
                </div>
              )}
              {getComponentDetails('llm')?.model && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Model</span>
                  <Badge variant="secondary" size="sm">{getComponentDetails('llm')?.model as string}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Resources */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[--color-pulo-accent]" />
                <CardTitle className="text-sm">System Resources</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {getComponentDetails('system')?.memoryUsedMb && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Heap Used</span>
                  <span className="text-sm">{getComponentDetails('system')?.memoryUsedMb as number}MB</span>
                </div>
              )}
              {getComponentDetails('system')?.memoryTotalMb && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">Heap Total</span>
                  <span className="text-sm">{getComponentDetails('system')?.memoryTotalMb as number}MB</span>
                </div>
              )}
              {getComponentDetails('system')?.pid && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[--color-pulo-muted]">PID</span>
                  <span className="text-sm">{getComponentDetails('system')?.pid as number}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics Summary */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[--color-pulo-text]">
                {getMetricValue('pulo_agent_runs_total')}
              </p>
              <p className="text-xs text-[--color-pulo-muted]">Agent Runs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[--color-pulo-text]">
                {getMetricValue('pulo_truth_checks_total')}
              </p>
              <p className="text-xs text-[--color-pulo-muted]">Truth Checks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[--color-pulo-text]">
                {getMetricValue('pulo_alerts_delivered_total')}
              </p>
              <p className="text-xs text-[--color-pulo-muted]">Alerts Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[--color-pulo-text]">
                {getMetricValue('pulo_publish_success_total')}
              </p>
              <p className="text-xs text-[--color-pulo-muted]">Publishes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[--color-pulo-warning]">
                {getMetricValue('pulo_safety_blocks_total')}
              </p>
              <p className="text-xs text-[--color-pulo-muted]">Safety Blocks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[--color-pulo-text]">
                {health.metrics.uptime}
              </p>
              <p className="text-xs text-[--color-pulo-muted]">Uptime (s)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Checks Table */}
      {health?.checks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Component Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[--color-pulo-border]">
              {health.checks.map((check) => (
                <div key={check.component} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{check.component}</span>
                      <StatusBadge
                        status={check.status === 'ok' ? 'operational' : check.status === 'error' ? 'down' : 'degraded'}
                        size="sm"
                      />
                    </div>
                    {check.latencyMs && (
                      <span className="text-xs text-[--color-pulo-muted]">{check.latencyMs}ms</span>
                    )}
                  </div>
                  {check.message && (
                    <p className="text-sm text-[--color-pulo-danger]">{check.message}</p>
                  )}
                  {check.details && Object.keys(check.details).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(check.details).map(([key, value]) => (
                        <span key={key} className="text-xs text-[--color-pulo-muted]">
                          {key}: <span className="text-[--color-pulo-text]">{String(value)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}