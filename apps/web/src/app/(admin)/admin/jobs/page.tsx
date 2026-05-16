'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { getAdminJobs, retryAdminJob, cancelAdminJob, type JobRecord, type JobStatus } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { Briefcase, RefreshCw, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: { status?: JobStatus; limit?: number } = { limit: 50 };
      if (filter !== 'all') {
        params.status = filter as JobStatus;
      }
      const data = await getAdminJobs(params);
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (e) {
      console.error('Failed to load jobs', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await retryAdminJob(id);
      await loadJobs();
    } catch (e) {
      console.error('Retry failed', e);
    } finally {
      setRetryingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelAdminJob(id);
      await loadJobs();
    } catch (e) {
      console.error('Cancel failed', e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" size="sm">Pending</Badge>;
      case 'running':
        return <Badge variant="info" size="sm">Running</Badge>;
      case 'completed':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'failed':
        return <Badge variant="danger" size="sm">Failed</Badge>;
      case 'dead':
        return <Badge variant="danger" size="sm">Dead Letter</Badge>;
      default:
        return <Badge variant="default" size="sm">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, typeof Clock> = {
      pending: Clock, running: Loader, completed: CheckCircle, failed: XCircle, dead: AlertCircle,
    };
    const Icon = icons[status] ?? Clock;
    const colors: Record<string, string> = {
      pending: 'text-[--color-pulo-warning]',
      running: 'text-[--color-pulo-info]',
      completed: 'text-[--color-pulo-success]',
      failed: 'text-[--color-pulo-danger]',
      dead: 'text-[--color-pulo-danger]',
    };
    return <Icon className={`w-4 h-4 ${colors[status] ?? ''}`} />;
  };

  const columns = [
    {
      key: 'status',
      header: '',
      render: (item: JobRecord) => getStatusIcon(item.status ?? ''),
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: JobRecord) => (
        <span className="font-medium capitalize">{item.type}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: JobRecord) => getStatusBadge(item.status ?? ''),
    },
    {
      key: 'attempts',
      header: 'Attempts',
      render: (item: JobRecord) => `${item.attempts ?? 0}/${item.maxAttempts ?? 3}`,
    },
    {
      key: 'scheduledAt',
      header: 'Scheduled',
      render: (item: JobRecord) => item.scheduledAt ? formatRelativeTime(item.scheduledAt) : '-',
    },
    {
      key: 'actions',
      header: '',
      render: (item: JobRecord) => (
        <div className="flex items-center gap-1">
          {(item.status === 'failed' || item.status === 'dead') && (
            <Button variant="ghost" size="sm" onClick={() => handleRetry(item.id)} disabled={retryingId === item.id}>
              <RefreshCw className={`w-3 h-3 ${retryingId === item.id ? 'animate-spin' : ''}`} />
            </Button>
          )}
          {(item.status === 'pending' || item.status === 'running') && (
            <Button variant="ghost" size="sm" onClick={() => handleCancel(item.id)}>
              <Trash2 className="w-3 h-3 text-[--color-pulo-danger]" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Job Queue</h1>
          <p className="text-[--color-pulo-muted] mt-1">{total} total jobs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'pending', 'running', 'completed', 'failed', 'dead'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
              filter === f
                ? 'bg-[--color-pulo-accent] text-white'
                : 'bg-[--color-pulo-surface] text-[--color-pulo-muted] hover:text-[--color-pulo-text]'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['pending', 'running', 'completed', 'failed', 'dead'] as const).map((s) => (
          <Card key={s}>
            <CardContent className="p-4 flex items-center gap-3">
              {getStatusIcon(s)}
              <div>
                <p className="text-xs text-[--color-pulo-muted] capitalize">{s === 'dead' ? 'Dead Letter' : s}</p>
                <p className="text-lg font-bold">{jobs.filter(j => j.status === s).length}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Jobs Table */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-[--color-pulo-muted]">Loading jobs...</CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-8 h-8" />}
          title="No jobs"
          description="No jobs match the current filter."
          action={{ label: 'Refresh', onClick: loadJobs }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable columns={columns} data={jobs} keyField="id" emptyMessage="No jobs" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}