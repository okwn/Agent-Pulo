'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { Play, RotateCcw, Database, Zap, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

type DemoStatus = 'idle' | 'seeding' | 'running' | 'complete' | 'error';

interface DemoResult {
  scenario: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
}

export default function AdminDemoPage() {
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [results, setResults] = useState<DemoResult[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runSeed = async () => {
    setStatus('seeding');
    setResults([]);
    try {
      // Call seed script via API or directly
      await apiFetch('/api/admin/demo/seed', { method: 'POST' });
      setResults([{ scenario: 'Database Seeding', status: 'success', message: 'Demo data seeded successfully' }]);
      setStatus('complete');
    } catch (e) {
      setResults([{ scenario: 'Database Seeding', status: 'error', message: String(e) }]);
      setStatus('error');
    }
  };

  const runDemos = async () => {
    setStatus('running');
    setResults([]);

    const scenarioResults: DemoResult[] = [];

    // Scenario 1: Mention Summary
    try {
      await apiFetch('/api/admin/demo/run-scenario', {
        method: 'POST',
        body: { scenario: 1 }
      });
      scenarioResults.push({
        scenario: 'Scenario 1: Basic Mention Summary',
        status: 'success',
        message: 'Summary generated for @pulo mention'
      });
    } catch (e) {
      scenarioResults.push({
        scenario: 'Scenario 1: Basic Mention Summary',
        status: 'error',
        message: String(e)
      });
    }

    // Scenario 2: Truth Check
    try {
      await apiFetch('/api/admin/demo/run-scenario', {
        method: 'POST',
        body: { scenario: 2 }
      });
      scenarioResults.push({
        scenario: 'Scenario 2: Truth Check',
        status: 'success',
        message: 'Token claim verified as uncertain/high-risk'
      });
    } catch (e) {
      scenarioResults.push({
        scenario: 'Scenario 2: Truth Check',
        status: 'error',
        message: String(e)
      });
    }

    // Scenario 3: Radar Trend
    try {
      await apiFetch('/api/admin/demo/run-scenario', {
        method: 'POST',
        body: { scenario: 3 }
      });
      scenarioResults.push({
        scenario: 'Scenario 3: Radar Trend',
        status: 'success',
        message: '$GRASS trend detected and alert sent'
      });
    } catch (e) {
      scenarioResults.push({
        scenario: 'Scenario 3: Radar Trend',
        status: 'error',
        message: String(e)
      });
    }

    // Scenario 4: Scam Warning
    try {
      await apiFetch('/api/admin/demo/run-scenario', {
        method: 'POST',
        body: { scenario: 4 }
      });
      scenarioResults.push({
        scenario: 'Scenario 4: Scam Warning',
        status: 'success',
        message: 'Critical phishing campaign detected'
      });
    } catch (e) {
      scenarioResults.push({
        scenario: 'Scenario 4: Scam Warning',
        status: 'error',
        message: String(e)
      });
    }

    // Scenario 5: Composer
    try {
      await apiFetch('/api/admin/demo/run-scenario', {
        method: 'POST',
        body: { scenario: 5 }
      });
      scenarioResults.push({
        scenario: 'Scenario 5: Composer Draft',
        status: 'success',
        message: 'Weak cast improved and saved as draft'
      });
    } catch (e) {
      scenarioResults.push({
        scenario: 'Scenario 5: Composer Draft',
        status: 'error',
        message: String(e)
      });
    }

    // Scenario 6: Plan Limit
    try {
      await apiFetch('/api/admin/demo/run-scenario', {
        method: 'POST',
        body: { scenario: 6 }
      });
      scenarioResults.push({
        scenario: 'Scenario 6: Plan Limit',
        status: 'success',
        message: 'Free user blocked at 5/5 limit'
      });
    } catch (e) {
      scenarioResults.push({
        scenario: 'Scenario 6: Plan Limit',
        status: 'error',
        message: String(e)
      });
    }

    setResults(scenarioResults);
    setStatus('complete');
    setLastRun(new Date());
  };

  const runReset = async () => {
    setStatus('seeding');
    try {
      await apiFetch('/api/admin/demo/reset', { method: 'POST' });
      setResults([{ scenario: 'Reset', status: 'success', message: 'Demo data cleared' }]);
      setStatus('idle');
    } catch (e) {
      setResults([{ scenario: 'Reset', status: 'error', message: String(e) }]);
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Demo Controls</h1>
          <p className="text-[--color-pulo-muted] mt-1">
            Seed data, run scenarios, and manage demo state
            {lastRun && ` • Last run: ${lastRun.toLocaleTimeString()}`}
          </p>
        </div>
        <Badge variant={status === 'idle' ? 'secondary' : status === 'complete' ? 'success' : 'warning'} size="sm">
          {status === 'idle' ? 'Ready' : status === 'seeding' ? 'Seeding...' : status === 'running' ? 'Running...' : status === 'complete' ? 'Complete' : 'Error'}
        </Badge>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Demo Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={runSeed} disabled={status !== 'idle'} variant="secondary">
              <Database className="w-4 h-4 mr-2" />
              Seed Demo Data
            </Button>

            <Button onClick={runDemos} disabled={status !== 'idle'} variant="default">
              {status === 'running' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Demos...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run All Scenarios
                </>
              )}
            </Button>

            <Button onClick={runReset} disabled={status !== 'idle'} variant="danger">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Demo
            </Button>
          </div>

          {status === 'idle' && (
            <p className="text-sm text-[--color-pulo-muted]">
              Seed demo data first, then run scenarios. Use reset to clear demo data.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Scenarios Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Scenario 1 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[--color-pulo-accent] flex items-center justify-center text-white text-sm font-bold">1</div>
              <span className="font-medium text-[--color-pulo-text]">Basic Mention</span>
            </div>
            <p className="text-xs text-[--color-pulo-muted]">
              User tags @pulo to summarize a thread. PULO generates summary with key points.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs text-[--color-pulo-muted]">
              <CheckCircle className="w-3 h-3" /> Mention agent
            </div>
          </CardContent>
        </Card>

        {/* Scenario 2 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[--color-pulo-warning] flex items-center justify-center text-white text-sm font-bold">2</div>
              <span className="font-medium text-[--color-pulo-text]">Truth Check</span>
            </div>
            <p className="text-xs text-[--color-pulo-muted]">
              Check if token airdrop claim is legitimate. Returns verdict with evidence.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs text-[--color-pulo-muted]">
              <CheckCircle className="w-3 h-3" /> Truth agent
            </div>
          </CardContent>
        </Card>

        {/* Scenario 3 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[--color-pulo-accent] flex items-center justify-center text-white text-sm font-bold">3</div>
              <span className="font-medium text-[--color-pulo-text]">Radar Trend</span>
            </div>
            <p className="text-xs text-[--color-pulo-muted]">
              Detect $GRASS reward discussion. Admin approves, alert is sent to users.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs text-[--color-pulo-muted]">
              <CheckCircle className="w-3 h-3" /> Radar agent
            </div>
          </CardContent>
        </Card>

        {/* Scenario 4 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[--color-pulo-danger] flex items-center justify-center text-white text-sm font-bold">4</div>
              <span className="font-medium text-[--color-pulo-text]">Scam Warning</span>
            </div>
            <p className="text-xs text-[--color-pulo-muted]">
              High-risk phishing campaign detected. Warning sent only to opted-in users.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs text-[--color-pulo-muted]">
              <AlertTriangle className="w-3 h-3" /> Safety agent
            </div>
          </CardContent>
        </Card>

        {/* Scenario 5 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[--color-pulo-accent] flex items-center justify-center text-white text-sm font-bold">5</div>
              <span className="font-medium text-[--color-pulo-text]">Composer</span>
            </div>
            <p className="text-xs text-[--color-pulo-muted]">
              Weak cast improved with better structure and clarity. Draft is saved.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs text-[--color-pulo-muted]">
              <Zap className="w-3 h-3" /> Composer agent
            </div>
          </CardContent>
        </Card>

        {/* Scenario 6 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[--color-pulo-warning] flex items-center justify-center text-white text-sm font-bold">6</div>
              <span className="font-medium text-[--color-pulo-text]">Plan Limit</span>
            </div>
            <p className="text-xs text-[--color-pulo-muted]">
              Free user hits daily limit. Blocked gracefully with upgrade CTA.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs text-[--color-pulo-muted]">
              <CheckCircle className="w-3 h-3" /> Safety gate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Run Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded bg-[--color-pulo-surface]">
                  <div className="flex items-center gap-3">
                    {result.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-[--color-pulo-success]" />
                    ) : result.status === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-[--color-pulo-danger]" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-[--color-pulo-muted]" />
                    )}
                    <span className="text-sm font-medium text-[--color-pulo-text]">{result.scenario}</span>
                  </div>
                  <span className={`text-xs ${result.status === 'success' ? 'text-[--color-pulo-success]' : result.status === 'error' ? 'text-[--color-pulo-danger]' : 'text-[--color-pulo-muted]'}`}>
                    {result.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}