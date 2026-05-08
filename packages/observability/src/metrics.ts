// metrics.ts - Metrics collection and reporting

import type { Counter, Histogram, Gauge } from './types.js';

// ─── Metric Types ───────────────────────────────────────────────────────────────

export type MetricType = 'counter' | 'histogram' | 'gauge';

export interface MetricValue {
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
}

export interface MetricsSnapshot {
  metrics: MetricValue[];
  uptime: number;
  timestamp: string;
}

// ─── Metric Definitions ─────────────────────────────────────────────────────────

export const METRIC_NAMES = {
  // Webhook events
  WEBHOOK_EVENTS_RECEIVED: 'pulo_webhook_events_received_total',
  EVENTS_PROCESSED: 'pulo_events_processed_total',
  EVENTS_PROCESSING_TIME_MS: 'pulo_events_processing_time_ms',

  // Agent runs
  AGENT_RUNS_TOTAL: 'pulo_agent_runs_total',
  AGENT_RUNS_DURATION_MS: 'pulo_agent_runs_duration_ms',

  // LLM
  LLM_TOKENS_USED: 'pulo_llm_tokens_used_total',
  LLM_COST_ESTIMATE_USD: 'pulo_llm_cost_estimate_usd_total',
  LLM_REQUESTS_TOTAL: 'pulo_llm_requests_total',

  // Truth checks
  TRUTH_CHECKS_TOTAL: 'pulo_truth_checks_total',
  TRUTH_CHECKS_BY_VERDICT: 'pulo_truth_checks_by_verdict_total',

  // Radar
  RADAR_TRENDS_DETECTED: 'pulo_radar_trends_detected_total',

  // Alerts
  ALERTS_DELIVERED: 'pulo_alerts_delivered_total',
  ALERT_FAILURES: 'pulo_alert_failures_total',
  DIRECT_CAST_ATTEMPTS: 'pulo_direct_cast_attempts_total',
  MINI_APP_NOTIFICATIONS: 'pulo_mini_app_notifications_total',

  // Safety/Plan
  SAFETY_BLOCKS: 'pulo_safety_blocks_total',
  PLAN_LIMIT_BLOCKS: 'pulo_plan_limit_blocks_total',

  // Publish
  PUBLISH_SUCCESS: 'pulo_publish_success_total',
  PUBLISH_FAILURE: 'pulo_publish_failure_total',

  // Queue
  QUEUE_DEPTH: 'pulo_queue_depth',
  QUEUE_PENDING_JOBS: 'pulo_queue_pending_jobs',
  QUEUE_RUNNING_JOBS: 'pulo_queue_running_jobs',

  // System
  SYSTEM_MEMORY_USAGE_BYTES: 'pulo_system_memory_usage_bytes',
  SYSTEM_CPU_USAGE: 'pulo_system_cpu_usage_percent',
} as const;

// ─── In-Memory Metrics Store ───────────────────────────────────────────────────

interface CounterMetric {
  type: 'counter';
  value: number;
  labels: Record<string, string>;
}

interface HistogramMetric {
  type: 'histogram';
  count: number;
  sum: number;
  buckets: Map<number, number>; // bucket boundary -> count
  labels: Record<string, string>;
}

interface GaugeMetric {
  type: 'gauge';
  value: number;
  labels: Record<string, string>;
}

type Metric = CounterMetric | HistogramMetric | GaugeMetric;

class MetricsStore {
  private metrics = new Map<string, Metric>();
  private startTime = Date.now();

  // Counter operations
  increment(name: string, labels: Record<string, string> = {}, value = 1): void {
    const key = this.makeKey(name, labels);
    const existing = this.metrics.get(key);

    if (!existing || existing.type !== 'counter') {
      this.metrics.set(key, { type: 'counter', value, labels });
    } else {
      existing.value += value;
    }
  }

  // Histogram operations
  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.makeKey(name, labels);
    const existing = this.metrics.get(key);

