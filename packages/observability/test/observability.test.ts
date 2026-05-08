import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getMetricsStore,
  resetMetricsStore,
  incrementCounter,
  recordHistogram,
  setGauge,
  METRIC_NAMES,
  recordAgentRun,
  recordLLMUsage,
  recordTruthCheck,
  recordAlertDelivered,
  recordSafetyBlock,
  recordPublish,
} from '../src/metrics.js';
import { getAuditStore, resetAuditStore, logAuditEvent, logErrorRetry } from '../src/audit.js';
import {
  generateRequestId,
  generateCorrelationId,
  generateJobId,
  generateAgentRunId,
  createRequestContext,
  getRequestIdFromHeaders,
  resetSpanTracker,
} from '../src/tracing.js';

describe('Metrics', () => {
  beforeEach(() => {
    resetMetricsStore();
  });

  it('increments counter', () => {
    incrementCounter('test_counter');
    incrementCounter('test_counter');
    incrementCounter('test_counter', { label: 'value' }, 5);

    const store = getMetricsStore();
    expect(store.get('test_counter')).toBe(2);
    expect(store.get('test_counter', { label: 'value' })).toBe(5);
  });

  it('records histogram', () => {
    recordHistogram('test_histogram', 100);
    recordHistogram('test_histogram', 200);
    recordHistogram('test_histogram', 300);

    const store = getMetricsStore();
    expect(store.get('test_histogram')).toBe(3);
  });

  it('sets gauge', () => {
    setGauge('test_gauge', 42);
    setGauge('test_gauge', 100);

    const store = getMetricsStore();
    expect(store.get('test_gauge')).toBe(100);
  });

  it('generates Prometheus format', () => {
    incrementCounter('pulo_test_total');
    const store = getMetricsStore();
    const prometheus = store.toPrometheusFormat();

    expect(prometheus).toContain('# TYPE pulo_test_total counter');
    expect(prometheus).toContain('pulo_test_total 1');
  });

  it('generates JSON snapshot', () => {
    incrementCounter('pulo_json_test');
    const store = getMetricsStore();
    const snapshot = store.toSnapshot();

    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot).toHaveProperty('uptime');
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot.metrics.length).toBeGreaterThan(0);
  });

  it('records agent run metrics', () => {
    recordAgentRun('truth', 'completed', 1500);

    const store = getMetricsStore();
    expect(store.get(METRIC_NAMES.AGENT_RUNS_TOTAL, { agent_type: 'truth', status: 'completed' })).toBe(1);
    expect(store.get(METRIC_NAMES.AGENT_RUNS_DURATION_MS, { agent_type: 'truth' })).toBe(1);
  });

  it('records LLM usage', () => {
    recordLLMUsage(1000, 0.02, 'gpt-4o-mini');

    const store = getMetricsStore();
    expect(store.get(METRIC_NAMES.LLM_TOKENS_USED, { model: 'gpt-4o-mini' })).toBe(1000);
    expect(store.get(METRIC_NAMES.LLM_COST_ESTIMATE_USD, { model: 'gpt-4o-mini' })).toBe(0.02);
    expect(store.get(METRIC_NAMES.LLM_REQUESTS_TOTAL, { model: 'gpt-4o-mini' })).toBe(1);
  });

  it('records truth check by verdict', () => {
    recordTruthCheck('true');
    recordTruthCheck('true');
    recordTruthCheck('false');

    const store = getMetricsStore();
    expect(store.get(METRIC_NAMES.TRUTH_CHECKS_TOTAL)).toBe(3);
    expect(store.get(METRIC_NAMES.TRUTH_CHECKS_BY_VERDICT, { verdict: 'true' })).toBe(2);
    expect(store.get(METRIC_NAMES.TRUTH_CHECKS_BY_VERDICT, { verdict: 'false' })).toBe(1);
  });

  it('records alert delivery', () => {
    recordAlertDelivered('miniapp');
    recordAlertDelivered('direct_cast');
    recordAlertDelivered('miniapp');

    const store = getMetricsStore();
    expect(store.get(METRIC_NAMES.ALERTS_DELIVERED, { channel: 'miniapp' })).toBe(2);
    expect(store.get(METRIC_NAMES.ALERTS_DELIVERED, { channel: 'direct_cast' })).toBe(1);
  });

  it('records safety blocks', () => {
    recordSafetyBlock('spam');
    recordSafetyBlock('misinformation');
    recordSafetyBlock('spam');

    const store = getMetricsStore();
    expect(store.get(METRIC_NAMES.SAFETY_BLOCKS, { reason: 'spam' })).toBe(2);
    expect(store.get(METRIC_NAMES.SAFETY_BLOCKS, { reason: 'misinformation' })).toBe(1);
  });

  it('records publish success/failure', () => {
    recordPublish(true);
    recordPublish(true);
    recordPublish(false);

    const store = getMetricsStore();
    expect(store.get(METRIC_NAMES.PUBLISH_SUCCESS)).toBe(2);
    expect(store.get(METRIC_NAMES.PUBLISH_FAILURE)).toBe(1);
  });
});

