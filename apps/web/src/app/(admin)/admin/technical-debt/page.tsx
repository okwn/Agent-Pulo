'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/state';
import { getAdminDebt } from '@/lib/api';
import { Wrench, Plus } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface DebtItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  estimatedHours: number;
  createdAt: string;
}

export default function TechnicalDebtPage() {
  const [debt, setDebt] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDebt = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminDebt() as { debt: DebtItem[] };
      setDebt(data.debt);
    } catch (e) {
      console.error('Failed to load debt', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDebt();
  }, [loadDebt]);

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (item: DebtItem) => <span className="font-medium">{item.title}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (item: DebtItem) => <Badge>{item.category}</Badge>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item: DebtItem) => (
        <Badge variant={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'default'}>
          {item.priority}
        </Badge>
      ),
    },
    {
      key: 'estimatedHours',
      header: 'Est. Hours',
      render: (item: DebtItem) => item.estimatedHours,
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
