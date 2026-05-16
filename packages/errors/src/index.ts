// @pulo/errors — Error taxonomy, AppError, retry queue, dead-letter queue

import { z } from 'zod';

// ─── Error Codes ──────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Far caster errors (1xxx)
  FARCASTER_WEBHOOK_INVALID: 'FARCASTER_WEBHOOK_INVALID',
  FARCASTER_CAST_FETCH_FAILED: 'FARCASTER_CAST_FETCH_FAILED',
  FARCASTER_PUBLISH_FAILED: 'FARCASTER_PUBLISH_FAILED',
  FARCASTER_RATE_LIMITED: 'FARCASTER_RATE_LIMITED',

  // LLM errors (2xxx)
  LLM_TIMEOUT: 'LLM_TIMEOUT',
  LLM_INVALID_JSON: 'LLM_INVALID_JSON',
  LLM_BUDGET_EXCEEDED: 'LLM_BUDGET_EXCEEDED',

  // Safety/Plan errors (3xxx)
  SAFETY_BLOCKED: 'SAFETY_BLOCKED',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  DUPLICATE_EVENT: 'DUPLICATE_EVENT',

  // Alert/Notification errors (4xxx)
  ALERT_CONSENT_MISSING: 'ALERT_CONSENT_MISSING',
  DIRECT_CAST_FAILED: 'DIRECT_CAST_FAILED',

  // Infrastructure errors (5xxx)
  DB_ERROR: 'DB_ERROR',
  REDIS_ERROR: 'REDIS_ERROR',

  // Catch-all
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ─── Error Category ────────────────────────────────────────────────────────────

export const ERROR_CATEGORIES = {
  FARCASTER: 'FARCASTER',
  LLM: 'LLM',
  SAFETY: 'SAFETY',
  PLAN: 'PLAN',
  ALERT: 'ALERT',
  INFRA: 'INFRA',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCategory = typeof ERROR_CATEGORIES[keyof typeof ERROR_CATEGORIES];

// ─── Retry Strategy ────────────────────────────────────────────────────────────

export type RetryStrategy = 'exponential' | 'linear' | 'fixed';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  strategy: RetryStrategy;
  retryable: boolean;
}

export const RETRY_CONFIGS: Record<ErrorCode, RetryConfig> = {
  // Far caster - retry with backoff
  FARCASTER_WEBHOOK_INVALID: { maxAttempts: 2, baseDelayMs: 1000, maxDelayMs: 5000, strategy: 'exponential', retryable: false },
  FARCASTER_CAST_FETCH_FAILED: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000, strategy: 'exponential', retryable: true },
  FARCASTER_PUBLISH_FAILED: { maxAttempts: 3, baseDelayMs: 2000, maxDelayMs: 15000, strategy: 'exponential', retryable: true },
  FARCASTER_RATE_LIMITED: { maxAttempts: 5, baseDelayMs: 5000, maxDelayMs: 60000, strategy: 'exponential', retryable: true },

  // LLM - retry with budget check
  LLM_TIMEOUT: { maxAttempts: 2, baseDelayMs: 3000, maxDelayMs: 15000, strategy: 'exponential', retryable: true },
  LLM_INVALID_JSON: { maxAttempts: 1, baseDelayMs: 1000, maxDelayMs: 2000, strategy: 'fixed', retryable: false },
  LLM_BUDGET_EXCEEDED: { maxAttempts: 0, baseDelayMs: 0, maxDelayMs: 0, strategy: 'fixed', retryable: false },

  // Safety/Plan - never retry
  SAFETY_BLOCKED: { maxAttempts: 0, baseDelayMs: 0, maxDelayMs: 0, strategy: 'fixed', retryable: false },
  PLAN_LIMIT_EXCEEDED: { maxAttempts: 0, baseDelayMs: 0, maxDelayMs: 0, strategy: 'fixed', retryable: false },
  DUPLICATE_EVENT: { maxAttempts: 0, baseDelayMs: 0, maxDelayMs: 0, strategy: 'fixed', retryable: false },

  // Alert/Notification
  ALERT_CONSENT_MISSING: { maxAttempts: 0, baseDelayMs: 0, maxDelayMs: 0, strategy: 'fixed', retryable: false },
  DIRECT_CAST_FAILED: { maxAttempts: 3, baseDelayMs: 2000, maxDelayMs: 20000, strategy: 'exponential', retryable: true },

  // Infrastructure
  DB_ERROR: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000, strategy: 'exponential', retryable: true },
  REDIS_ERROR: { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 5000, strategy: 'exponential', retryable: true },

  UNKNOWN_ERROR: { maxAttempts: 1, baseDelayMs: 1000, maxDelayMs: 3000, strategy: 'fixed', retryable: true },
};

