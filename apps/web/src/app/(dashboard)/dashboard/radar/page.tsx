'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendCard } from '@/components/ui/meters';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { Badge } from '@/components/ui/badge';
import { mockTrends } from '@/lib/mock-data';
import { Radar, Plus, Filter } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function RadarPage() {
  const trends = mockTrends;
  const [filter, setFilter] = useState<string>('all');

  const filteredTrends = filter === 'all' ? trends : trends.filter(t => t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Trend Radar</h1>
          <p className="text-[--color-pulo-muted] mt-1">Track emerging trends and opportunities</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Track New
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[--color-pulo-muted]" />
        {['all', 'active', 'pending', 'approved', 'rejected'].map((f) => (
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

      {filteredTrends.length === 0 ? (
        <EmptyState
          icon={<Radar className="w-8 h-8" />}
          title="No trends found"
          description="When trends match your tracking criteria, they'll appear here."
          action={{ label: 'Configure Filters', onClick: () => {} }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrends.map((trend) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              onClick={() => window.location.href = `/dashboard/radar/${trend.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
