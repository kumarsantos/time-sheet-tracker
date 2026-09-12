import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const positional = args.filter(
  (arg) => arg !== '--verbose' && arg !== '-v' && !arg.startsWith('--env='),
);

const mode = (positional[0] ?? 'development') === 'production' ? 'production' : 'development';
const subcommand = positional[1] ?? null;
const extraArgs = positional.slice(2);

const envFlagArg = args.find((arg) => arg.startsWith('--env='));
const loadMode = envFlagArg ? envFlagArg.split('=')[1] : mode;

const envFiles = ['.env', '.env.local', `.env.${loadMode}`, `.env.${loadMode}.local`];

function parseEnvFile(path) {
  const parsed = {};
  const content = readFileSync(path, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.split(' #')[0].trim();
    }
    parsed[match[1]] = value;
  }

  return parsed;
}

const loaded = envFiles.filter((file) => existsSync(file));
const combined = {};

for (const file of loaded) {
  Object.assign(combined, parseEnvFile(file));
}

const injected = {};
for (const [key, value] of Object.entries(combined)) {
  if (!(key in process.env)) {
    injected[key] = value;
  }
}

if (verbose) {
  console.log(`[load-env] mode = ${mode}`);

  for (const file of envFiles) {
    const present = existsSync(file);
    const count = present ? Object.keys(parseEnvFile(file)).length : 0;
    console.log(`[load-env]   ${present ? 'loaded' : 'missing'}  ${file} (${count} vars)`);
  }

  console.log(
    `[load-env] ${Object.keys(combined).length} variable(s) defined, ${Object.keys(injected).length} injected into next`,
  );
}

if (!loaded.some((file) => file === `.env.${loadMode}` || file === `.env.${loadMode}.local`)) {
  console.warn(
    `[load-env] WARNING: no ${loadMode}-specific env file found (expected .env.${loadMode} or .env.${loadMode}.local)`,
  );
}

if (!subcommand) {
  process.exit(0);
}

const result = spawnSync('next', [subcommand, ...extraArgs], {
  stdio: 'inherit',
  shell: false,
  env: { ...process.env, ...injected },
});

process.exit(result.status ?? 1);