// ─── AppError Class ────────────────────────────────────────────────────────────

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  cause?: unknown;
  retryable?: boolean;
  retryCount?: number;
  correlationId?: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
  stack?: string;
}

export class AppError extends Error {
  public override readonly name: string;
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly retryCount: number;
  public readonly correlationId: string;
  public readonly jobId: string | null;
  public readonly metadata: Record<string, unknown>;
  public readonly timestamp: Date;
  public override readonly cause: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });

    this.name = 'AppError';
    this.code = options.code;
    this.category = this.deriveCategory(options.code);
    this.retryable = options.retryable ?? RETRY_CONFIGS[options.code]?.retryable ?? true;
    this.retryCount = options.retryCount ?? 0;
    this.correlationId = options.correlationId ?? generateCorrelationId();
    this.jobId = options.jobId ?? null;
    this.metadata = options.metadata ?? {};
    this.timestamp = new Date();
    this.cause = options.cause;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  private deriveCategory(code: ErrorCode): ErrorCategory {
    if (code.startsWith('FARCASTER')) return 'FARCASTER';
    if (code.startsWith('LLM')) return 'LLM';
    if (code === 'SAFETY_BLOCKED') return 'SAFETY';
    if (code === 'PLAN_LIMIT_EXCEEDED') return 'PLAN';
    if (code.startsWith('ALERT') || code === 'DIRECT_CAST_FAILED') return 'ALERT';
    if (code === 'DB_ERROR' || code === 'REDIS_ERROR') return 'INFRA';
    return 'UNKNOWN';
  }

  /** Create a retryable version of this error */
  withRetry(retryCount: number, jobId?: string): AppError {
    return new AppError({
      code: this.code,
      message: this.message,
      cause: this.cause,
      retryable: this.retryable,
      retryCount,
      correlationId: this.correlationId,
      jobId: jobId ?? this.jobId ?? undefined,
      metadata: this.metadata,
    });
  }

  /** Create a non-retryable version of this error */
  toDeadLetter(jobId?: string): AppError {
    return new AppError({
      code: this.code,
      message: this.message,
      cause: this.cause,
      retryable: false,
      retryCount: this.retryCount,
      correlationId: this.correlationId,
      jobId: jobId ?? this.jobId ?? undefined,
      metadata: {
        ...this.metadata,
        deadLettered: true,
        deadLetteredAt: new Date().toISOString(),
      },
    });
  }

  /** Check if can be retried based on attempts */
  canRetry(): boolean {
    if (!this.retryable) return false;
    const config = RETRY_CONFIGS[this.code];
    return this.retryCount < config.maxAttempts;
  }

  /** Get time to wait before next retry in ms */
  getRetryDelay(): number {
    const config = RETRY_CONFIGS[this.code];
    if (!config || !this.retryable) return 0;

    const delay = Math.min(
      config.baseDelayMs * Math.pow(2, this.retryCount),
      config.maxDelayMs
    );

    if (config.strategy === 'linear') {
      return config.baseDelayMs * this.retryCount;
    }
    if (config.strategy === 'fixed') {
      return config.baseDelayMs;
    }
    return delay; // exponential
  }

  toJSON(): ErrorRecord {
    return {
      id: this.correlationId,
      code: this.code,
      category: this.category,
      message: this.message,
      retryable: this.retryable,
      retryCount: this.retryCount,
      correlationId: this.correlationId,
      jobId: this.jobId,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
      cause: this.cause instanceof Error ? this.cause.message : String(this.cause),
      status: this.retryable ? 'pending' : 'dead_lettered',
      lastRetryAt: null,
      nextRetryAt: this.retryable ? new Date(Date.now() + this.getRetryDelay()).toISOString() : null,
      resolvedAt: null,
    };
  }
}

// ─── Error Record (for storage) ────────────────────────────────────────────────

export interface ErrorRecord {
  id: string;
  code: ErrorCode;
  category: ErrorCategory;
  message: string;
  retryable: boolean;
  retryCount: number;
  correlationId: string;
  jobId: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
  cause: string;
  status: ErrorStatus;
  lastRetryAt: string | null;
  nextRetryAt: string | null;
  resolvedAt: string | null;
}

