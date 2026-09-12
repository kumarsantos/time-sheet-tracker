import { execSync } from 'node:child_process';

const allowedTypes = [
  'feature',
  'fix',
  'hotfix',
  'chore',
  'refactor',
  'docs',
  'style',
  'perf',
  'test',
  'build',
  'revert',
];
const exemptBranches = ['main', 'master', 'develop', 'staging', 'release'];

const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();

if (exemptBranches.includes(branch)) {
  process.exit(0);
}

const valid = allowedTypes.some((type) => branch === type || branch.startsWith(`${type}/`));

if (!valid) {
  console.error(
    `\nBranch name "${branch}" does not follow convention.\n` +
      `Allowed prefixes: ${allowedTypes.join(', ')}\n` +
      `Examples: feature/timesheet-grid, chore/lint-setup, fix/expense-calc, refactor/api-client\n`,
  );
  process.exit(1);
}
