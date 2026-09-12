import { execSync } from 'node:child_process';
import { isValidBranchName } from './check-branch-name.mjs';

const flag = process.argv[4];

// git passes flag "1" for branch/tag checkouts, "0" for file-path checkouts
if (flag !== '1') {
  process.exit(0);
}

const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();

// Detached HEAD has no branch name - nothing to validate
if (!branch || isValidBranchName(branch)) {
  process.exit(0);
}

console.error(`[branch-guard] Branch name "${branch}" violates branch naming convention.`);

const prev = execSync('git rev-parse --abbrev-ref "@{-1}"', { encoding: 'utf8' }).trim() || '';

// "@{-1}" resolves to "HEAD" when the previous state was detached - avoid a revert loop
if (!prev || prev === 'HEAD') {
  console.error(`[branch-guard] Stayed on "${branch}" (previous HEAD was detached).`);
  process.exit(1);
}

console.error(`[branch-guard] Reverting to previous branch: ${prev}`);
execSync(`git switch "${prev}"`, { stdio: 'ignore' });
process.exit(1);