export type ErrorStatus = 'pending' | 'retrying' | 'resolved' | 'dead_lettered';

// ─── Error Service ─────────────────────────────────────────────────────────────

export interface ErrorStore {
  save(error: AppError): Promise<string>;
  findById(id: string): Promise<AppErrorRecord | null>;
  findAll(filter?: ErrorFilter): Promise<AppErrorRecord[]>;
  update(id: string, updates: Partial<AppErrorRecord>): Promise<AppErrorRecord | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: ErrorFilter): Promise<number>;
}

export interface AppErrorRecord extends ErrorRecord {
  // Additional fields from store
}

export interface ErrorFilter {
  code?: ErrorCode;
  category?: ErrorCategory;
  status?: ErrorStatus;
  retryable?: boolean;
  fromDate?: Date;
  toDate?: Date;
  correlationId?: string;
  jobId?: string;
}

// ─── In-Memory Error Store ─────────────────────────────────────────────────────

export class InMemoryErrorStore implements ErrorStore {
  private errors = new Map<string, AppErrorRecord>();
  private indices = new Map<string, Map<string, Set<string>>>();

  async save(error: AppError): Promise<string> {
    const record: AppErrorRecord = {
      ...error.toJSON(),
      status: error.retryable ? 'pending' : 'dead_lettered',
      lastRetryAt: null,
      nextRetryAt: error.retryable ? new Date(Date.now() + error.getRetryDelay()).toISOString() : null,
      resolvedAt: null,
    };

    this.errors.set(record.id, record);
    this.index(record);
    return record.id;
  }

  async findById(id: string): Promise<AppErrorRecord | null> {
    return this.errors.get(id) || null;
  }

