const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

const SOURCE = path.join(
  ROOT,
  'assets/data/objects-source/tokyo_museum.json'
);

const NEW_ITEM = {
  id: 'tokyo_spent_blank_cartridge',

  item: 'Spent blank cartridge',

  skills: ['Firearms'],

  tags: [
    'cartridge',
    'blank',
    'noise',
    'courtyard'
  ],

  scene: ['tokyo_museum'],

  trueExplanation:
    'Left over from a museum security demonstration. ' +
    'The demonstration successfully established that ' +
    'everyone dislikes sudden loud noises.',

  heistExplanation:
    'The thief fired a blank in the service courtyard ' +
    'to draw the guards away from the exhibition.',

  reconstructionUses: [
    {
      questionId: 'distract_guards',

      skills: ['Firearms'],

      heistExplanation:
        'Using their firearms knowledge, the thief ' +
        'created a convincing gunshot scare with a blank ' +
        'in the service courtyard. The guards left ' +
        'the exhibition to investigate.'
    }
  ]
};

function readJson(filename) {
  return JSON.parse(
    fs.readFileSync(filename, 'utf8')
      .replace(/^\uFEFF/, '')
  );
}

function main() {
  const rawItems = readJson(SOURCE);

  if (!Array.isArray(rawItems)) {
    throw new Error(
      'Tokyo source must contain an array.'
    );
  }

  const items = rawItems.flat(Infinity);
  const ids = new Set();

  for (const item of items) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.id !== 'string' ||
      !item.id.trim()
    ) {
      throw new Error(
        'Tokyo source contains an invalid item.'
      );
    }

    if (ids.has(item.id)) {
      throw new Error(
        `Duplicate Tokyo item ID: ${item.id}`
      );
    }

    if (
      !Array.isArray(item.scene) ||
      item.scene.length !== 1 ||
      item.scene[0] !== 'tokyo_museum'
    ) {
      throw new Error(
        `Unexpected scene assignment: ${item.id}`
      );
    }

    ids.add(item.id);
  }

  const existingItem = items.find(
    (item) => item.id === NEW_ITEM.id
  );

  if (
    existingItem &&
    JSON.stringify(existingItem) !==
      JSON.stringify(NEW_ITEM)
  ) {
    throw new Error(
      `Item "${NEW_ITEM.id}" already exists with ` +
      'different content. Nothing was overwritten.'
    );
  }

  if (!existingItem) {
    items.push(NEW_ITEM);
  }

  const updated = JSON.stringify(items, null, 2) + '\n';
  const original = fs.readFileSync(SOURCE, 'utf8');

  if (updated !== original) {
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

    const backup = `${SOURCE}.${stamp}.bak`;

    fs.copyFileSync(
      SOURCE,
      backup,
      fs.constants.COPYFILE_EXCL
    );

    const temporary = SOURCE + '.tmp';

    fs.writeFileSync(temporary, updated, 'utf8');
    fs.renameSync(temporary, SOURCE);

    console.log('Tokyo source updated.');
    console.log(`Backup: ${backup}`);
  } else {
    console.log('Tokyo fix is already present.');
  }

  console.log(`Tokyo source objects: ${items.length}`);
  console.log('\nRebuilding generated data...\n');

  execFileSync(
    process.execPath,
    ['tools/build-objects.cjs'],
    {
      cwd: ROOT,
      stdio: 'inherit'
    }
  );

  console.log('\nRunning reconstruction audit...\n');

  execFileSync(
    process.execPath,
    ['tests/reconstruction-audit.cjs'],
    {
      cwd: ROOT,
      stdio: 'inherit'
    }
  );

  console.log('\nDONE: reconstruction audit passed.');
}

try {
  main();
} catch (error) {
  console.error(
    '\nTokyo repair or verification stopped:',
    error.message
  );

  console.error(
    'If the audit ran, check the new report ' +
    'in test-results/.'
  );

  process.exitCode = 1;
}