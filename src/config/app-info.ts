import { readFileSync } from 'node:fs';

// package.json sits two levels above this file in both `src/config` (tsx, Vitest) and
// `dist/config` (compiled build), so the same relative path works everywhere.
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  name: string;
  version: string;
};

export const appInfo = { name: pkg.name, version: pkg.version } as const;
