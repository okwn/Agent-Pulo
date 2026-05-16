'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RiskBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { getAdminSafetyFlags } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { AlertTriangle, Filter, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface SafetyFlag {
  id: string;
  type: string;
  severity: string;
  description: string;
  reporter: string;
  status: string;
  castHash?: string;
  createdAt: string;
}

export default function SafetyPage() {
  const [flags, setFlags] = useState<SafetyFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminSafetyFlags() as { flags: SafetyFlag[] };
      setFlags(data.flags);
    } catch (e) {
      console.error('Failed to load safety flags', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const handleResolve = async (id: string) => {
    setActioningId(id);
    try {
      await fetch(`/api/admin/safety-flags/${id}/resolve`, { method: 'POST', credentials: 'include' });
      await loadFlags();
    } catch (e) {
      console.error('Failed to resolve flag', e);
    } finally {
      setActioningId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setActioningId(id);
    try {
      await fetch(`/api/admin/safety-flags/${id}/dismiss`, { method: 'POST', credentials: 'include' });
      await loadFlags();
    } catch (e) {
      console.error('Failed to dismiss flag', e);
    } finally {
      setActioningId(null);
    }
  };

  const filteredFlags = filter === 'all' ? flags : flags.filter(f => f.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Safety Flags</h1>
          <p className="text-[--color-pulo-muted] mt-1">Review and manage safety flags</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[--color-pulo-muted]" />
        {['all', 'pending', 'resolved', 'dismissed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
              filter === f
                ? 'bg-[--color-pulo-accent] text-white'
                : 'bg-[--color-pulo-surface] text-[--color-pulo-muted] hover:text-[--color-pulo-text]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredFlags.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          title="No safety flags"
          description="Safety flags will appear here."
          action={{ label: 'Refresh', onClick: () => {} }}
        />
      ) : (
        <div className="space-y-3">
          {filteredFlags.map((flag) => (
            <Card key={flag.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    flag.severity === 'critical' || flag.severity === 'high'
                      ? 'bg-[--color-pulo-danger-muted]'
                      : flag.severity === 'medium'
                      ? 'bg-[--color-pulo-warning-muted]'
                      : 'bg-[--color-pulo-success-muted]'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      flag.severity === 'critical' || flag.severity === 'high'
                        ? 'text-[--color-pulo-danger]'
                        : flag.severity === 'medium'
                        ? 'text-[--color-pulo-warning]'
                        : 'text-[--color-pulo-success]'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <RiskBadge level={flag.severity as 'low' | 'medium' | 'high' | 'critical'} size="sm" />
                      <span className="text-xs text-[--color-pulo-muted] capitalize">{flag.type}</span>
                      <span className="text-xs text-[--color-pulo-muted]">·</span>
                      <span className="text-xs text-[--color-pulo-muted]">{formatRelativeTime(flag.createdAt)}</span>
                    </div>
                    <p className="text-sm text-[--color-pulo-text] mb-2">{flag.description}</p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleResolve(flag.id)} disabled={actioningId === flag.id}>
                        <CheckCircle className="w-4 h-4" />
                        Resolve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDismiss(flag.id)} disabled={actioningId === flag.id}>
                        <XCircle className="w-4 h-4" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
