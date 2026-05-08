'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockTrends } from '@/lib/mock-data';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminRadarDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const trend = mockTrends.find(t => t.id === id) ?? mockTrends[0]!;

  return (
    <div className="space-y-6">
      <Link href="/admin/radar" className="inline-flex items-center gap-2 text-sm text-[--color-pulo-muted] hover:text-[--color-pulo-text]">
        <ArrowLeft className="w-4 h-4" />
        Back to Radar Admin
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge>{trend.category}</Badge>
            <Badge variant={trend.status === 'active' ? 'success' : trend.status === 'pending' ? 'warning' : 'default'}>
              {trend.status}
            </Badge>
          </div>
          <CardTitle>{trend.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[--color-pulo-bg] rounded-lg">
              <div className="text-2xl font-bold">{trend.mentions.toLocaleString()}</div>
              <div className="text-xs text-[--color-pulo-muted]">Mentions</div>
            </div>
            <div className="text-center p-4 bg-[--color-pulo-bg] rounded-lg">
              <div className="text-2xl font-bold">{trend.velocity}</div>
              <div className="text-xs text-[--color-pulo-muted]">Velocity</div>
            </div>
            <div className="text-center p-4 bg-[--color-pulo-bg] rounded-lg">
              <div className="text-2xl font-bold">{trend.sources}</div>
              <div className="text-xs text-[--color-pulo-muted]">Sources</div>
            </div>
            <div className="text-center p-4 bg-[--color-pulo-bg] rounded-lg">
              <div className="text-2xl font-bold">{Math.round(trend.sentiment * 100)}%</div>
              <div className="text-xs text-[--color-pulo-muted]">Sentiment</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
