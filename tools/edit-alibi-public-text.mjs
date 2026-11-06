import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  rename,
  rm
} from 'node:fs/promises';

import {
  execFileSync
} from 'node:child_process';

import path from 'node:path';

import {
  fileURLToPath
} from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const relative =
  'ui/pi-computer/AlibiSearchExpansion.js';

const file = path.join(root, relative);

const marker =
  '// ALIBI_PUBLIC_TEXT_EDIT_V1';

const edits = [
  [
    'City Index | Checking a claim',
    'City Index | Around town'
  ],

  [
    'Public listings are leads, not proof of attendance.',
    'Local businesses, community notices and public listings.'
  ],

  [
    'Check the source, date and person before treating a matching name as evidence. The internet once identified our editor as a garden shed.',
    'Our editor was once listed under Garden Buildings. He remains available for editorial enquiries, but not winter storage.'
  ],

  [
    'Unrelated listing. No connection to the dinner enquiry has been established.',
    'Wanted: dining table. Must tolerate elbows. Seller of the previous table need not apply.'
  ],

  [
    'General advertising only. This company does not identify the cause or duration of the Copper Spoon incident.',
    'Domestic and commercial cooker repairs. Please have the make and model ready. “The angry one” is insufficiently specific.'
  ],

  [
    'For the current enquiry, use his existing Box 17 correspondence. Please do not telephone everyone named Finch.',
    'Members choose which contact details appear in the public directory.'
  ],

  [
    'No identifying details link this namesake to your client. A shared name is not a shared life.',
    'The collection notes cover silver marks, decorative handles and a surprisingly heated dispute about a soup ladle.'
  ],

  [
    'Enjoys cold sandwiches, sensible receipts and being consulted before appearing in other people’s plans.',
    'Books, quiet lunches and plans which involve being asked first.'
  ],

  [
    'Public contact details are available in the community directory. Family invitations are currently under review.',
    'Local volunteering, community events and food worth leaving the house for.'
  ],

  [
    'Member of the local tabletop circle. A profile is not a timed attendance record.',
    'Member of the local tabletop circle. Still waiting for an opponent to appreciate his opening strategy.'
  ],

  [
    'Work contact appears in the Morrow Records staff directory. This preview contains no incident evidence.',
    'Work enquiries through the Morrow Records staff directory. Personal networking requests will be admired from a distance.'
  ],

  [
    'Our archive review praises the soup. The review is older than the current service notice.',
    'From our review archive: a Saturday lunch, three years ago.'
  ],

  [
    'Archived reviews are preserved as originally published. Current menus and service changes should be checked with the restaurant.',
    'Originally published in the Saturday dining supplement. The reviewer still considers the bread basket a personal triumph.'
  ],

  [
    'This guide covers decorative metalware, not a restaurant.',
    'Decorative copper spoons reward careful cleaning. They do not reward being used to scrape burnt porridge.'
  ],

  [
    'This vacancy notice does not list current employees or previous shift assignments.',
    'Please include relevant experience and availability in your application. Carrying six plates is impressive; returning with all six is preferred.'
  ],

  [
    'This is a home recipe. We do not supply The Copper Spoon, and our saucepan has never been called as a witness.',
    'Serve with bread or croutons. If serving directly from the saucepan, describe the presentation as rustic.'
  ],

  [
    'A stain cannot identify a guest, establish a date or explain why Uncle Bernard was holding two glasses.',
    'Uncle Bernard recommends keeping the tablecloth in a cupboard. His dinner parties remain difficult to book.'
  ],

  [
    'This is a retail offer. We do not maintain restaurant guest records or individual dining receipts.',
    'Offers apply to selected bottles in the shop. Ask at the counter for the current selection.'
  ],

  [
    'An archived discussion from another town. Several replies recommend shouting.',
    'An archived winter discussion from Northbridge. Several replies recommend shouting.'
  ],

  [
    'The author does not name The Copper Spoon. This thread concerns a different kitchen and a different service.',
    'PanHandling: “Engineer booked. Cold lunch sold better than expected. The chef says this proves nothing.”'
  ],

  [
    'We sell blank stationery. We cannot provide a copy of a receipt issued by another business.',
    'Choose from pocket, counter and desk formats. Carbon paper included; legible handwriting remains your responsibility.'
  ],

  [
    'Contributor biography: based in Northbridge for forty years. No restaurant visits or personal contact details are listed here.',
    'Arthur has lived in Northbridge for forty years. The robin has occupied the shed for three months and already behaves like the landlord.'
  ],

  [
    'Nora has worked as a baker for twenty years. This business biography does not mention community-event work.',
    'Nora has worked as a baker for twenty years. Her edible roses are considerably better behaved than the real ones outside the studio.'
  ],

  [
    'This profile identifies a full-time tackle-shop owner. It contains no board-game club membership or dinner attendance records.',
    'Simon runs the Westhaven shop full-time. Repairs and equipment advice are available at the counter.'
  ],

  [
    'Historical costume hire in Millchester. No accounting services, even in costume.',
    'Historical costume hire in Millchester. Capes, crowns and inconveniently wide skirts.'
  ],

  [
    'Her public biography describes a career in costume design, not an accounts role at Morrow Records.',
    'Evelyn’s work includes costume design, alterations and convincing amateur kings that the crown is a rental.'
  ],

  [
    'This page concerns physical deliveries. No restaurant bookings, dinner companions or revised personal histories are included.',
    'Prepaid parcels should be labelled and ready before the collection window. Unlabelled boxes will be treated as an attempt at mystery.'
  ],

  [
    'The label “revision 2” appears in many unrelated documents. On its own, it does not identify the author or the source.',
    'Revision 2 usually follows revision 1. The emergency version found on a memory stick may follow no recognised system at all.'
  ],

  [
    'Compare the document title, exact wording and originating organisation before linking two files.',
    'Choose a consistent naming system. Adding more exclamation marks is not version control.'
  ],

  [
    'Respectability is not a certification. Anyone can put the word on a website, including us.',
    'Arrive when invited, learn your host’s name and allow someone else to finish a sentence before describing your investments.'
  ],

  [
    'This etiquette column does not provide witnesses, bookings or confirmation of anyone’s movements.',
    'If you drop a fork, ask for another. Crawling under the table is rarely the impression you intended to make.'
  ],

  [
    'This article discusses marketing offers in general. It does not reproduce material from the Tuesday Alibi Club.',
    'Keep the offer terms and check any cancellation instructions before handing over your payment details.'
  ],

  [
    'Recurring Tuesday activities. Attendance not guaranteed, even by the organisers.',
    'Bridge, pottery and choir practice in our weekly listings.'
  ],

  [
    'WEEKLY LISTINGS — recurring events, not a guest register.',
    'WEEKLY LISTINGS'
  ],

  [
    'A weekly listing does not establish that an event ran on a particular date or that a particular person attended.',
    'Contact the organisers for booking details and schedule changes. The pottery group has asked us to stop printing “bring your own kiln”.'
  ],

  [
    'This is an opinion column, not a record of any particular restaurant visit.',
    'Order what you want. You are not obliged to choose something which looks convincing in the empty chair’s photograph.'
  ]
];