  async findAll(filter?: ErrorFilter): Promise<AppErrorRecord[]> {
    let results = Array.from(this.errors.values());

    if (filter) {
      if (filter.code) {
        results = results.filter(e => e.code === filter.code);
      }
      if (filter.category) {
        results = results.filter(e => e.category === filter.category);
      }
      if (filter.status) {
        results = results.filter(e => e.status === filter.status);
      }
      if (filter.retryable !== undefined) {
        results = results.filter(e => e.retryable === filter.retryable);
      }
      if (filter.correlationId) {
        results = results.filter(e => e.correlationId === filter.correlationId);
      }
      if (filter.jobId) {
        results = results.filter(e => e.jobId === filter.jobId);
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

  async update(id: string, updates: Partial<AppErrorRecord>): Promise<AppErrorRecord | null> {
    const existing = this.errors.get(id);
    if (!existing) return null;

    const updated: AppErrorRecord = { ...existing, ...updates };
    this.errors.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.errors.delete(id);
  }

  async count(filter?: ErrorFilter): Promise<number> {
    const all = await this.findAll(filter);
    return all.length;
  }

  private index(record: AppErrorRecord): void {
    this.addToIndex('code', record.code, record.id);
    this.addToIndex('category', record.category, record.id);
    this.addToIndex('status', record.status, record.id);
    if (record.jobId) {
      this.addToIndex('jobId', record.jobId, record.id);
    }
  }

  private addToIndex(key: string, value: string, id: string): void {
    let keyIndex = this.indices.get(key);
    if (!keyIndex) {
      keyIndex = new Map<string, Set<string>>();
      this.indices.set(key, keyIndex);
    }
    let set = keyIndex.get(value);
    if (!set) {
      set = new Set<string>();
      keyIndex.set(value, set);
    }
    set.add(id);
  }
}

// ─── Retry Queue ───────────────────────────────────────────────────────────────

export interface JobRecord {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  errorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt: Date;
  completedAt: Date | null;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead';

export interface RetryQueue {
  enqueue(job: Omit<JobRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  dequeue(): Promise<JobRecord | null>;
  findById(id: string): Promise<JobRecord | null>;
  findAll(filter?: JobFilter): Promise<JobRecord[]>;
  update(id: string, updates: Partial<JobRecord>): Promise<JobRecord | null>;
  count(filter?: JobFilter): Promise<number>;
}

export interface JobFilter {
  type?: string;
  status?: JobStatus;
  fromDate?: Date;
  toDate?: Date;
}

export class InMemoryRetryQueue implements RetryQueue {
  private jobs = new Map<string, JobRecord>();

  async enqueue(job: Omit<JobRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const record: JobRecord = {
      ...job,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, record);
    return id;
  }

  async dequeue(): Promise<JobRecord | null> {
    const now = new Date();
    const pending = Array.from(this.jobs.values())
      .filter(j => j.status === 'pending' && j.scheduledAt <= now)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    if (pending.length === 0) return null;

    const job: JobRecord = pending[0]!;
    job.status = 'running';
    job.updatedAt = new Date();
    this.jobs.set(job.id, job);
    return job;
  }

  async findById(id: string): Promise<JobRecord | null> {
    return this.jobs.get(id) || null;
  }

  async findAll(filter?: JobFilter): Promise<JobRecord[]> {
    let results = Array.from(this.jobs.values());

    if (filter) {
      if (filter.type) {
        results = results.filter(j => j.type === filter.type);
      }
      if (filter.status) {
        results = results.filter(j => j.status === filter.status);
      }
      if (filter.fromDate) {
        results = results.filter(j => j.createdAt >= filter.fromDate!);
      }
      if (filter.toDate) {
        results = results.filter(j => j.createdAt <= filter.toDate!);
      }
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(id: string, updates: Partial<JobRecord>): Promise<JobRecord | null> {
    const existing = this.jobs.get(id);
    if (!existing) return null;

    const updated: JobRecord = { ...existing, ...updates, updatedAt: new Date() };
    this.jobs.set(id, updated);
    return updated;
  }

  async count(filter?: JobFilter): Promise<number> {
    const all = await this.findAll(filter);
    return all.length;
  }
}

// ─── Dead Letter Queue ─────────────────────────────────────────────────────────

export class DeadLetterQueue {
  private errors: AppErrorRecord[] = [];

  async add(error: AppError): Promise<void> {
    const record: AppErrorRecord = {
      ...error.toJSON(),
      status: 'dead_lettered',
      lastRetryAt: null,
      nextRetryAt: null,
      resolvedAt: null,
    };
    this.errors.push(record);
  }

  async getAll(): Promise<AppErrorRecord[]> {
    return [...this.errors].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getById(id: string): Promise<AppErrorRecord | null> {
    return this.errors.find(e => e.id === id) || null;
  }

  async markResolved(id: string): Promise<boolean> {
    const error = this.errors.find(e => e.id === id);
    if (!error) return false;
    error.status = 'resolved';
    error.resolvedAt = new Date().toISOString();
    return true;
  }

  async count(): Promise<number> {
    return this.errors.length;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Error Factory ─────────────────────────────────────────────────────────────

export function createError(
  code: ErrorCode,
  message: string,
  options?: Partial<AppErrorOptions>
): AppError {
  return new AppError({
    code,
    message,
    ...options,
  });
}

// Pre-defined error creators
export const errors = {
  farcasterWebhookInvalid: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.FARCASTER_WEBHOOK_INVALID, 'Invalid Far caster webhook payload', { cause, metadata }),

  farcasterCastFetchFailed: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.FARCASTER_CAST_FETCH_FAILED, 'Failed to fetch Far caster cast', { cause, metadata }),

  farcasterPublishFailed: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Failed to publish to Far caster', { cause, metadata }),

  farcasterRateLimited: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.FARCASTER_RATE_LIMITED, 'Rate limited by Far caster API', { cause, metadata }),

  llmTimeout: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.LLM_TIMEOUT, 'LLM request timed out', { cause, metadata }),

  llmInvalidJson: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.LLM_INVALID_JSON, 'LLM returned invalid JSON', { cause, metadata }),

  llmBudgetExceeded: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.LLM_BUDGET_EXCEEDED, 'LLM budget exceeded', { cause, metadata }),

  safetyBlocked: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.SAFETY_BLOCKED, 'Content blocked by safety check', { cause, metadata }),

  planLimitExceeded: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.PLAN_LIMIT_EXCEEDED, 'Plan limit exceeded', { cause, metadata }),

  duplicateEvent: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.DUPLICATE_EVENT, 'Duplicate event detected', { cause, metadata }),

  alertConsentMissing: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.ALERT_CONSENT_MISSING, 'Alert consent not granted', { cause, metadata }),

  directCastFailed: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.DIRECT_CAST_FAILED, 'Direct cast notification failed', { cause, metadata }),

  dbError: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.DB_ERROR, 'Database error', { cause, metadata }),

  redisError: (cause?: unknown, metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.REDIS_ERROR, 'Redis error', { cause, metadata }),

  unknown: (cause?: unknown, message = 'Unknown error', metadata?: Record<string, unknown>) =>
    createError(ERROR_CODES.UNKNOWN_ERROR, message, { cause, metadata }),
};