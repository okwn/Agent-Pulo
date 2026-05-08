import { describe, it, expect } from 'vitest';
import { log, createChildLogger } from '../src/index.js';

describe('observability', () => {
  it('exports a logger', () => {
    expect(log).toBeDefined();
    expect(typeof log.info).toBe('function');
  });

  it('creates child logger with component name', () => {
    const child = createChildLogger('test-component');
    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
  });
});