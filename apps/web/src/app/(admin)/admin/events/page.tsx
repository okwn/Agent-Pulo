'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/state';
import { mockEventLog } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/utils';
import { Activity, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function EventsPage() {
  const events = mockEventLog;
  const [page, setPage] = useState(1);

  const columns = [
    {
      key: 'type',
      header: 'Event Type',
      render: (item: typeof events[0]) => (
        <span className="font-medium">{item.type.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Time',
      render: (item: typeof events[0]) => formatRelativeTime(item.timestamp),
    },
    {
      key: 'data',
      header: 'Details',
      render: (item: typeof events[0]) => (
        <span className="text-[--color-pulo-muted] text-xs">
          {JSON.stringify(item.data).slice(0, 50)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Events</h1>
          <p className="text-[--color-pulo-muted] mt-1">System event log</p>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-8 h-8" />}
          title="No events"
          description="System events will appear here."
          action={{ label: 'Refresh', onClick: () => {} }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={events}
              keyField="id"
              emptyMessage="No events"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
