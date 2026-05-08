// audit.ts - Audit logging for admin actions

import { log as parentLog } from './index.js';

function getAuditLog() {
  return parentLog.child({ component: 'audit' });
}

export type AuditAction =
  | 'ERROR_RETRY'
  | 'JOB_RETRY'
  | 'JOB_CANCEL'
  | 'PLAN_CHANGE'
  | 'TRUTH_CHECK_APPROVE'
  | 'TREND_APPROVE'
  | 'SAFETY_FLAG_RESOLVE'
  | 'USER_CREATE'
  | 'USER_DELETE'
  | 'SETTINGS_CHANGE'
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT';

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: AuditAction;
  actorFid: number;
  actorType: 'admin' | 'system';
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  ipAddress?: string;
}

interface AuditFilter {
  action?: AuditAction;
  actorFid?: number;
  fromDate?: Date;
  toDate?: Date;
}

// In-memory audit store
class AuditStore {
  private events: AuditEvent[] = [];
  private maxEvents = 10000;

  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<string> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fullEvent: AuditEvent = {
      ...event,
      id,
      timestamp: new Date().toISOString(),
    };

    this.events.push(fullEvent);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to structured logger
    getAuditLog().info({
      auditId: id,
      action: event.action,
      actorFid: event.actorFid,
      actorType: event.actorType,
      targetType: event.targetType,
      targetId: event.targetId,
      correlationId: event.correlationId,
    }, `Audit event: ${event.action}`);

    return id;
  }

  async findAll(filter?: AuditFilter): Promise<AuditEvent[]> {
    let results = [...this.events];

    if (filter) {
      if (filter.action) {
        results = results.filter(e => e.action === filter.action);
      }
      if (filter.actorFid) {
        results = results.filter(e => e.actorFid === filter.actorFid);
      }
      if (filter.fromDate) {
        results = results.filter(e => new Date(e.timestamp) >= filter.fromDate!);
      }
      if (filter.toDate) {
        results = results.filter(e => new Date(e.timestamp) <= filter.toDate!);
      }
    }

    return results.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async findById(id: string): Promise<AuditEvent | null> {
    return this.events.find(e => e.id === id) || null;
  }

  async count(filter?: AuditFilter): Promise<number> {
    const all = await this.findAll(filter);
    return all.length;
  }

  // Get recent audit events
  async recent(limit = 100): Promise<AuditEvent[]> {
    return this.events.slice(-limit).reverse();
  }

  // Clear all events (for testing)
  clear(): void {
    this.events = [];
  }
}

// Singleton instance
let _auditStore: AuditStore | null = null;

export function getAuditStore(): AuditStore {
  if (!_auditStore) {
    _auditStore = new AuditStore();
  }
  return _auditStore;
}

export function resetAuditStore(): void {
  _auditStore = null;
}

// ─── Convenience Functions ─────────────────────────────────────────────────────

export async function logAuditEvent(params: {
  action: AuditAction;
  actorFid: number;
  actorType?: 'admin' | 'system';
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  ipAddress?: string;
}): Promise<string> {
  return getAuditStore().log({
    action: params.action,
    actorFid: params.actorFid,
    actorType: params.actorType ?? 'admin',
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata,
    correlationId: params.correlationId,
    ipAddress: params.ipAddress,
  });
}

// ─── Pre-defined Audit Log Functions ───────────────────────────────────────────

export async function logErrorRetry(params: {
  actorFid: number;
  errorId: string;
  errorCode: string;
  correlationId?: string;
}): Promise<string> {
  return logAuditEvent({
    action: 'ERROR_RETRY',
    actorFid: params.actorFid,
    targetType: 'error',
    targetId: params.errorId,
    metadata: { errorCode: params.errorCode },
    correlationId: params.correlationId,
  });
}

export async function logJobRetry(params: {
  actorFid: number;
  jobId: string;
  jobType: string;
  correlationId?: string;
}): Promise<string> {
  return logAuditEvent({
    action: 'JOB_RETRY',
    actorFid: params.actorFid,
    targetType: 'job',
    targetId: params.jobId,
    metadata: { jobType: params.jobType },
    correlationId: params.correlationId,
  });
}

export async function logPlanChange(params: {
  actorFid: number;
  targetFid: number;
  oldPlan: string;
  newPlan: string;
  correlationId?: string;
}): Promise<string> {
  return logAuditEvent({
    action: 'PLAN_CHANGE',
    actorFid: params.actorFid,
    targetType: 'user',
    targetId: String(params.targetFid),
    metadata: {
      oldPlan: params.oldPlan,
      newPlan: params.newPlan,
    },
    correlationId: params.correlationId,
  });
}

export async function logTruthCheckApprove(params: {
  actorFid: number;
  truthCheckId: string;
  verdict: string;
}): Promise<string> {
  return logAuditEvent({
    action: 'TRUTH_CHECK_APPROVE',
    actorFid: params.actorFid,
    targetType: 'truth_check',
    targetId: params.truthCheckId,
    metadata: { verdict: params.verdict },
  });
}

export async function logTrendApprove(params: {
  actorFid: number;
  trendId: string;
  trendTitle: string;
}): Promise<string> {
  return logAuditEvent({
    action: 'TREND_APPROVE',
    actorFid: params.actorFid,
    targetType: 'trend',
    targetId: params.trendId,
    metadata: { trendTitle: params.trendTitle },
  });
}

export async function logSafetyFlagResolve(params: {
  actorFid: number;
  flagId: string;
  resolution: string;
}): Promise<string> {
  return logAuditEvent({
    action: 'SAFETY_FLAG_RESOLVE',
    actorFid: params.actorFid,
    targetType: 'safety_flag',
    targetId: params.flagId,
    metadata: { resolution: params.resolution },
  });
}