'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/state';
import { mockTechnicalDebt } from '@/lib/mock-data';
import { Wrench, Plus } from 'lucide-react';

export default function TechnicalDebtPage() {
  const debt = mockTechnicalDebt;

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (item: typeof debt[0]) => <span className="font-medium">{item.title}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (item: typeof debt[0]) => <Badge>{item.category}</Badge>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item: typeof debt[0]) => (
        <Badge variant={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'default'}>
          {item.priority}
        </Badge>
      ),
    },
    {
      key: 'estimatedHours',
      header: 'Est. Hours',
      render: (item: typeof debt[0]) => item.estimatedHours,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Technical Debt</h1>
          <p className="text-[--color-pulo-muted] mt-1">Track and manage technical debt</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debt Items ({debt.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={debt}
            keyField="id"
            emptyMessage="No technical debt items"
          />
        </CardContent>
      </Card>
    </div>
  );
}