    if (!existing || existing.type !== 'histogram') {
      const buckets = new Map<number, number>();
      // Standard histogram buckets: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10
      const boundaries = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
      boundaries.forEach(b => buckets.set(b, 0));

      this.metrics.set(key, { type: 'histogram', count: 1, sum: value, buckets, labels });
    } else {
      existing.count++;
      existing.sum += value;
      // Update buckets
      existing.buckets.forEach((count, boundary) => {
        if (value <= boundary) {
          existing.buckets.set(boundary, count + 1);
        }
      });
    }
  }

  // Gauge operations
  set(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.makeKey(name, labels);
    this.metrics.set(key, { type: 'gauge', value, labels });
  }

  // Get metric value
  get(name: string, labels: Record<string, string> = {}): number {
    const key = this.makeKey(name, labels);
    const metric = this.metrics.get(key);

    if (!metric) return 0;

    switch (metric.type) {
      case 'counter':
        return metric.value;
      case 'histogram':
        return metric.count;
      case 'gauge':
        return metric.value;
    }
  }

  // Generate Prometheus-compatible output
  toPrometheusFormat(): string {
    const lines: string[] = [];

    for (const [key, metric] of this.metrics.entries()) {
      const [name, labelStr] = key.split('{');
      const labels = labelStr ? `{${labelStr}` : '';

      switch (metric.type) {
        case 'counter':
          lines.push(`# TYPE ${name} counter`);
          lines.push(`${name}${labels} ${metric.value}`);
          break;
        case 'histogram':
          lines.push(`# TYPE ${name} histogram`);
          lines.push(`${name}_count${labels} ${metric.count}`);
          lines.push(`${name}_sum${labels} ${metric.sum}`);
          metric.buckets.forEach((count, boundary) => {
            lines.push(`${name}_bucket${labels.slice(0, -1)},le="${boundary}"} ${count}`);
          });
          lines.push(`${name}_bucket${labels.slice(0, -1)},le="+Inf"} ${metric.count}`);
          break;
        case 'gauge':
          lines.push(`# TYPE ${name} gauge`);
          lines.push(`${name}${labels} ${metric.value}`);
          break;
      }
    }

    // Add process metrics
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    lines.push(`# TYPE pulo_uptime_seconds gauge`);
    lines.push(`pulo_uptime_seconds ${uptime}`);

    return lines.join('\n');
  }

  // Get snapshot for JSON response
  toSnapshot(): MetricsSnapshot {
    const metrics: MetricValue[] = [];

    for (const [key, metric] of this.metrics.entries()) {
      const [nameOrFull, labelStr] = key.split('{');
      const name = nameOrFull ?? '';
      const labels = labelStr ? JSON.parse(`{${labelStr}`) : {};

      switch (metric.type) {
        case 'counter':
          metrics.push({
            name,
            type: 'counter',
            value: metric.value,
            labels,
            timestamp: new Date().toISOString(),
          });
          break;
        case 'histogram':
          metrics.push({
            name,
            type: 'histogram',
            value: metric.count,
            labels,
            timestamp: new Date().toISOString(),
          });
          break;
        case 'gauge':
          metrics.push({
            name,
            type: 'gauge',
            value: metric.value,
            labels,
            timestamp: new Date().toISOString(),
          });
          break;
      }
    }

    return {
      metrics,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  // Reset all metrics (for testing)
  reset(): void {
    this.metrics.clear();
    this.startTime = Date.now();
  }

  private makeKey(name: string, labels: Record<string, string>): string {
    const sortedLabels = Object.keys(labels)
      .sort()
      .map(k => `"${k}":"${labels[k]}"`)
      .join(',');
    return sortedLabels ? `${name}{${sortedLabels}}` : name;
  }
}

// Singleton instance
let _metricsStore: MetricsStore | null = null;

export function getMetricsStore(): MetricsStore {
  if (!_metricsStore) {
    _metricsStore = new MetricsStore();
  }
  return _metricsStore;
}

export function resetMetricsStore(): void {
  _metricsStore = null;
}

// ─── Convenience Functions ─────────────────────────────────────────────────────

export function incrementCounter(name: string, labels?: Record<string, string>, value = 1): void {
  getMetricsStore().increment(name, labels, value);
}

export function recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
  getMetricsStore().observe(name, value, labels);
}

