'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import {
  getAdminErrors,
  retryAdminError,
  createAdminError,
  type ErrorRecord,
  type ErrorCode,
} from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { AlertTriangle, RefreshCw, Plus, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

const ERROR_CATEGORIES = ['FARCASTER', 'LLM', 'SAFETY', 'PLAN', 'ALERT', 'INFRA', 'UNKNOWN'] as const;

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params: { status?: string; limit?: number } = { limit: 50 };
      if (filter !== 'all') {
        params.status = filter;
      }
      const data = await getAdminErrors(params);
      setErrors(data.errors);
      setTotal(data.total);
    } catch (e) {
      console.error('Failed to load errors', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadErrors();
  }, [loadErrors]);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await retryAdminError(id);
      await loadErrors();
    } catch (e) {
      console.error('Retry failed', e);
    } finally {
      setRetryingId(null);
    }
  };

  const handleCreateTestError = async () => {
    try {
      const codes: ErrorCode[] = ['LLM_TIMEOUT', 'FARCASTER_RATE_LIMITED', 'SAFETY_BLOCKED'];
      const randomCode = codes[Math.floor(Math.random() * codes.length)];
      await createAdminError({
        code: randomCode,
        message: `Test error for ${randomCode}`,
        retryable: randomCode !== 'SAFETY_BLOCKED',
      });
      await loadErrors();
    } catch (e) {
      console.error('Create error failed', e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" size="sm">Pending</Badge>;
      case 'retrying':
        return <Badge variant="info" size="sm">Retrying</Badge>;
      case 'resolved':
        return <Badge variant="success" size="sm">Resolved</Badge>;
      case 'dead_lettered':
        return <Badge variant="secondary" size="sm">Dead Letter</Badge>;
      default:
        return <Badge variant="secondary" size="sm">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      FARCASTER: 'bg-blue-500/10 text-blue-400',
      LLM: 'bg-purple-500/10 text-purple-400',
      SAFETY: 'bg-red-500/10 text-red-400',
      PLAN: 'bg-orange-500/10 text-orange-400',
      ALERT: 'bg-yellow-500/10 text-yellow-400',
      INFRA: 'bg-gray-500/10 text-gray-400',
      UNKNOWN: 'bg-gray-500/10 text-gray-400',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${colors[category] || colors.UNKNOWN}`}>
        {category}
      </span>
    );
  };

  const columns = [
    {
      key: 'code',
      header: 'Error Code',
      render: (item: ErrorRecord) => (
        <div className="font-mono text-xs">
          <span className="text-[--color-pulo-accent]">{item.code}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item: ErrorRecord) => getCategoryBadge(item.category),
    },
    {
      key: 'message',
      header: 'Message',
      render: (item: ErrorRecord) => (
        <span className="text-sm truncate max-w-xs block">{item.message}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: ErrorRecord) => getStatusBadge(item.status),
    },
    {
      key: 'retryable',
      header: 'Retry',
      render: (item: ErrorRecord) => (
        item.retryable ? (
          <CheckCircle className="w-4 h-4 text-[--color-pulo-success]" />
        ) : (
          <XCircle className="w-4 h-4 text-[--color-pulo-danger]" />
        )
      ),
    },
    {
      key: 'retryCount',
      header: 'Retries',
      render: (item: ErrorRecord) => item.retryCount,
    },
    {
      key: 'correlationId',
      header: 'Correlation ID',
      render: (item: ErrorRecord) => (
        <span className="text-xs text-[--color-pulo-muted] font-mono">{item.correlationId.slice(0, 16)}...</span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Time',
      render: (item: ErrorRecord) => formatRelativeTime(item.timestamp),
    },
    {
      key: 'actions',
      header: '',
      render: (item: ErrorRecord) => (
        <div className="flex items-center gap-1">
          {item.retryable && item.status !== 'resolved' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRetry(item.id)}
              disabled={retryingId === item.id}
            >
              <RefreshCw className={`w-3 h-3 ${retryingId === item.id ? 'animate-spin' : ''}`} />
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
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Error Browser</h1>
          <p className="text-[--color-pulo-muted] mt-1">
            {total} total errors
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleCreateTestError}>
          <Plus className="w-4 h-4" />
          Create Test Error
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'pending', 'retrying', 'resolved', 'dead_lettered'].map((f) => (
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

      {/* Retry Queue Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-[--color-pulo-warning]" />
            <div>
              <p className="text-xs text-[--color-pulo-muted]">Pending</p>
              <p className="text-lg font-bold">{errors.filter(e => e.status === 'pending').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-[--color-pulo-info]" />
            <div>
              <p className="text-xs text-[--color-pulo-muted]">Retrying</p>
              <p className="text-lg font-bold">{errors.filter(e => e.status === 'retrying').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[--color-pulo-success]" />
            <div>
              <p className="text-xs text-[--color-pulo-muted]">Resolved</p>
              <p className="text-lg font-bold">{errors.filter(e => e.status === 'resolved').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="w-5 h-5 text-[--color-pulo-danger]" />
            <div>
              <p className="text-xs text-[--color-pulo-muted]">Dead Letters</p>
              <p className="text-lg font-bold">{errors.filter(e => e.status === 'dead_lettered').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Errors Table */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-[--color-pulo-muted]">
            Loading errors...
          </CardContent>
        </Card>
      ) : errors.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          title="No errors"
          description="No errors match the current filter."
          action={{ label: 'Refresh', onClick: loadErrors }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={errors}
              keyField="id"
              emptyMessage="No errors"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}