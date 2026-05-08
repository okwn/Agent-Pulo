// Observability routes — GET /metrics, GET /health/deep

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getMetricsStore,
  incrementCounter,
  METRIC_NAMES,
  getAuditStore,
  type AuditEvent,
} from '@pulo/observability';

const logger = console;

export async function observabilityRoutes(app: FastifyInstance) {

  // GET /metrics - Prometheus-compatible metrics endpoint
  app.get('/metrics', async (req: FastifyRequest, reply: FastifyReply) => {
    // Add request metric
    incrementCounter('pulo_http_requests_total', {
      method: req.method,
      path: req.url,
      status: '200',
    });

    const store = getMetricsStore();
    const format = req.query['format'] as string || 'prometheus';

    if (format === 'json') {
      return reply.header('Content-Type', 'application/json').send(store.toSnapshot());
    }

    // Default: Prometheus format
    const prometheusOutput = store.toPrometheusFormat();
    return reply
      .header('Content-Type', 'text/plain; version=0.0.4')
      .send(prometheusOutput);
  });

  // GET /health/deep - Deep health check with component status
  app.get('/health/deep', async (req: FastifyRequest, reply: FastifyReply) => {
    const checks = await performHealthChecks();
    const allHealthy = checks.every(c => c.status === 'ok');

    const response = {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks,
      metrics: getMetricsStore().toSnapshot(),
    };

    return reply.status(allHealthy ? 200 : 503).send(response);
  });

  // GET /health/audit - Recent audit events (admin)
  app.get('/health/audit', async (req: FastifyRequest, reply: FastifyReply) => {
    const auditStore = getAuditStore();
    const limit = parseInt(req.query['limit'] as string || '100', 10);

    const events = await auditStore.recent(limit);

    return {
      events,
      total: await auditStore.count(),
    };
  });
}

interface HealthCheck {
  component: string;
  status: 'ok' | 'error' | 'degraded';
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

async function performHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const start = Date.now();

  // API check (self)
  try {
    const apiLatency = Date.now() - start;
    checks.push({
      component: 'api',
      status: 'ok',
      latencyMs: apiLatency,
      details: {
        version: '0.1.0',
        nodeVersion: process.version,
      },
    });
  } catch (e) {
    checks.push({
      component: 'api',
      status: 'error',
      message: String(e),
    });
  }

  // Database check (mock for now)
  try {
    const dbStart = Date.now();
    // Simulated DB check - replace with actual DB ping
    const dbLatency = Date.now() - dbStart;
    checks.push({
      component: 'database',
      status: 'ok',
      latencyMs: dbLatency,
      details: {
        type: 'postgres',
        poolSize: 10,
        availableConnections: 8,
      },
    });
  } catch (e) {
    checks.push({
      component: 'database',
      status: 'error',
      message: String(e),
    });
  }

  // Redis check (mock for now)
  try {
    const redisStart = Date.now();
    // Simulated Redis check - replace with actual Redis ping
    const redisLatency = Date.now() - redisStart;
    checks.push({
      component: 'redis',
      status: 'ok',
      latencyMs: redisLatency,
      details: {
        memoryUsedMb: 67,
        connectedClients: 8,
      },
    });
  } catch (e) {
    checks.push({
      component: 'redis',
      status: 'error',
      message: String(e),
    });
  }

  // Far caster check (mock for now)
  try {
    checks.push({
      component: 'farcaster',
      status: 'ok',
      details: {
        rateLimitRemaining: 145,
        mode: process.env.PULO_FARCASTER_MODE ?? 'mock',
      },
    });
  } catch (e) {
    checks.push({
      component: 'farcaster',
      status: 'error',
      message: String(e),
    });
  }

  // LLM check (mock for now)
  try {
    checks.push({
      component: 'llm',
      status: 'ok',
      details: {
        quotaRemaining: 8500,
        model: 'gpt-4o-mini',
      },
    });
  } catch (e) {
    checks.push({
      component: 'llm',
      status: 'error',
      message: String(e),
    });
  }

  // Queue check
  try {
    const metricsStore = getMetricsStore();
    const pendingJobs = metricsStore.get(METRIC_NAMES.QUEUE_PENDING_JOBS);
    const runningJobs = metricsStore.get(METRIC_NAMES.QUEUE_RUNNING_JOBS);

    checks.push({
      component: 'queue',
      status: 'ok',
      details: {
        pendingJobs,
        runningJobs,
        queueDepth: (pendingJobs as number) + (runningJobs as number),
      },
    });
  } catch (e) {
    checks.push({
      component: 'queue',
      status: 'error',
      message: String(e),
    });
  }

  // System resources
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  checks.push({
    component: 'system',
    status: 'ok',
    details: {
      memoryUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
      memoryTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
      cpuUserMs: cpuUsage.user,
      cpuSystemMs: cpuUsage.system,
      pid: process.pid,
    },
  });

  return checks;
}