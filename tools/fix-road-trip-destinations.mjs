import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'ui/RoadTripDestinationsUI.js';
const WRITE = process.argv.includes('--write');
const absolute = path.join(ROOT, FILE);
const marker = '_restoreAfterFailedRoadTrip';

function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  if (visit(node) === false) return;
  for (const [key, value] of Object.entries(node)) {
    if (['start', 'end', 'loc'].includes(key)) continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child.type === 'string') walk(child, visit);
    }
  }
}
function ast(source) {
  return parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
}
function member(node, name) {
  return node?.type === 'MemberExpression' && !node.computed && node.property.name === name;
}
function isThisMember(node, name) {
  return member(node, name) && node.object.type === 'ThisExpression';
}
function edit(source, changes) {
  const sorted = [...changes].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) throw new Error('Overlapping edits.');
  }
  for (const change of sorted.reverse()) {
    source = source.slice(0, change.start) + change.text + source.slice(change.end);
  }
  return source;
}

async function main() {
  const original = await fs.readFile(absolute, 'utf8');
  const tree = ast(original);
  let cls;
  walk(tree, node => {
    if (node.type === 'ClassDeclaration' && node.id?.name === 'RoadTripDestinationsUI') cls = node;
  });
  if (!cls) throw new Error('RoadTripDestinationsUI class not found.');
  const method = name => cls.body.body.find(node => node.type === 'MethodDefinition' && node.key.name === name);
  if (method(marker)) {
    console.log('Fix already present. No changes made.');
    return;
  }
  for (const name of ['getPurse', 'refreshInfoPanel', 'confirm', 'open', 'selectTown', 'previewRoute']) {
    if (!method(name)) throw new Error(`Expected method missing: ${name}. No changes written.`);
  }
  const changes = [];
  const energyImports = tree.body.filter(node => node.type === 'ImportDeclaration' &&
    node.source.value === '../managers/EnergyManager.js');
  if (energyImports.length !== 1 || energyImports[0].specifiers.length !== 1 ||
      energyImports[0].specifiers[0].local.name !== 'getEnergyManager') {
    throw new Error('Unexpected EnergyManager import. No changes written.');
  }
  changes.push({ start: energyImports[0].start, end: energyImports[0].end, text: '' });
  const purse = method('getPurse');
  changes.push({ start: purse.start, end: purse.end, text: `getPurse() {
    return {
      cash: moneyManager.getBalance(MONEY_SOURCE.CASH)
    };
  }` });

  const travelCalls = [];
  walk(method('refreshInfoPanel').value.body, node => {
    if (node.type === 'CallExpression' && member(node.callee, 'setText') &&
        isThisMember(node.callee.object, 'infoTravel')) travelCalls.push(node);
  });
  // Jeden setText('') dla pustego panelu i jeden opis wybranej trasy.
  const populated = travelCalls.filter(node => !(node.arguments.length === 1 &&
    node.arguments[0].type === 'Literal' && node.arguments[0].value === ''));
  if (populated.length !== 1) throw new Error('Unexpected infoTravel structure. No changes written.');
  const travel = populated[0];
  changes.push({ start: travel.start, end: travel.end, text: `this.infoTravel.setText(
      \`Distance: \${quote.km} km\\n\` +
      \`Fuel: $\${quote.fuelCost}\\n\` +
      \`Cash available: $\${purse.cash}\`
    )` });

  const confirm = method('confirm');
  let townDeclared = false;
  const reopen = [];
  walk(confirm.value.body, node => {
    if (node.type === 'VariableDeclarator' && node.id.name === 'town' &&
        isThisMember(node.init, 'selectedTown')) townDeclared = true;
    if (node.type === 'CallExpression' && isThisMember(node.callee, 'open')) reopen.push(node);
  });
  if (!townDeclared || reopen.length !== 1 || reopen[0].arguments.length) {
    throw new Error('Unexpected confirm() recovery structure. No changes written.');
  }
  changes.push({ start: reopen[0].start, end: reopen[0].end, text: `this.${marker}(town)` });
  changes.push({ start: cls.body.end - 1, end: cls.body.end - 1, text: `
  // open() nadal resetuje mapę przy zwykłym otwarciu.
  // Po nieudanym starcie odtwarzamy wybór i trasę przed pokazaniem błędu.
  ${marker}(town) {
    if (this.isDestroyed) return;

    this.open();

    if (this.isDestroyed || !this.isOpen || !town) return;

    const pin = this.pins.find(item => item.town.id === town.id);

    if (pin) {
      this.selectTown(pin.town, pin);
    } else {
      this.selectedTown = town;
      this.selectedPin = null;
      this.refreshInfoPanel(town);
      this.previewRoute(town);
    }
  }
` });
  const updated = edit(original, changes);
  const checked = ast(updated);
  // Nie zostawiamy odwołań do usuniętej zależności.
  walk(checked, node => {
    if (node.type === 'Identifier' && node.name === 'getEnergyManager') {
      throw new Error('EnergyManager has additional uses. No changes written.');
    }
  });
  if (!WRITE) {
    console.log(`PREVIEW: ${FILE}\n- Remove energy import and purse.energy\n- Show distance, fuel and cash only\n- Restore selection and route after a failed trip\nNo files changed. Add --write to apply.`);
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = absolute + '.' + stamp + '.bak';
  await fs.copyFile(absolute, backup, fs.constants.COPYFILE_EXCL);
  await fs.writeFile(absolute, updated, 'utf8');
  console.log(`Updated: ${FILE}\nBackup: ${path.relative(ROOT, backup)}`);
}
main().catch(error => {
  console.error('[RoadTripDestinationsUI fix]', error);
  process.exitCode = 1;
});
