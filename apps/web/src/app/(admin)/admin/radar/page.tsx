'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { Badge } from '@/components/ui/badge';
import { getAdminTrends } from '@/lib/api';
import { Radar, Plus, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface Trend {
  id: string;
  title: string;
  category: string;
  status: string;
  mentions: number;
  velocity: number;
  createdAt: string;
  sparkline?: number[];
}

const categoryColors: Record<string, string> = {
  airdrop: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  grant: 'bg-green-500/20 text-green-400 border-green-500/30',
  reward: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  program: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  news: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  hack: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function TrendCard({ trend, onClick }: { trend: Trend; onClick?: () => void }) {
  const velocityIcon = trend.velocity > 100 ? TrendingUp : trend.velocity > 50 ? Minus : TrendingDown;
  const VelocityIcon = velocityIcon;
  const sparkline = trend.sparkline || [];
  const maxVal = Math.max(...sparkline, 1);
  const minVal = Math.min(...sparkline, 0);
  const range = maxVal - minVal || 1;

  return (
    <Card hover={!!onClick} onClick={onClick} className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <span className={`inline-block px-2 py-0.5 text-xs rounded border mb-2 ${categoryColors[trend.category] || categoryColors.news}`}>
            {trend.category}
          </span>
          <CardTitle className="text-base leading-tight">{trend.title}</CardTitle>
        </div>
        <VelocityIcon className={`w-4 h-4 ${trend.velocity > 100 ? 'text-green-400' : trend.velocity > 50 ? 'text-yellow-400' : 'text-gray-400'}`} />
      </div>
      <div className="flex items-center gap-4 text-sm text-[--color-pulo-muted]">
        <span>{trend.mentions.toLocaleString()} mentions</span>
        <span className="capitalize">{trend.status}</span>
      </div>
      {sparkline.length > 0 && (
        <div className="flex items-end gap-0.5 h-8 mt-2">
          {sparkline.map((val, i) => (
            <div key={i} className="flex-1 bg-[--color-pulo-accent] rounded-sm" style={{ height: `${((val - minVal) / range) * 100}%` }} />
          ))}
        </div>
      )}
    </Card>
  );
}

export default function AdminRadarPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadTrends = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminTrends() as { trends: Trend[] };
      setTrends(data.trends);
    } catch (e) {
      console.error('Failed to load trends', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

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