export function setGauge(name: string, value: number, labels?: Record<string, string>): void {
  getMetricsStore().set(name, value, labels);
}

// ─── Specific Metric Functions ─────────────────────────────────────────────────

export function recordWebhookReceived(channel: string): void {
  incrementCounter(METRIC_NAMES.WEBHOOK_EVENTS_RECEIVED, { channel });
}

export function recordEventProcessed(type: string, success: boolean): void {
  incrementCounter(METRIC_NAMES.EVENTS_PROCESSED, { type, success: String(success) });
  if (!success) {
    incrementCounter(METRIC_NAMES.EVENTS_PROCESSED, { type, success: 'false' });
  }
}

export function recordAgentRun(agentType: string, status: string, durationMs?: number): void {
  incrementCounter(METRIC_NAMES.AGENT_RUNS_TOTAL, { agent_type: agentType, status });
  if (durationMs !== undefined) {
    recordHistogram(METRIC_NAMES.AGENT_RUNS_DURATION_MS, durationMs, { agent_type: agentType });
  }
}

export function recordLLMUsage(tokens: number, costUsd: number, model: string): void {
  incrementCounter(METRIC_NAMES.LLM_TOKENS_USED, { model }, tokens);
  incrementCounter(METRIC_NAMES.LLM_COST_ESTIMATE_USD, { model }, costUsd);
  incrementCounter(METRIC_NAMES.LLM_REQUESTS_TOTAL, { model });
}

export function recordTruthCheck(verdict: string): void {
  incrementCounter(METRIC_NAMES.TRUTH_CHECKS_TOTAL);
  incrementCounter(METRIC_NAMES.TRUTH_CHECKS_BY_VERDICT, { verdict });
}

export function recordRadarTrendDetected(category: string): void {
  incrementCounter(METRIC_NAMES.RADAR_TRENDS_DETECTED, { category });
}

export function recordAlertDelivered(channel: string): void {
  incrementCounter(METRIC_NAMES.ALERTS_DELIVERED, { channel });
}

export function recordAlertFailure(channel: string, reason: string): void {
  incrementCounter(METRIC_NAMES.ALERT_FAILURES, { channel, reason });
}

export function recordSafetyBlock(reason: string): void {
  incrementCounter(METRIC_NAMES.SAFETY_BLOCKS, { reason });
}

export function recordPlanLimitBlock(limitType: string): void {
  incrementCounter(METRIC_NAMES.PLAN_LIMIT_BLOCKS, { limit_type: limitType });
}

export function recordPublish(success: boolean): void {
  if (success) {
    incrementCounter(METRIC_NAMES.PUBLISH_SUCCESS);
  } else {
    incrementCounter(METRIC_NAMES.PUBLISH_FAILURE);
  }
}

export function recordDirectCastAttempt(success: boolean): void {
  incrementCounter(METRIC_NAMES.DIRECT_CAST_ATTEMPTS, { success: String(success) });
}

export function recordMiniAppNotification(success: boolean): void {
  incrementCounter(METRIC_NAMES.MINI_APP_NOTIFICATIONS, { success: String(success) });
}

export function updateQueueDepth(pending: number, running: number): void {
  setGauge(METRIC_NAMES.QUEUE_DEPTH, pending + running);
  setGauge(METRIC_NAMES.QUEUE_PENDING_JOBS, pending);
  setGauge(METRIC_NAMES.QUEUE_RUNNING_JOBS, running);
}