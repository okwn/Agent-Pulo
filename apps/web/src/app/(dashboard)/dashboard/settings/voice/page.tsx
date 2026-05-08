'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { getVoiceSettings, updateVoiceSettings, type VoiceSettings } from '@/lib/api';
import { Zap, Save, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function VoiceSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      getVoiceSettings().then(setSettings).finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateVoiceSettings(settings);
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
        <h1 className="text-2xl font-bold text-[--color-pulo-text]">Voice Settings</h1>
        <p className="text-[--color-pulo-muted] mt-1">Configure your AI voice and personality</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[--color-pulo-accent]" />
            <CardTitle>Voice Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Language</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] text-[--color-pulo-text]"
                value={settings?.language ?? 'en'}
                onChange={(e) => setSettings(s => s ? { ...s, language: e.target.value } : s)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Tone</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] text-[--color-pulo-text]"
                value={settings?.tone ?? 'balanced'}
                onChange={(e) => setSettings(s => s ? { ...s, tone: e.target.value as VoiceSettings['tone'] } : s)}
              >
                <option value="balanced">Balanced</option>
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
                <option value="witty">Witty</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Reply Style</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] text-[--color-pulo-text]"
                value={settings?.replyStyle ?? 'helpful'}
                onChange={(e) => setSettings(s => s ? { ...s, replyStyle: e.target.value as VoiceSettings['replyStyle'] } : s)}
              >
                <option value="helpful">Helpful</option>
                <option value="brief">Brief</option>
                <option value="detailed">Detailed</option>
                <option value="persuasive">Persuasive</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Humor Level</label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings?.humorLevel ?? 50}
                onChange={(e) => setSettings(s => s ? { ...s, humorLevel: parseInt(e.target.value) } : s)}
                className="w-full"
              />
              <span className="text-xs text-[--color-pulo-muted]">{settings?.humorLevel ?? 50}%</span>
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Technical Depth</label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings?.technicalDepth ?? 50}
                onChange={(e) => setSettings(s => s ? { ...s, technicalDepth: parseInt(e.target.value) } : s)}
                className="w-full"
              />
              <span className="text-xs text-[--color-pulo-muted]">{settings?.technicalDepth ?? 50}%</span>
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Concise vs Detailed</label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings?.conciseVsDetailed ?? 50}
                onChange={(e) => setSettings(s => s ? { ...s, conciseVsDetailed: parseInt(e.target.value) } : s)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[--color-pulo-muted]">
                <span>Concise</span>
                <span>Detailed</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-[--color-pulo-muted] block mb-1">Blocked Topics</label>
            <input
              type="text"
              placeholder="Comma-separated topics to avoid"
              className="w-full px-3 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] text-[--color-pulo-text] placeholder:text-[--color-pulo-muted]"
              disabled
            />
            <span className="text-xs text-[--color-pulo-muted] mt-1 block">[Coming soon]</span>
          </div>

          <div>
            <label className="text-sm text-[--color-pulo-muted] block mb-1">Example Casts for Style Learning</label>
            <textarea
              placeholder="Paste example casts that match your style..."
              className="w-full h-24 px-3 py-2 rounded-lg bg-[--color-pulo-bg] border border-[--color-pulo-border] text-[--color-pulo-text] placeholder:text-[--color-pulo-muted] resize-none"
              disabled
            />
            <span className="text-xs text-[--color-pulo-muted] mt-1 block">[Coming soon]</span>
          </div>

          <div className="flex justify-end gap-3">
            {saved && <span className="text-sm text-[--color-pulo-success]">Saved!</span>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
