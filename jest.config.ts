import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'common',
      testMatch: ['<rootDir>/plugins/librechat-common/src/**/*.test.ts'],
      transform: { '^.+\\.tsx?$': 'ts-jest' },
      testEnvironment: 'node',
    },
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/plugins/librechat-backend/**/*.test.ts'],
      transform: { '^.+\\.tsx?$': 'ts-jest' },
      testEnvironment: 'node',
    },
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/plugins/librechat/src/**/*.test.{ts,tsx}'],
      transform: { '^.+\\.tsx?$': 'ts-jest' },
      testEnvironment: 'jsdom',
      moduleNameMapper: {
        '\\.(css|less|scss)$': 'identity-obj-proxy',
      },
      setupFilesAfterSetup: ['@testing-library/jest-dom'],
    },
  ],
  collectCoverageFrom: [
    'plugins/*/src/**/*.{ts,tsx}',
    '!plugins/*/src/**/*.test.{ts,tsx}',
    '!plugins/*/src/**/index.ts',
    '!plugins/*/src/**/*.d.ts',
  ],
};

export default config;
