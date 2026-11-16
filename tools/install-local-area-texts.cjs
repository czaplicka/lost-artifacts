const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const TARGET = path.join(
  ROOT,
  'assets/data/dialogue/extracted.json'
);

const ADDITIONS = {
  'ui/LocalAreaDestinationsUI.js': {
    local_title:
      'Local Area',

    local_subtitle:
      'Nearby towns. Local cases. No passport required. Dino still packed one.',

    locked:
      'Unavailable',

    enter_garden:
      "Enter Olga's garden",

    departure_error:
      'The car refuses to cooperate. Please try again.'
  },

  'ui/pi-computer/GrandConspiracyComputer.js': {
    local_address:
      "WhateverVille — Olga's garden. Case: The Midnight Gardener.",

    local_area_icon:
      'Local Area',

    open_local_map:
      'OPEN LOCAL MAP',

    home_description:
      'Home Town — your PI office.',

    already_home:
      'You are already home. The pigeon confirms it.',

    return_description:
      'Return to your office in Home Town.',

    drive_home:
      'Drive home',

    no_local_case:
      'No field visit is available here yet. The local pigeon declined to comment.',

    case_done:
      'This case is closed. Olga would appreciate some unsupervised gardening.',

    accept_case:
      'Accept The Midnight Gardener in Classifieds before visiting Olga.',

    camera_required:
      'Bring a camera. Suspicious squinting does not count as photographic evidence.',

    ready:
      'Perkins wants photographs. Olga wants everyone to mind their own business.',

    drive_olga:
      'Drive to WhateverVille',

    map_error:
      'The local map could not be opened. Please try again.',

    trip_error:
      'The trip was interrupted. Check your current town before trying again.',

    trip_busy:
      'A local trip is already running.',

    back_completed:
      'Back at the office. The case is closed; the neighbourhood is still nosy.',

    back_office:
      'Back at the office. Your field notes have been kept.'
  }
};

function main() {
  const original = fs.readFileSync(
    TARGET,
    'utf8'
  );

  const catalog = JSON.parse(
    original.replace(/^\uFEFF/, '')
  );

  if (
    catalog?.version !== 1 ||
    !catalog.sources ||
    typeof catalog.sources !== 'object' ||
    Array.isArray(catalog.sources)
  ) {
    throw new Error(
      'Invalid existing dialogue catalog.'
    );
  }

  for (
    const [source, entries] of
    Object.entries(catalog.sources)
  ) {
    if (
      !entries ||
      typeof entries !== 'object' ||
      Array.isArray(entries) ||
      Object.values(entries).some(
        value => typeof value !== 'string'
      )
    ) {
      throw new Error(
        `Invalid catalog section: ${source}`
      );
    }
  }

  let count = 0;

  for (
    const [source, entries] of
    Object.entries(ADDITIONS)
  ) {
    catalog.sources[source] ??= {};

    for (
      const [id, value] of
      Object.entries(entries)
    ) {
      if (
        Object.hasOwn(
          catalog.sources[source],
          id
        )
      ) {
        if (
          catalog.sources[source][id] !== value
        ) {
          throw new Error(
            `Text conflict: ${source}/${id}. ` +
            'Nothing was written.'
          );
        }
      } else {
        catalog.sources[source][id] = value;
        count++;
      }
    }
  }

  if (count > 0) {
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

    const backup =
      `${TARGET}.${stamp}.bak`;

    fs.copyFileSync(
      TARGET,
      backup,
      fs.constants.COPYFILE_EXCL
    );

    fs.writeFileSync(
      TARGET + '.tmp',
      JSON.stringify(catalog, null, 2) + '\n',
      'utf8'
    );

    fs.renameSync(
      TARGET + '.tmp',
      TARGET
    );

    console.log(`Backup: ${backup}`);
  }

  console.log(
    `Local Area: added ${count} texts. ` +
    'Existing catalog entries preserved.'
  );
}

try {
  main();
} catch (error) {
  console.error(
    '[Local Area texts]',
    error.message
  );

  process.exitCode = 1;
}