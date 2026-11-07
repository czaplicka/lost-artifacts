'use strict';

const fs = require('node:fs');
const path = require('node:path');

function checkIndex(options = {}) {
  const root = path.resolve(
    options.root || path.join(__dirname, '..')
  );

  const filename = path.join(
    root,
    'assets',
    'manifests',
    'index.json'
  );

  const original = fs.readFileSync(filename, 'utf8');

  const index = JSON.parse(
    original.replace(/^\uFEFF/, '')
  );

  const isObject = value =>
    value &&
    typeof value === 'object' &&
    !Array.isArray(value);

  if (
    index.version !== 2 ||
    !Array.isArray(index.files) ||
    !isObject(index.bundles) ||
    !isObject(index.startup)
  ) {
    throw new Error(
      'Invalid manifest index. Nothing changed.'
    );
  }

  const duplicates = [];

  function inspect(label, values, normalize) {
    if (
      !Array.isArray(values) ||
      values.some(
        value =>
          typeof value !== 'string' ||
          !value.trim()
      )
    ) {
      throw new Error(
        `Invalid string array: ${label}. Nothing changed.`
      );
    }

    const seen = new Map();

    return values.filter((value, position) => {
      const key = normalize(value);

      if (seen.has(key)) {
        duplicates.push({
          list: label,
          value,
          position: position + 1,
          firstPosition: seen.get(key) + 1
        });

        return false;
      }

      seen.set(key, position);
      return true;
    });
  }

  function normalizeFile(value) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) {
      return value;
    }

    return path.posix.normalize(
      value.replace(/\\/g, '/')
    );
  }

  index.files = inspect(
    'files',
    index.files,
    normalizeFile
  );

  for (const section of ['bundles', 'startup']) {
    for (
      const [name, values]
      of Object.entries(index[section])
    ) {
      index[section][name] = inspect(
        `${section}.${name}`,
        values,
        value => value
      );
    }
  }

  let backup = null;

  if (options.fix && duplicates.length) {
    if (fs.readFileSync(filename, 'utf8') !== original) {
      throw new Error(
        'Index changed during check. Nothing changed.'
      );
    }

    const directory = fs.mkdtempSync(
      path.join(
        path.dirname(filename),
        '.index-duplicates-'
      )
    );

    const temporary = path.join(
      directory,
      'index.json'
    );

    backup = path.join(
      directory,
      'index.json.bak'
    );

    fs.writeFileSync(
      backup,
      original,
      { flag: 'wx' }
    );

    if (fs.readFileSync(backup, 'utf8') !== original) {
      throw new Error(
        'Backup verification failed. Index unchanged.'
      );
    }

    try {
      fs.writeFileSync(
        temporary,
        JSON.stringify(index, null, 2) + '\n',
        { flag: 'wx' }
      );

      if (
        fs.readFileSync(filename, 'utf8') !== original
      ) {
        throw new Error(
          'Index changed before write. Nothing changed.'
        );
      }

      fs.renameSync(temporary, filename);
    } finally {
      if (fs.existsSync(temporary)) {
        fs.unlinkSync(temporary);
      }
    }
  }

  return {
    duplicates,
    fixed: Boolean(
      options.fix && duplicates.length
    ),
    backup
  };
}

function main() {
  const options = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--check') {
      options.fix = false;
    } else if (arg === '--root') {
      if (
        !args[i + 1] ||
        args[i + 1].startsWith('--')
      ) {
        throw new Error(
          'Missing --root directory.'
        );
      }

      options.root = args[++i];
    } else if (arg === '--help') {
      console.log(
        'node tools/check-index-duplicates.cjs ' +
        '[--check | --fix] [--root PROJECT]'
      );

      console.log(
        'Checks repeated entries inside files, ' +
        'each bundle and each startup group.'
      );

      console.log(
        '--fix keeps the first entry and ' +
        'backs up index.json.'
      );

      console.log(
        'Does not check duplicate JSON property names, ' +
        'asset definitions or unknown asset references.'
      );

      return;
    } else {
      throw new Error(
        `Unknown option: ${arg}`
      );
    }
  }

  const result = checkIndex(options);

  for (const entry of result.duplicates) {
    console.log(
      `DUPLICATE ${entry.list}\n` +
      `  Value: ${entry.value}\n` +
      `  Position: ${entry.position}\n` +
      `  First occurrence: ${entry.firstPosition}`
    );
  }

  console.log(
    `\nDuplicate entries: ${result.duplicates.length}`
  );

  console.log(
    `Fixed: ${result.fixed ? 'YES' : 'NO'}`
  );

  if (result.backup) {
    console.log(
      `Backup: ${result.backup}`
    );
  }

  if (!result.duplicates.length) {
    console.log(
      'Index is clean. Nothing changed.'
    );
  } else if (!options.fix) {
    console.log(
      'Check only. Run with --fix to remove duplicates.'
    );
  }

  process.exitCode =
    result.duplicates.length && !result.fixed
      ? 1
      : 0;
}

module.exports = { checkIndex };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(
      `[Index duplicates] ${error.message}`
    );

    process.exitCode = 2;
  }
}