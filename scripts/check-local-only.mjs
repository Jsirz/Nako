import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// This is a regression guard for built-in official integrations, not a firewall.
const skipped = new Set(['node_modules', 'dist', '.verification', '.desktop-dev', '.git']);
function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      skipped.has(entry.name)
        ? []
        : entry.isDirectory()
          ? walk(path.join(directory, entry.name))
          : [path.join(directory, entry.name)],
    );
}
const patterns = [
  /(?:work-fisher\.com|workfisher\.com|pan\.quark\.cn\/s\/4902ac63461c|space\.bilibili\.com\/17919458)/i,
  /(?:provider\.relay|account\.relay|telemetry\.calls|desktop\.updates|Relay(?:Text|Image|Video|Audio)Provider)/,
  /(?:account:submit-feedback|desktop:open-admin|identity:sign-in|identity:register|identity:sign-out)/,
  /(?:\/v1\/(?:call-telemetry|device-sessions|token-exchanges|authorization-codes)|\/api\/(?:auth\/|account\/relay))/,
  /(?:telemetryReporter|modelCallReporter|__NAKO_BEFORE_DESKTOP_UPDATE__|inviteCode=rh-v1270)/,
];
const failures = [];
const files = ['apps', 'modules', 'plugins', 'config', 'scripts', 'public', 'integrations']
  .flatMap(walk)
  .filter((file) => /\.(?:[cm]?[jt]sx?|json|html|md)$/.test(file))
  .filter(
    (file) =>
      !['check-local-only.mjs', 'smoke-server.mjs', 'package-lock.json'].includes(
        path.basename(file),
      ),
  );
for (const file of files) {
  // Explicitly authorized model API; account, feedback and telemetry bans remain.
  const raw = fs.readFileSync(file, 'utf8');
  const authorizedOrigin = file === path.normalize('plugins/providers/work-fisher/protocol.js');
  const generatedCatalog = file === path.normalize('modules/generation-core/server/config/modelCatalog.generated.json');
  const contents = authorizedOrigin || generatedCatalog
    ? raw.replaceAll('https://api.work-fisher.com', 'authorized-provider-origin')
    : raw;
  for (const pattern of patterns) if (pattern.test(contents)) failures.push(`${file}: ${pattern}`);
}
for (const removed of [
  'plugins/providers/relay',
  'config/identity-runtime.json',
  'modules/identity-account/ui/account',
  'modules/identity-account/server/account',
  'modules/desktop-shell-observability/ui/feedback',
  'modules/desktop-shell-observability/ui/updates',
  'modules/desktop-shell-observability/desktop/updates',
])
  if (fs.existsSync(removed)) failures.push(`Removed implementation exists: ${removed}`);
const desktop = JSON.parse(fs.readFileSync('config/desktop-plugins.json', 'utf8'));
assert.deepEqual(
  desktop.map((plugin) => plugin.id),
  ['desktop.identity-account', 'desktop.application-updates'],
);
if (failures.length) throw new Error(failures.join('\n'));
console.log(
  `Local-only boundary passed: ${files.length} production files; official integrations absent.`,
);
