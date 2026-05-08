// tracing.ts - Request tracing and correlation

import { randomUUID } from 'crypto';

export type TraceId = string;
export type SpanId = string;

export interface TraceContext {
  traceId: TraceId;
  spanId: SpanId;
  parentSpanId?: SpanId;
  samplingDecision?: 'include' | 'exclude';
}

export interface Span {
  id: SpanId;
  name: string;
  traceId: TraceId;
  parentSpanId?: SpanId;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
  status: 'ok' | 'error';
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

// Request ID / Correlation ID helpers
export function generateRequestId(): string {
  return `req_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${randomUUID().slice(0, 10)}`;
}

export function generateJobId(): string {
  return `job_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

export function generateAgentRunId(): string {
  return `run_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

// Simple span tracker
class SpanTracker {
  private spans = new Map<SpanId, Span>();

  startSpan(name: string, traceId?: TraceId, parentSpanId?: SpanId): Span {
    const spanId = `span_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const span: Span = {
      id: spanId,
      name,
      traceId: traceId || generateCorrelationId(),
      parentSpanId,
      startTime: Date.now(),
      attributes: {},
      events: [],
      status: 'ok',
    };

    this.spans.set(spanId, span);
    return span;
  }

  endSpan(spanId: SpanId, status: 'ok' | 'error' = 'ok'): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
  }

  addSpanEvent(spanId: SpanId, name: string, attributes?: Record<string, unknown>): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  setSpanAttribute(spanId: SpanId, key: string, value: unknown): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.attributes[key] = value;
  }

  getSpan(spanId: SpanId): Span | undefined {
    return this.spans.get(spanId);
  }

  getTraceSpans(traceId: TraceId): Span[] {
    return Array.from(this.spans.values()).filter(s => s.traceId === traceId);
  }

  clear(): void {
    this.spans.clear();
  }
}

// Singleton
let _spanTracker: SpanTracker | null = null;

export function getSpanTracker(): SpanTracker {
  if (!_spanTracker) {
    _spanTracker = new SpanTracker();
  }
  return _spanTracker;
}

export function resetSpanTracker(): void {
  _spanTracker = null;
}

// ─── Request Context ──────────────────────────────────────────────────────────

export interface RequestContext {
  requestId: string;
  correlationId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  timestamp: number;
  method?: string;
  path?: string;
  userFid?: number;
}

const requestContext = new Map<string, RequestContext>();

export function setRequestContext(requestId: string, context: RequestContext): void {
  requestContext.set(requestId, context);
}

export function getRequestContext(requestId: string): RequestContext | undefined {
  return requestContext.get(requestId);
}

export function clearRequestContext(requestId: string): void {
  requestContext.delete(requestId);
}

// Helper to extract request ID from headers
export function getRequestIdFromHeaders(headers: Record<string, string | string[] | undefined>): string | undefined {
  const id = headers['x-request-id'] || headers['x-correlation-id'] || headers['x-trace-id'];
  if (Array.isArray(id)) return id[0];
  return id as string | undefined;
}

// Helper to create context for new request
export function createRequestContext(headers: Record<string, string | string[] | undefined>): RequestContext {
  const existingId = getRequestIdFromHeaders(headers);
  const requestId = existingId || generateRequestId();
  const correlationId = generateCorrelationId();
  const traceId = generateCorrelationId();
  const spanId = generateRequestId();

  const context: RequestContext = {
    requestId,
    correlationId,
    traceId,
    spanId,
    timestamp: Date.now(),
  };

  setRequestContext(requestId, context);
  return context;
}