import { describe, it, expect } from 'vitest';
import { createAgentJobSchema } from '../src/index.js';

describe('shared', () => {
  describe('createAgentJobSchema', () => {
    it('creates schema for reply job', () => {
      const schema = createAgentJobSchema();
      const result = schema.parse({
        id: 'job-123',
        type: 'reply',
        fid: 12345,
        payload: { text: 'hello world' },
      });
      expect(result.id).toBe('job-123');
      expect(result.type).toBe('reply');
      expect(result.fid).toBe(12345);
    });

    it('rejects invalid job type', () => {
      const schema = createAgentJobSchema();
      expect(() => schema.parse({
        id: 'job-123',
        type: 'invalid-type',
        fid: 12345,
        payload: {},
      })).toThrow();
    });
  });
});