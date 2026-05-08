'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { getAlertSettings, updateAlertSettings, type AlertSettings } from '@/lib/api';
import { Bell, Save, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AlertSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      getAlertSettings().then(setSettings).finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateAlertSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
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
        <h1 className="text-2xl font-bold text-[--color-pulo-text]">Alert Settings</h1>
        <p className="text-[--color-pulo-muted] mt-1">Configure your notification preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.allowMiniAppNotifications ?? true}
              onChange={(e) => setSettings(s => s ? { ...s, allowMiniAppNotifications: e.target.checked } : s)}
              className="w-4 h-4 rounded border-[--color-pulo-border] bg-[--color-pulo-bg]"
            />
            <div>
              <span className="text-sm font-medium text-[--color-pulo-text]">Mini App Notifications</span>
              <p className="text-xs text-[--color-pulo-muted]">Receive notifications in the PULO mini app</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.allowDirectCasts ?? false}
              onChange={(e) => setSettings(s => s ? { ...s, allowDirectCasts: e.target.checked } : s)}
              className="w-4 h-4 rounded border-[--color-pulo-border] bg-[--color-pulo-bg]"
            />
            <div>
              <span className="text-sm font-medium text-[--color-pulo-text]">Direct Cast Alerts</span>
              <p className="text-xs text-[--color-pulo-muted]">Receive alerts as direct cast replies to your account</p>
            </div>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Risk Tolerance</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] text-[--color-pulo-text]"
                value={settings?.riskTolerance ?? 'medium'}
                onChange={(e) => setSettings(s => s ? { ...s, riskTolerance: e.target.value as AlertSettings['riskTolerance'] } : s)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Frequency</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] text-[--color-pulo-text]"
                value={settings?.frequency ?? 'realtime'}
                onChange={(e) => setSettings(s => s ? { ...s, frequency: e.target.value as AlertSettings['frequency'] } : s)}
              >
                <option value="realtime">Real-time</option>
                <option value="digest">Daily Digest</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-[--color-pulo-muted] block mb-1">Daily Alert Limit</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={settings?.dailyAlertLimit ?? 50}
              onChange={(e) => setSettings(s => s ? { ...s, dailyAlertLimit: parseInt(e.target.value) || 1 } : s)}
              className="w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] text-[--color-pulo-text]"
            />
          </div>

          <div>
            <label className="text-sm text-[--color-pulo-muted] block mb-1">Allowed Topics</label>
            <input
              type="text"
              placeholder="airdrop, grant, token launch..."
              className="w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] text-[--color-pulo-text] placeholder:text-[--color-pulo-muted]"
              disabled
            />
            <span className="text-xs text-[--color-pulo-muted] mt-1 block">[Coming soon]</span>
          </div>

          <div>
            <label className="text-sm text-[--color-pulo-muted] block mb-1">Blocked Topics</label>
            <input
              type="text"
              placeholder="spam, scam, ..."
              className="w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] text-[--color-pulo-text] placeholder:text-[--color-pulo-muted]"
              disabled
            />
            <span className="text-xs text-[--color-pulo-muted] mt-1 block">[Coming soon]</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-[--color-pulo-bg] rounded-lg">
            <AlertTriangle className="w-4 h-4 text-[--color-pulo-warning]" />
            <div>
              <span className="text-sm font-medium text-[--color-pulo-text]">Coming Soon</span>
              <p className="text-xs text-[--color-pulo-muted]">Mute notifications during specific hours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        {saved && <span className="text-sm text-[--color-pulo-success]">Saved!</span>}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
