import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// remix vite:build writes the client bundle to build/client, but the
// Freebuff hosting builder copies its static artifacts from dist/.
const clientDir = join(process.cwd(), 'build', 'client');
const distDir = join(process.cwd(), 'dist');

if (!existsSync(clientDir)) {
  console.error(`prepare-dist: missing client build output at ${clientDir}`);
  process.exit(1);
}

rmSync(distDir, { recursive: true, force: true });
cpSync(clientDir, distDir, { recursive: true });

const entries = readdirSync(distDir);
if (entries.length === 0) {
  console.error('prepare-dist: dist/ is empty after copy');
  process.exit(1);
}

console.log(`prepare-dist: copied build/client -> dist (${entries.length} entries)`);
