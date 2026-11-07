import { defineConfig } from 'vitest/config'

// Tests never call Claude: DEMO_OFFLINE=true means the cache, then templates.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    env: { DEMO_OFFLINE: 'true' },
    testTimeout: 20_000,
  },
})
