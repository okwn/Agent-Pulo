'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/state';
import { getAdminEvents } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface AdminEvent {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  correlationId: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminEvents({ limit: 50 }) as { events: AdminEvent[] };
      setEvents(data.events);
    } catch (e) {
      console.error('Failed to load events', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const columns = [
    {
      key: 'type',
      header: 'Event Type',
      render: (item: AdminEvent) => (
        <span className="font-medium capitalize">{item.type.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (item: AdminEvent) => (
        <span className={`text-xs px-2 py-0.5 rounded ${
          item.severity === 'error' ? 'bg-red-500/20 text-red-400' :
          item.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>{item.severity}</span>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (item: AdminEvent) => (
        <span className="text-[--color-pulo-muted] text-xs">{item.message}</span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Time',
      render: (item: AdminEvent) => formatRelativeTime(item.timestamp),
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
