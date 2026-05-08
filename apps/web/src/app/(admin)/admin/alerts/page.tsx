'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertCard } from '@/components/features/alert-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { mockAlerts } from '@/lib/mock-data';
import { Bell, Plus, Filter } from 'lucide-react';
import { useState } from 'react';

export default function AlertsAdminPage() {
  const alerts = mockAlerts;
  const [filter, setFilter] = useState<string>('all');

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);

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
        {['all', 'trend', 'mention', 'safety', 'system', 'billing'].map((f) => (
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

      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="No alerts"
          description="Alerts will appear here."
          action={{ label: 'Refresh', onClick: () => {} }}
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
