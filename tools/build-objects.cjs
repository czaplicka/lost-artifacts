const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceDirectory = path.join(
  root,
  'assets/data/objects-source'
);

const checkOnly = process.argv.includes('--check');
const backupStamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);

  try {
    const text = fs
      .readFileSync(absolutePath, 'utf8')
      .replace(/^\uFEFF/, '');

    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Cannot read ${relativePath}: ${error.message}`
    );
  }
}

function readSource(filename) {
  return readJson(
    `assets/data/objects-source/${filename}`
  );
}

function serialize(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function matchesExisting(relativePath, value) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return false;
  }

  return (
    JSON.stringify(readJson(relativePath)) ===
    JSON.stringify(value)
  );
}

function writeWithBackup(relativePath, value) {
  const absolutePath = path.join(root, relativePath);
  const temporaryPath = absolutePath + '.tmp';
  const content = serialize(value);

  fs.mkdirSync(path.dirname(absolutePath), {
    recursive: true
  });

  if (fs.existsSync(absolutePath)) {
    const existing = fs.readFileSync(
      absolutePath,
      'utf8'
    );

    if (existing === content) {
      return false;
    }

    fs.copyFileSync(
      absolutePath,
      `${absolutePath}.${backupStamp}.bak`,
      fs.constants.COPYFILE_EXCL
    );
  }

  fs.writeFileSync(temporaryPath, content);
  fs.renameSync(temporaryPath, absolutePath);

  return true;
}

function build() {
  if (!fs.existsSync(sourceDirectory)) {
    throw new Error(
      'Missing assets/data/objects-source directory.'
    );
  }

  const manifest = readSource('_manifest.json');
  const scenes = manifest.scenes;

  if (
    !Array.isArray(scenes) ||
    new Set(scenes).size !== scenes.length
  ) {
    throw new Error('Invalid scene manifest.');
  }

  for (const scene of scenes) {
    if (
      typeof scene !== 'string' ||
      !/^[a-z0-9_]+$/.test(scene)
    ) {
      throw new Error(
        `Invalid scene ID: ${String(scene)}`
      );
    }
  }

  const files = [
    'shared.json',
    ...scenes.map((scene) => `${scene}.json`)
  ];

  const byId = new Map();
  const originById = new Map();
  const normalizedSources = new Map();

  for (const filename of files) {
    const rawItems = readSource(filename);

    if (!Array.isArray(rawItems)) {
      throw new Error(
        `${filename}: expected an array.`
      );
    }

    const items = rawItems.flat(Infinity);

    for (const item of items) {
      if (
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        typeof item.id !== 'string' ||
        !item.id.trim()
      ) {
        throw new Error(
          `${filename}: invalid item or missing ID.`
        );
      }

      if (item.id !== item.id.trim()) {
        throw new Error(
          `${filename}: ID "${item.id}" contains outer whitespace.`
        );
      }

      if (byId.has(item.id)) {
        throw new Error(
          `Duplicate ID "${item.id}" in ` +
          `${originById.get(item.id)} and ${filename}.`
        );
      }

      if (
        !Array.isArray(item.scene) ||
        item.scene.some(
          (scene) => !scenes.includes(scene)
        )
      ) {
        throw new Error(
          `${filename}: ${item.id}: invalid scene.`
        );
      }

      if (
        new Set(item.scene).size !==
        item.scene.length
      ) {
        throw new Error(
          `${filename}: ${item.id}: duplicate scene.`
        );
      }

      if (
        filename !== 'shared.json' &&
        (
          item.scene.length !== 1 ||
          filename !== `${item.scene[0]}.json`
        )
      ) {
        throw new Error(
          `${filename}: ${item.id}: move multi-scene ` +
          'items to shared.json.'
        );
      }

      byId.set(item.id, item);
      originById.set(item.id, filename);
    }

    normalizedSources.set(
      `assets/data/objects-source/${filename}`,
      items
    );

    if (rawItems.some(Array.isArray)) {
      console.log(
        `Flattened ${filename}: ` +
        `${items.length} objects.`
      );
    }
  }

  const order = manifest.order;

  if (
    !Array.isArray(order) ||
    order.some(
      (id) =>
        typeof id !== 'string' ||
        !id.trim()
    ) ||
    new Set(order).size !== order.length
  ) {
    throw new Error('Invalid order manifest.');
  }

  const missing = order.filter(
    (id) => !byId.has(id)
  );

  if (missing.length > 0) {
    throw new Error(
      'Missing original IDs. Update the manifest ' +
      'explicitly for deliberate removal: ' +
      missing.join(', ')
    );
  }

  const orderedIds = new Set(order);

  const all = [
    ...order.map((id) => byId.get(id)),
    ...[...byId.values()].filter(
      (item) => !orderedIds.has(item.id)
    )
  ];

  const outputs = new Map(normalizedSources);

  outputs.set('assets/data/objects.json', all);

  for (const scene of scenes) {
    outputs.set(
      `assets/data/objects/${scene}.json`,
      all.filter(
        (item) => item.scene.includes(scene)
      )
    );
  }

  if (checkOnly) {
    const outdated = [];

    for (const [filename, value] of outputs) {
      if (!matchesExisting(filename, value)) {
        outdated.push(filename);
      }
    }

    if (outdated.length > 0) {
      throw new Error(
        'Source or generated files need rebuilding:\n' +
        outdated
          .map((filename) => `- ${filename}`)
          .join('\n') +
        '\nRun: node tools/build-objects.cjs'
      );
    }

    console.log(
      'OK: source arrays are flat and generated ' +
      'JSON matches source files.'
    );

    return;
  }

  let changedCount = 0;

  for (const [filename, value] of outputs) {
    if (writeWithBackup(filename, value)) {
      changedCount += 1;
      console.log(`Updated: ${filename}`);
    }
  }

  const tokyoCount = all.filter(
    (item) => item.scene.includes('tokyo_museum')
  ).length;

  console.log(
    `Built ${all.length} objects and ` +
    `${scenes.length} scene files.`
  );

  console.log(`Tokyo objects: ${tokyoCount}`);
  console.log(`Changed files: ${changedCount}`);

  if (changedCount > 0) {
    console.log(
      `Backups use suffix: .${backupStamp}.bak`
    );
  }
}

try {
  build();
} catch (error) {
  console.error(
    `[build-objects] ${error.message}`
  );

  process.exitCode = 1;
}