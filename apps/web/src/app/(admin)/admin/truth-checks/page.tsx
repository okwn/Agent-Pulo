'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { Badge } from '@/components/ui/badge';
import { getAdminTruthChecks } from '@/lib/api';
import { Shield, Filter, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface TruthCheck {
  id: string;
  claim: string;
  verdict: string;
  confidence: number;
  status: string;
  createdAt: string;
}

export default function TruthChecksAdminPage() {
  const [checks, setChecks] = useState<TruthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadChecks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminTruthChecks() as { checks: TruthCheck[] };
      setChecks(data.checks);
    } catch (e) {
      console.error('Failed to load truth checks', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChecks();
  }, [loadChecks]);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      await fetch(`/api/admin/truth-checks/${id}/approve`, { method: 'POST', credentials: 'include' });
      await loadChecks();
    } catch (e) {
      console.error('Failed to approve', e);
    } finally {
      setActioningId(null);
    }
  };

  const filteredChecks = filter === 'all' ? checks : checks.filter(c => c.verdict === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Truth Checks Admin</h1>
          <p className="text-[--color-pulo-muted] mt-1">Manage truth analysis</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[--color-pulo-muted]" />
        {['all', 'true', 'false', 'unverified', 'misleading'].map((f) => (
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

      {loading ? (
        <Card><CardContent className="p-8 text-center text-[--color-pulo-muted]">Loading...</CardContent></Card>
      ) : filteredChecks.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-8 h-8" />}
          title="No truth checks"
          description="Truth checks will appear here."
          action={{ label: 'Refresh', onClick: loadChecks }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredChecks.map((check) => (
            <Card key={check.id}>
              <CardContent className="p-4">
                <p className="text-sm text-[--color-pulo-text] mb-2">&quot;{check.claim}&quot;</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[--color-pulo-muted]">
                    <Badge variant={check.verdict === 'true' ? 'success' : check.verdict === 'false' ? 'danger' : 'warning'} size="sm">
                      {check.verdict}
                    </Badge>
                    <span>{Math.round(check.confidence * 100)}% confidence</span>
                    <span className="capitalize">· {check.status}</span>
                  </div>
                  {check.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleApprove(check.id)} disabled={actioningId === check.id}>
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
