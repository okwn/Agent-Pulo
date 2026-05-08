'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable, Pagination } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { mockAgentRuns } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function RunsPage() {
  const runs = mockAgentRuns;
  const [page, setPage] = useState(1);

  const columns = [
    {
      key: 'status',
      header: 'Status',
      render: (item: typeof runs[0]) => {
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
      render: (item: typeof runs[0]) => <span className="capitalize">{item.agentType}</span>,
    },
    {
      key: 'input',
      header: 'Input',
      render: (item: typeof runs[0]) => <span className="truncate max-w-xs">{item.input}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (item: typeof runs[0]) => item.duration ? `${item.duration}ms` : '-',
    },
    {
      key: 'startedAt',
      header: 'Started',
      render: (item: typeof runs[0]) => formatRelativeTime(item.startedAt),
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
