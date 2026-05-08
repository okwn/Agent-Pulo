'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendCard } from '@/components/ui/meters';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { Badge } from '@/components/ui/badge';
import { mockTrends } from '@/lib/mock-data';
import { Radar, Plus, Filter } from 'lucide-react';
import { useState } from 'react';

export default function AdminRadarPage() {
  const trends = mockTrends;
  const [filter, setFilter] = useState<string>('all');

  const filteredTrends = filter === 'all' ? trends : trends.filter(t => t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Radar Admin</h1>
          <p className="text-[--color-pulo-muted] mt-1">Manage trend radar</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Add Trend
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
          title="No trends"
          description="Trends will appear here."
          action={{ label: 'Refresh', onClick: () => {} }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrends.map((trend) => (
            <TrendCard key={trend.id} trend={trend} onClick={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
