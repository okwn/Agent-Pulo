'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { mockTruthChecks } from '@/lib/mock-data';
import { Shield, Plus, Filter } from 'lucide-react';
import { useState } from 'react';

export default function TruthChecksAdminPage() {
  const checks = mockTruthChecks;
  const [filter, setFilter] = useState<string>('all');

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

      {filteredChecks.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-8 h-8" />}
          title="No truth checks"
          description="Truth checks will appear here."
          action={{ label: 'Refresh', onClick: () => {} }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredChecks.map((check) => (
            <Card key={check.id}>
              <CardContent className="p-4">
                <p className="text-sm text-[--color-pulo-text] mb-2">&quot;{check.claim}&quot;</p>
                <div className="flex items-center gap-2 text-xs text-[--color-pulo-muted]">
                  <span className="capitalize">{check.verdict}</span>
                  <span>·</span>
                  <span>{Math.round(check.confidence * 100)}% confidence</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
