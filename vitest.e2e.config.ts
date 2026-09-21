import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.e2e.test.ts'],
    exclude: [...configDefaults.exclude, 'template-*'],
    globalSetup: ['tests/e2e/global-setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  publicDir: false,
})
