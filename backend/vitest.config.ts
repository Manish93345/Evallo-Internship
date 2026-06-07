import { defineConfig } from 'vitest/config';

/**
 * Vitest config — backend tests.
 *
 * • `node` environment (we're testing an Express app, not React).
 * • Tests live under `tests/` so they don't pollute the `src/` tree the
 *   reviewer is scanning for production code.
 * • A single setup file boots/teardowns DB state between suites — see
 *   tests/setup.ts.
 * • `singleThread: true` because every test exercises the same Postgres
 *   database; running suites in parallel would race on the same rows.
 *   Tests are still fast — most of the latency is the round-trip to Neon.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    reporters: ['verbose'],
  },
});
