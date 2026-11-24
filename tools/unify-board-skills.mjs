import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const write = process.argv.includes('--write');
const specs = [
  {
    path: 'crimeBoard/BoardEvidenceModel.js', local: 'skill',
    declaration: /^const skill\s*=\s*value\s*=>\s*\{[\s\S]*?^\};[ \t]*\r?\n/m,
    line: "import { normalizeSkillId as skill } from './skillNormalization.js';",
    importPattern: /import\s*\{\s*normalizeSkillId\s+as\s+skill\s*\}\s*from\s*['"]\.\/skillNormalization\.js['"]/,
  },
  {
    path: 'crimeBoard/CaseTheoryModel.js', local: 'normalizeSkillId',
    declaration: /^export function normalizeSkillId\(value\)\s*\{[\s\S]*?^\}[ \t]*\r?\n/m,
    line: "import { normalizeSkillId } from './skillNormalization.js';",
    importPattern: /import\s*\{\s*normalizeSkillId\s*\}\s*from\s*['"]\.\/skillNormalization\.js['"]/,
    reexport: "export { normalizeSkillId } from './skillNormalization.js';",
  },
  {
    path: 'CrimeBoardInitCore.js', local: 'normalizeSkill',
    declaration: /^function normalizeSkill\(value\)\{[^\r\n]*\}[ \t]*\r?\n/m,
    line: "import { normalizeSkillId as normalizeSkill } from './crimeBoard/skillNormalization.js';",
    importPattern: /import\s*\{\s*normalizeSkillId\s+as\s+normalizeSkill\s*\}\s*from\s*['"]\.\/crimeBoard\/skillNormalization\.js['"]/,
  }
];

function checkSyntax(content, path) {
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: content, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Invalid JavaScript in ${path}:\n${result.stderr || result.error || ''}`);
}

async function main() {
  const helper = await readFile(new URL('crimeBoard/skillNormalization.js', root), 'utf8');
  checkSyntax(helper, 'crimeBoard/skillNormalization.js');
  const plans = [];
  for (const spec of specs) {
    const url = new URL(spec.path, root);
    const before = await readFile(url, 'utf8');
    const hasLocal = spec.declaration.test(before);
    if (!hasLocal && !spec.importPattern.test(before)) {
      throw new Error(`Unrecognized version of ${spec.path}. No files changed. Keep your files and report this message.`);
    }
    let after = hasLocal ? before.replace(spec.declaration, '') : before;
    if (!spec.importPattern.test(after)) after = spec.line + '\n' + after;
    if (spec.reexport && !/export\s*\{\s*normalizeSkillId\s*\}\s*from\s*['"]\.\/skillNormalization\.js['"]/.test(after)) {
      after = spec.reexport + '\n' + after;
    }
    checkSyntax(after, spec.path);
    plans.push({ ...spec, url, before, after });
  }
  const changed = plans.filter(p => p.after !== p.before);
  if (!changed.length) { console.log('Already using the shared skill normalizer. No changes needed.'); return; }
  console.log(changed.map(p => `${write ? 'Updating' : 'Would update'}: ${p.path}`).join('\n'));
  if (!write) { console.log('Preview only. Run again with --write to apply.'); return; }
  const backupRoot = new URL(`backups/board-skills-${Date.now()}/`, root);
  for (const plan of changed) {
    const backup = new URL(plan.path, backupRoot);
    await mkdir(new URL('./', backup), { recursive: true });
    await writeFile(backup, plan.before, 'utf8');
  }
  // Refuse to overwrite files that changed while this command was running.
  for (const plan of changed) {
    if (await readFile(plan.url, 'utf8') !== plan.before) throw new Error(`${plan.path} changed during preparation. No updates applied.`);
  }
  const applied = [];
  try {
    for (const plan of changed) {
      applied.push(plan);
      await writeFile(plan.url, plan.after, 'utf8');
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const plan of applied.reverse()) {
      try { await writeFile(plan.url, plan.before, 'utf8'); }
      catch (rollbackError) { rollbackErrors.push(`${plan.path}: ${rollbackError.message}`); }
    }
    if (rollbackErrors.length) console.error('Restore affected files from the backup:', rollbackErrors.join('\n'));
    throw error;
  }
  console.log(`Done. Backups: ${fileURLToPath(backupRoot)}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
