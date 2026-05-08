'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TruthReportCard } from '@/components/features/truth-report-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { mockTruthChecks } from '@/lib/mock-data';
import { Shield, Plus, Filter } from 'lucide-react';
import { useState } from 'react';

export default function TruthPage() {
  const checks = mockTruthChecks;
  const [filter, setFilter] = useState<string>('all');

  const filteredChecks = filter === 'all' ? checks : checks.filter(c => c.verdict === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Truth Checks</h1>
          <p className="text-[--color-pulo-muted] mt-1">Analysis of claims and statements</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          New Check
        </Button>
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

      {filteredChecks.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-8 h-8" />}
          title="No truth checks found"
          description="When claims are analyzed, they'll appear here."
          action={{ label: 'Refresh', onClick: () => {} }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredChecks.map((check) => (
            <TruthReportCard key={check.id} truthCheck={check} />
          ))}
        </div>
      )}
    </div>
  );
}
