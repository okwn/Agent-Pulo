'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlanBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/providers/auth-provider';
import { User, Bell, CreditCard, Shield, Save, Loader2 } from 'lucide-react';
import type { PlanTier } from '@/lib/mock-data';

export default function SettingsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[--color-pulo-accent]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-[--color-pulo-muted]">Please sign in to view settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--color-pulo-text]">Settings</h1>
        <p className="text-[--color-pulo-muted] mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[--color-pulo-accent]" />
            <CardTitle>Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">FID</label>
              <Input defaultValue={String(user.fid)} disabled />
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Username</label>
              <Input defaultValue={user.username} disabled />
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Display Name</label>
              <Input defaultValue={user.displayName ?? ''} />
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Plan</label>
              <div className="flex items-center gap-2">
                <PlanBadge plan={user.plan as PlanTier} size="md" />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled>
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[--color-pulo-accent]" />
            <CardTitle>Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[--color-pulo-muted]">Notification settings are in the Alerts tab.</p>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[--color-pulo-accent]" />
            <CardTitle>Billing</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[--color-pulo-muted]">Billing settings available in billing page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
