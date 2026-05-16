'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { Badge } from '@/components/ui/badge';
import { getAdminAlertLogs } from '@/lib/api';
import { Bell, Plus, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface AlertLog {
  id: string;
  alertId: string;
  userFid: number;
  channel: string;
  status: 'delivered' | 'failed' | 'pending';
  error?: string;
  deliveredAt: string;
}

export default function AlertsAdminPage() {
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminAlertLogs() as { logs: AlertLog[] };
      setLogs(data.logs);
    } catch (e) {
      console.error('Failed to load alert logs', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = filter === 'all' ? logs : logs.filter(a => a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Alerts Admin</h1>
          <p className="text-[--color-pulo-muted] mt-1">Manage system alerts</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Create Alert
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[--color-pulo-muted]" />
        {['all', 'delivered', 'failed', 'pending'].map((f) => (
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
        <Card>
          <CardContent className="p-8 text-center text-[--color-pulo-muted]">Loading alert logs...</CardContent>
        </Card>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="No alert logs"
          description="Alert delivery logs will appear here."
          action={{ label: 'Refresh', onClick: loadLogs }}
        />
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {log.status === 'delivered' && <CheckCircle className="w-4 h-4 text-[--color-pulo-success]" />}
                    {log.status === 'failed' && <XCircle className="w-4 h-4 text-[--color-pulo-danger]" />}
                    {log.status === 'pending' && <Clock className="w-4 h-4 text-[--color-pulo-warning]" />}
                    <div>
                      <p className="text-sm font-medium">Alert {log.alertId}</p>
                      <p className="text-xs text-[--color-pulo-muted]">User FID: {log.userFid} · {log.channel}</p>
                    </div>
                  </div>
                  <Badge variant={log.status === 'delivered' ? 'success' : log.status === 'failed' ? 'danger' : 'warning'} size="sm">
                    {log.status}
                  </Badge>
                </div>
                {log.error && <p className="text-xs text-[--color-pulo-danger] mt-2">Error: {log.error}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
