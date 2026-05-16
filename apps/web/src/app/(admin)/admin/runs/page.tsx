'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/state';
import { formatRelativeTime } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AgentRun {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  agentType: string;
  input: string;
  output?: string;
  duration?: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export default function RunsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRuns = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/agent-runs?limit=50', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json() as { data: Array<{ id: string; type: string; status: string; createdAt: string; payload?: Record<string, unknown> }> };
          // Map event records to AgentRun shape
          setRuns(data.data.map(e => ({
            id: e.id,
            status: (e.status as AgentRun['status']) || 'completed',
            agentType: String(e.type || 'unknown'),
            input: JSON.stringify(e.payload || {}).slice(0, 100),
            startedAt: e.createdAt,
          })));
        }
      } catch (e) {
        console.error('Failed to load runs', e);
      } finally {
        setLoading(false);
      }
    };
    loadRuns();
  }, []);

  const columns = [
    {
      key: 'status',
      header: 'Status',
      render: (item: AgentRun) => {
        const icons = { running: Clock, completed: CheckCircle, failed: XCircle, timeout: AlertCircle };
        const Icon = icons[item.status as keyof typeof icons] || Clock;
        const colors = {
          running: 'text-[--color-pulo-info]',
          completed: 'text-[--color-pulo-success]',
          failed: 'text-[--color-pulo-danger]',
          timeout: 'text-[--color-pulo-warning]',
        };
        return <Icon className={`w-4 h-4 ${colors[item.status as keyof typeof colors]}`} />;
      },
    },
    {
      key: 'agentType',
      header: 'Agent',
      render: (item: AgentRun) => <span className="capitalize">{item.agentType}</span>,
    },
    {
      key: 'input',
      header: 'Input',
      render: (item: AgentRun) => <span className="truncate max-w-xs">{item.input}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (item: AgentRun) => item.duration ? `${item.duration}ms` : '-',
    },
    {
      key: 'startedAt',
      header: 'Started',
      render: (item: AgentRun) => formatRelativeTime(item.startedAt),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Agent Runs</h1>
          <p className="text-[--color-pulo-muted] mt-1">Agent execution history</p>
        </div>
      </div>

      {runs.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-8 h-8" />}
          title="No runs"
          description="Agent runs will appear here."
          action={{ label: 'Refresh', onClick: () => {} }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={runs}
              keyField="id"
              emptyMessage="No runs"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
