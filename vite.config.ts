import { defineConfig } from 'vitest/config';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const repoName = env.GITHUB_REPOSITORY?.split('/')[1];
const isPagesBuild = env.GITHUB_ACTIONS === 'true' && Boolean(repoName);

export default defineConfig({
  base: isPagesBuild ? `/${repoName}/` : '/',
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/game/**/*.ts'],
    },
  },
});
