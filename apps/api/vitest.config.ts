import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    // Tests share a single Postgres DB and use prefix-based cleanup
    // (`dev-test-*`). Running files in parallel causes one file's
    // `beforeEach` cleanup to wipe another file's seed data mid-flight,
    // producing flaky FK violations and missing rows. Serialise.
    fileParallelism: false,
  },
});
