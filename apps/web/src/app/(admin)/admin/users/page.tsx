// @ts-nocheck
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { PlanBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state';
import { setUserPlan, type PlanTier } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Users, Plus, Filter, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const PLAN_OPTIONS: PlanTier[] = ['free', 'pro', 'creator', 'community', 'admin'];

interface MockUser {
  id: string;
  username: string;
  plan: PlanTier;
  farcasterId?: number;
  castsUsed: number;
  castsLimit: number;
  status: string;
  createdAt: string;
}

const mockUsers: MockUser[] = [
  { id: 'user_1', username: 'faruser', plan: 'pro', farcasterId: 12345, castsUsed: 47, castsLimit: 50, status: 'active', createdAt: '2024-01-15' },
  { id: 'user_2', username: 'defi_king', plan: 'creator', farcasterId: 23456, castsUsed: 234, castsLimit: 500, status: 'active', createdAt: '2024-02-20' },
  { id: 'user_3', username: 'eth_maximalist', plan: 'free', farcasterId: 34567, castsUsed: 12, castsLimit: 50, status: 'active', createdAt: '2024-03-10' },
  { id: 'user_4', username: 'anon_trader', plan: 'community', farcasterId: 45678, castsUsed: 89, castsLimit: 250, status: 'active', createdAt: '2024-04-05' },
  { id: 'user_5', username: 'new_user', plan: 'free', farcasterId: 56789, castsUsed: 5, castsLimit: 50, status: 'pending', createdAt: '2026-05-08' },
];

export default function UsersAdminPage() {
  const [users, setUsers] = useState<MockUser[]>(mockUsers);
  const [filter, setFilter] = useState<string>('all');
  const [editingPlan, setEditingPlan] = useState<string | null>(null);

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.status === filter);

  const handlePlanChange = async (userId: string, newPlan: PlanTier) => {
    try {
      await setUserPlan(parseInt(userId.replace('user_', '')), newPlan);
      setUsers(users.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
    } catch (error) {
      console.error('Failed to update plan:', error);
    } finally {
      setEditingPlan(null);
    }
  };

  const columns = [
    {
      key: 'username',
      header: 'Username',
      render: (item: MockUser) => (
        <div>
          <span className="font-medium">@{item.username}</span>
          {item.farcasterId && (
            <span className="text-xs text-[--color-pulo-muted] ml-2">FID:{item.farcasterId}</span>
          )}
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (item: MockUser) => (
        <div className="relative">
          {editingPlan === item.id ? (
            <select
              value={item.plan}
              onChange={(e) => handlePlanChange(item.id, e.target.value as PlanTier)}
              onBlur={() => setEditingPlan(null)}
              autoFocus
              className="bg-[--color-pulo-surface] border border-[--color-pulo-border] rounded px-2 py-1 text-sm"
            >
              {PLAN_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => setEditingPlan(item.id)}
              className="hover:opacity-80 transition-opacity"
            >
              <PlanBadge plan={item.plan} size="sm" />
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'casts',
      header: 'Casts',
      render: (item: MockUser) => `${item.castsUsed}/${item.castsLimit}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: MockUser) => (
        <span className={`capitalize ${item.status === 'active' ? 'text-[--color-pulo-success]' : 'text-[--color-pulo-warning]'}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (item: MockUser) => formatDate(item.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (item: MockUser) => (
        <div className="flex items-center gap-2">
          {editingPlan !== item.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingPlan(item.id)}
            >
              Change Plan
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
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Users Admin</h1>
          <p className="text-[--color-pulo-muted] mt-1">Manage user accounts and plans</p>
        </div>
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[--color-pulo-muted]" />
        {['all', 'active', 'pending', 'suspended'].map((f) => (
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

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No users"
          description="Users will appear here."
          action={{ label: 'Refresh', onClick: () => {} }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filteredUsers}
              keyField="id"
              emptyMessage="No users"
            />
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-[--color-pulo-muted]">
        Click on a plan badge to change a user&apos;s plan. Changes take effect immediately.
      </p>
    </div>
  );
}
