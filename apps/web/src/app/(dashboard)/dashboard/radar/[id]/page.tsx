'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockTrends, type Trend } from '@/lib/mock-data';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { TrendingUp, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RadarDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const trend = mockTrends.find(t => t.id === id) ?? mockTrends[0]!;

  const sparkline = trend.sparkline || [];
  const maxVal = Math.max(...sparkline, 1);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/dashboard/radar" className="inline-flex items-center gap-2 text-sm text-[--color-pulo-muted] hover:text-[--color-pulo-text]">
        <ArrowLeft className="w-4 h-4" />
        Back to Radar
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge>{trend.category}</Badge>
            <Badge variant={trend.status === 'active' ? 'success' : trend.status === 'pending' ? 'warning' : 'default'}>
              {trend.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">{trend.title}</h1>
          <p className="text-[--color-pulo-muted] mt-1">
            First mentioned {formatDate(trend.firstMentioned)} · Last seen {formatRelativeTime(trend.lastMentioned)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-[--color-pulo-accent]">{trend.mentions.toLocaleString()}</div>
            <div className="text-sm text-[--color-pulo-muted] mt-1">Total Mentions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-[--color-pulo-text]">{trend.velocity}</div>
            <div className="text-sm text-[--color-pulo-muted] mt-1">Velocity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-[--color-pulo-text]">{trend.sources}</div>
            <div className="text-sm text-[--color-pulo-muted] mt-1">Sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-[--color-pulo-text]">{Math.round(trend.sentiment * 100)}%</div>
            <div className="text-sm text-[--color-pulo-muted] mt-1">Sentiment</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-40">
            {sparkline.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-[--color-pulo-accent]/30 hover:bg-[--color-pulo-accent]/50 transition-colors"
                  style={{ height: `${(val / maxVal) * 100}%` }}
                />
                <span className="text-xs text-[--color-pulo-muted]">
                  {['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'][i]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
