import { describe, it, expect, vi, afterEach } from 'vitest';
import { performStorageHealthCheck } from './storageCheck';

describe('performStorageHealthCheck', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is unhealthy when persistence is supported but not granted', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        persisted: vi.fn().mockResolvedValue(false),
        persist: vi.fn().mockResolvedValue(false),
        estimate: vi.fn().mockResolvedValue({ quota: 1000, usage: 0 }),
      },
    });

    const result = await performStorageHealthCheck();

    expect(result.persistenceSupported).toBe(true);
    expect(result.isPersisted).toBe(false);
    expect(result.isHealthy).toBe(false);
    expect(result.warnings.some((w) => w.includes('not persistent'))).toBe(true);

    vi.unstubAllGlobals();
  });

  it('does not penalize browsers without the Persistence API', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: undefined,
    });

    const result = await performStorageHealthCheck();

    expect(result.persistenceSupported).toBe(false);
    expect(result.warnings.some((w) => w.includes('not persistent'))).toBe(false);
    // Persistence isn't held against health when the API isn't available at all.
    expect(result.isHealthy).toBe(true);

    vi.unstubAllGlobals();
  });

  it('is healthy when persistence is supported and already granted', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        persisted: vi.fn().mockResolvedValue(true),
        persist: vi.fn().mockResolvedValue(true),
        estimate: vi.fn().mockResolvedValue({ quota: 1000, usage: 0 }),
      },
    });

    const result = await performStorageHealthCheck();

    expect(result.isPersisted).toBe(true);
    expect(result.isHealthy).toBe(true);

    vi.unstubAllGlobals();
  });
});