describe('Audit', () => {
  beforeEach(() => {
    resetAuditStore();
  });

  it('logs audit event', async () => {
    const id = await logAuditEvent({
      action: 'ERROR_RETRY',
      actorFid: 123,
      targetType: 'error',
      targetId: 'err_123',
    });

    expect(id).toMatch(/^audit_/);

    const store = getAuditStore();
    const events = await store.recent();
    expect(events.length).toBe(1);
    expect(events[0].action).toBe('ERROR_RETRY');
    expect(events[0].actorFid).toBe(123);
  });

  it('logs error retry with helper', async () => {
    await logErrorRetry({
      actorFid: 123,
      errorId: 'err_456',
      errorCode: 'LLM_TIMEOUT',
      correlationId: 'corr_123',
    });

    const store = getAuditStore();
    const events = await store.recent(1);
    expect(events[0].action).toBe('ERROR_RETRY');
    expect(events[0].targetId).toBe('err_456');
    expect(events[0].metadata?.errorCode).toBe('LLM_TIMEOUT');
  });

  it('filters audit events by action', async () => {
    await logAuditEvent({ action: 'ERROR_RETRY', actorFid: 123 });
    await logAuditEvent({ action: 'JOB_RETRY', actorFid: 123 });
    await logAuditEvent({ action: 'PLAN_CHANGE', actorFid: 123 });

    const store = getAuditStore();
    const onlyErrors = await store.findAll({ action: 'ERROR_RETRY' });
    expect(onlyErrors.length).toBe(1);
    expect(onlyErrors[0].action).toBe('ERROR_RETRY');
  });

  it('filters audit events by actor', async () => {
    await logAuditEvent({ action: 'ERROR_RETRY', actorFid: 123 });
    await logAuditEvent({ action: 'JOB_RETRY', actorFid: 456 });

    const store = getAuditStore();
    const actor123 = await store.findAll({ actorFid: 123 });
    expect(actor123.length).toBe(1);
  });

  it('counts audit events', async () => {
    await logAuditEvent({ action: 'ERROR_RETRY', actorFid: 123 });
    await logAuditEvent({ action: 'JOB_RETRY', actorFid: 123 });
    await logAuditEvent({ action: 'PLAN_CHANGE', actorFid: 123 });

    const store = getAuditStore();
    expect(await store.count()).toBe(3);
    expect(await store.count({ action: 'ERROR_RETRY' })).toBe(1);
  });
});

describe('Tracing', () => {
  afterEach(() => {
    resetSpanTracker();
  });

  it('generates unique request IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();

    expect(id1).toMatch(/^req_/);
    expect(id2).toMatch(/^req_/);
    expect(id1).not.toBe(id2);
  });

  it('generates unique correlation IDs', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();

    expect(id1).toMatch(/^corr_/);
    expect(id2).toMatch(/^corr_/);
    expect(id1).not.toBe(id2);
  });

  it('generates unique job IDs', () => {
    const id1 = generateJobId();
    const id2 = generateJobId();

    expect(id1).toMatch(/^job_/);
    expect(id2).toMatch(/^job_/);
    expect(id1).not.toBe(id2);
  });

  it('generates unique agent run IDs', () => {
    const id1 = generateAgentRunId();
    const id2 = generateAgentRunId();

    expect(id1).toMatch(/^run_/);
    expect(id2).toMatch(/^run_/);
    expect(id1).not.toBe(id2);
  });

  it('creates request context from headers', () => {
    const headers = {
      'x-request-id': 'req_existing_123',
    };

    const context = createRequestContext(headers);

    expect(context.requestId).toBe('req_existing_123');
    expect(context.correlationId).toMatch(/^corr_/);
    expect(context.traceId).toMatch(/^corr_/);
  });

  it('extracts request ID from headers', () => {
    const headers1 = { 'x-request-id': 'req_123' };
    const headers2 = { 'x-correlation-id': 'corr_456' };
    const headers3 = { 'x-trace-id': 'trace_789' };
    const headers4 = {};

    expect(getRequestIdFromHeaders(headers1)).toBe('req_123');
    expect(getRequestIdFromHeaders(headers2)).toBe('corr_456');
    expect(getRequestIdFromHeaders(headers3)).toBe('trace_789');
    expect(getRequestIdFromHeaders(headers4)).toBeUndefined();
  });

  it('handles array header values', () => {
    const headers = {
      'x-request-id': ['req_array_123'],
    };

    const id = getRequestIdFromHeaders(headers);
    expect(id).toBe('req_array_123');
  });
});

describe('Metrics Snapshot', () => {
  beforeEach(() => {
    resetMetricsStore();
  });

  it('includes uptime in snapshot', () => {
    const store = getMetricsStore();
    const snapshot = store.toSnapshot();

    expect(snapshot.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof snapshot.uptime).toBe('number');
  });

  it('includes timestamp in snapshot', () => {
    const store = getMetricsStore();
    const snapshot = store.toSnapshot();

    expect(snapshot.timestamp).toBeTruthy();
    expect(new Date(snapshot.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('includes all metric types', () => {
    const store = getMetricsStore();

    incrementCounter('test_counter');
    recordHistogram('test_histogram', 100);
    setGauge('test_gauge', 50);

    const snapshot = store.toSnapshot();

    const counter = snapshot.metrics.find(m => m.name === 'test_counter');
    const histogram = snapshot.metrics.find(m => m.name === 'test_histogram');
    const gauge = snapshot.metrics.find(m => m.name === 'test_gauge');

    expect(counter?.type).toBe('counter');
    expect(histogram?.type).toBe('histogram');
    expect(gauge?.type).toBe('gauge');
  });
});