function quoteSingle(value) {
  return "'" + value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n') + "'";
}

async function main() {
  const unknown = process.argv
    .slice(2)
    .filter(arg => arg !== '--check');

  if (unknown.length) {
    throw new Error(
      'Usage: node tools/edit-alibi-public-text.mjs [--check]'
    );
  }

  const original = await readFile(
    file,
    'utf8'
  );

  if (original.includes(marker)) {
    console.log(
      'Alibi public text is already updated. No files changed.'
    );
    return;
  }

  let updated = original;

  for (const [oldText, newText] of edits) {
    const literals = [
      quoteSingle(oldText),
      JSON.stringify(oldText)
    ];

    const found = literals.filter(
      literal => updated.includes(literal)
    );

    if (
      found.length !== 1 ||
      updated.split(found[0]).length !== 2
    ) {
      throw new Error(
        'Expected one text literal, found a changed or ambiguous passage:\n' +
        oldText +
        '\nNo files changed.'
      );
    }

    updated = updated.replace(
      found[0],
      () => JSON.stringify(newText)
    );
  }

  updated += '\n' + marker + '\n';

  try {
    execFileSync(
      process.execPath,
      ['--input-type=module', '--check'],
      {
        input: updated,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
  } catch (error) {
    throw new Error(
      'JavaScript syntax check failed:\n' +
      (error.stderr || error.message)
    );
  }

  if (process.argv.includes('--check')) {
    console.log(
      edits.length +
      ' text edits and JavaScript syntax checked. No files changed.'
    );
    return;
  }

  const backup = path.join(
    root,
    'backups',
    'alibi-public-text-' +
      new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
  );

  await mkdir(
    backup,
    { recursive: true }
  );

  await copyFile(
    file,
    path.join(
      backup,
      'AlibiSearchExpansion.js'
    )
  );

  const temporary =
    file + '.text-edit.tmp';

  try {
    await writeFile(
      temporary,
      updated,
      'utf8'
    );

    await rename(
      temporary,
      file
    );
  } finally {
    await rm(
      temporary,
      { force: true }
    );
  }

  console.log(
    'Updated ' +
    edits.length +
    ' public text passages. Reload the game.'
  );

  console.log(
    'Backup: ' +
    path.relative(root, backup)
  );
}

main().catch(error => {
  console.error(
    '[Alibi text] ' + error.message
  );

  process.exitCode = 1;
});