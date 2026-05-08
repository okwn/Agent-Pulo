import { describe, it, expect, beforeEach } from 'vitest';
import {
  AppError,
  InMemoryErrorStore,
  InMemoryRetryQueue,
  DeadLetterQueue,
  createError,
  ERROR_CODES,
  RETRY_CONFIGS,
  errors,
} from '../src/index.js';

describe('AppError', () => {
  it('creates error with required fields', () => {
    const error = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Failed to publish cast');

    expect(error.code).toBe('FARCASTER_PUBLISH_FAILED');
    expect(error.message).toBe('Failed to publish cast');
    expect(error.category).toBe('FARCASTER');
    expect(error.retryable).toBe(true);
    expect(error.correlationId).toMatch(/^corr_/);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('categorizes errors correctly', () => {
    expect(errors.farcasterPublishFailed().category).toBe('FARCASTER');
    expect(errors.llmTimeout().category).toBe('LLM');
    expect(errors.safetyBlocked().category).toBe('SAFETY');
    expect(errors.planLimitExceeded().category).toBe('PLAN');
    expect(errors.alertConsentMissing().category).toBe('ALERT');
    expect(errors.dbError().category).toBe('INFRA');
    expect(errors.unknown().category).toBe('UNKNOWN');
  });

  it('respects retryable flag from config', () => {
    const retryable = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'test');
    const nonRetryable = createError(ERROR_CODES.SAFETY_BLOCKED, 'test');

    expect(retryable.retryable).toBe(true);
    expect(nonRetryable.retryable).toBe(false);
  });

  it('canRetry checks attempt count', () => {
    const error = new AppError({
      code: ERROR_CODES.FARCASTER_PUBLISH_FAILED,
      message: 'test',
      retryCount: 0,
    });

    expect(error.canRetry()).toBe(true);

    // FARCASTER_PUBLISH_FAILED has maxAttempts: 3
    const exhausted = error.withRetry(3);
    expect(exhausted.canRetry()).toBe(false);
  });

  it('getRetryDelay calculates exponential backoff', () => {
    const error = new AppError({
      code: ERROR_CODES.FARCASTER_PUBLISH_FAILED,
      message: 'test',
      retryCount: 0,
    });

    // Base delay * 2^0 = 2000
    expect(error.getRetryDelay()).toBe(2000);

    const retry1 = error.withRetry(1);
    // Base delay * 2^1 = 4000
    expect(retry1.getRetryDelay()).toBe(4000);

    const retry2 = retry1.withRetry(2);
    // Base delay * 2^2 = 8000
    expect(retry2.getRetryDelay()).toBe(8000);
  });

  it('toDeadLetter creates non-retryable error', () => {
    const error = new AppError({
      code: ERROR_CODES.FARCASTER_PUBLISH_FAILED,
      message: 'test',
      retryable: true,
      retryCount: 2,
    });

    const deadLetter = error.toDeadLetter();

    expect(deadLetter.retryable).toBe(false);
    expect(deadLetter.metadata.deadLettered).toBe(true);
    expect(deadLetter.metadata.deadLetteredAt).toBeTruthy();
  });

  it('toJSON returns serializable record', () => {
    const error = createError(ERROR_CODES.LLM_TIMEOUT, 'Test error');
    const json = error.toJSON();

    expect(json).toHaveProperty('id');
    expect(json).toHaveProperty('code', 'LLM_TIMEOUT');
    expect(json).toHaveProperty('category', 'LLM');
    expect(json).toHaveProperty('message', 'Test error');
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('correlationId');
    expect(json).toHaveProperty('retryable');
  });
});

describe('InMemoryErrorStore', () => {
  let store: InMemoryErrorStore;

  beforeEach(() => {
    store = new InMemoryErrorStore();
  });

  it('saves and retrieves error', async () => {
    const error = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Test error');
    const id = await store.save(error);

    const retrieved = await store.findById(id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.code).toBe('FARCASTER_PUBLISH_FAILED');
  });

  it('findAll filters by code', async () => {
    await store.save(createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Error 1'));
    await store.save(createError(ERROR_CODES.LLM_TIMEOUT, 'Error 2'));
    await store.save(createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Error 3'));

    const farcasterErrors = await store.findAll({ code: ERROR_CODES.FARCASTER_PUBLISH_FAILED });
    expect(farcasterErrors.length).toBe(2);
  });

  it('findAll filters by status', async () => {
    const error = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Test');
    await store.save(error);

    const pending = await store.findAll({ status: 'pending' });
    expect(pending.length).toBeGreaterThan(0);
  });

  it('update modifies error', async () => {
    const error = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Test');
    const id = await store.save(error);

    await store.update(id, { status: 'retrying' });

    const updated = await store.findById(id);
    expect(updated!.status).toBe('retrying');
  });

  it('count returns correct total', async () => {
    await store.save(createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Error 1'));
    await store.save(createError(ERROR_CODES.LLM_TIMEOUT, 'Error 2'));
    await store.save(createError(ERROR_CODES.SAFETY_BLOCKED, 'Error 3'));

    expect(await store.count()).toBe(3);
    expect(await store.count({ category: 'LLM' })).toBe(1);
  });
});

describe('InMemoryRetryQueue', () => {
  let queue: InMemoryRetryQueue;

  beforeEach(() => {
    queue = new InMemoryRetryQueue();
  });

  it('enqueue creates job with id', async () => {
    const jobId = await queue.enqueue({
      type: 'test_job',
      payload: { data: 'test' },
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      errorId: null,
      scheduledAt: new Date(),
      completedAt: null,
    });

    expect(jobId).toMatch(/^job_/);
  });

  it('dequeue returns pending job', async () => {
    await queue.enqueue({
      type: 'test_job',
      payload: { data: 'test' },
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      errorId: null,
      scheduledAt: new Date(),
      completedAt: null,
    });

    const job = await queue.dequeue();
    expect(job).not.toBeNull();
    expect(job!.status).toBe('running');
  });

  it('dequeue respects scheduledAt', async () => {
    await queue.enqueue({
      type: 'future_job',
      payload: {},
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      errorId: null,
      scheduledAt: new Date(Date.now() + 10000), // 10 seconds in future
      completedAt: null,
    });

    const job = await queue.dequeue();
    expect(job).toBeNull();
  });

  it('findAll filters by status', async () => {
    await queue.enqueue({
      type: 'job1',
      payload: {},
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      errorId: null,
      scheduledAt: new Date(),
      completedAt: null,
    });

    const pending = await queue.findAll({ status: 'pending' });
    expect(pending.length).toBe(1);

    const running = await queue.findAll({ status: 'running' });
    expect(running.length).toBe(0);
  });
});

describe('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue;

  beforeEach(() => {
    dlq = new DeadLetterQueue();
  });

  it('adds error to dead letter queue', async () => {
    const error = createError(ERROR_CODES.SAFETY_BLOCKED, 'Blocked by safety');
    await dlq.add(error);

    const all = await dlq.getAll();
    expect(all.length).toBe(1);
    expect(all[0].code).toBe('SAFETY_BLOCKED');
    expect(all[0].status).toBe('dead_lettered');
  });

  it('markResolved updates status', async () => {
    const error = createError(ERROR_CODES.SAFETY_BLOCKED, 'Test');
    await dlq.add(error);

    const saved = await dlq.getAll();
    await dlq.markResolved(saved[0].id);

    const updated = await dlq.getAll();
    expect(updated[0].status).toBe('resolved');
    expect(updated[0].resolvedAt).toBeTruthy();
  });
});

describe('Retry Classification', () => {
  it('FARCASTER_RATE_LIMITED is retryable', () => {
    const config = RETRY_CONFIGS.FARCASTER_RATE_LIMITED;
    expect(config.retryable).toBe(true);
    expect(config.maxAttempts).toBe(5);
  });

  it('SAFETY_BLOCKED is not retryable', () => {
    const config = RETRY_CONFIGS.SAFETY_BLOCKED;
    expect(config.retryable).toBe(false);
    expect(config.maxAttempts).toBe(0);
  });

  it('LLM_BUDGET_EXCEEDED is not retryable', () => {
    const config = RETRY_CONFIGS.LLM_BUDGET_EXCEEDED;
    expect(config.retryable).toBe(false);
  });

  it('DB_ERROR is retryable', () => {
    const config = RETRY_CONFIGS.DB_ERROR;
    expect(config.retryable).toBe(true);
    expect(config.maxAttempts).toBe(3);
  });

  it('exponential backoff for FARCASTER errors', () => {
    const config = RETRY_CONFIGS.FARCASTER_RATE_LIMITED;
    expect(config.strategy).toBe('exponential');
    expect(config.baseDelayMs).toBe(5000);
    expect(config.maxDelayMs).toBe(60000);
  });
});

describe('Error Factory', () => {
  it('creates pre-defined errors with correct codes', () => {
    expect(errors.farcasterPublishFailed().code).toBe('FARCASTER_PUBLISH_FAILED');
    expect(errors.llmTimeout().code).toBe('LLM_TIMEOUT');
    expect(errors.safetyBlocked().code).toBe('SAFETY_BLOCKED');
    expect(errors.planLimitExceeded().code).toBe('PLAN_LIMIT_EXCEEDED');
  });

  it('attaches metadata', () => {
    const error = errors.farcasterPublishFailed('cast hash not found', { castHash: '0x123' });
    expect(error.metadata.castHash).toBe('0x123');
  });

  it('attaches cause', () => {
    const cause = new Error('Original error');
    const error = errors.dbError(cause);
    expect(error.cause).toBe(cause);
  });
});

describe('Correlation ID', () => {
  it('errors have unique correlation IDs', () => {
    const error1 = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Error 1');
    const error2 = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Error 2');

    expect(error1.correlationId).not.toBe(error2.correlationId);
  });

  it('withRetry preserves correlation ID', () => {
    const original = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Test');
    const correlationId = original.correlationId;

    const retry = original.withRetry(1);

    expect(retry.correlationId).toBe(correlationId);
    expect(retry.retryCount).toBe(1);
  });

  it('can associate job ID', () => {
    const error = createError(ERROR_CODES.FARCASTER_PUBLISH_FAILED, 'Test', { jobId: 'job_123' });
    expect(error.jobId).toBe('job_123');
  });
});