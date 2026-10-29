const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const OBJECTS_DIR = path.join(DATA_DIR, 'objects');

const PATCHES = [
  {
    itemId: 'art_history_book',
    questionId: 'identify_target',
    addSkills: ['History']
  },
  {
    itemId: 'art_history_book',
    questionId: 'avoid_attention',
    addSkills: ['History']
  },
  {
    itemId: 'antiques_card',
    questionId: 'identify_target',
    addSkills: ['History']
  },
  {
    itemId: 'museum_map',
    questionId: 'gain_access',
    addSkills: ['History']
  },
  {
    itemId: 'broken_access_card',
    questionId: 'gain_access',
    addSkills: ['Pickpocket']
  },
  {
    itemId: 'fancy_hat',
    questionId: 'distract_guards',
    addSkills: ['Pickpocket']
  },
  {
    itemId: 'empty_display_case',
    questionId: 'hide_theft',
    newUse: {
      questionId: 'hide_theft',
      skills: ['Forgery', 'Art history', 'Deception'],
      heistExplanation:
        'A near-perfect replica went into the case before anyone looked closely, so the museum admired the fake for hours.'
    }
  },
  {
    itemId: 'crowbar',
    questionId: 'overcome_guard',
    addSkills: ['Martial arts']
  },
  {
    itemId: 'tools',
    questionId: 'overcome_guard',
    newUse: {
      questionId: 'overcome_guard',
      skills: ['Problem-solving', 'Engineering', 'Intimidation'],
      heistExplanation:
        'A heavy wrench and a very serious expression persuaded the guard that stepping aside was a career-saving decision.'
    }
  }
];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function listFiles() {
  const files = [path.join(DATA_DIR, 'objects.json')];

  if (fs.existsSync(OBJECTS_DIR)) {
    fs.readdirSync(OBJECTS_DIR)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .forEach((name) => files.push(path.join(OBJECTS_DIR, name)));
  }

  return files.filter((file) => fs.existsSync(file));
}

function getItems(json, file) {
  if (Array.isArray(json)) {
    return json;
  }

  for (const key of ['objects', 'items', 'hiddenObjects']) {
    if (Array.isArray(json?.[key])) {
      return json[key];
    }
  }

  throw new Error(`Unsupported JSON structure: ${file}`);
}

function applyPatch(items, patch) {
  const item = items.find((entry) => entry.id === patch.itemId);

  if (!item) {
    return 'missing item';
  }

  if (!Array.isArray(item.reconstructionUses)) {
    item.reconstructionUses = [];
  }

  if (patch.newUse) {
    const exists = item.reconstructionUses.some(
      (use) => use.questionId === patch.newUse.questionId
    );

    if (exists) {
      return 'already present';
    }

    item.reconstructionUses.push({
      questionId: patch.newUse.questionId,
      skills: [...patch.newUse.skills],
      heistExplanation: patch.newUse.heistExplanation
    });

    return 'added use';
  }

  const use = item.reconstructionUses.find(
    (entry) => entry.questionId === patch.questionId
  );

  if (!use) {
    return 'missing use';
  }

  if (!Array.isArray(use.skills)) {
    use.skills = [];
  }

  let changed = false;

  patch.addSkills.forEach((skill) => {
    const exists = use.skills.some(
      (entry) => normalize(entry) === normalize(skill)
    );

    if (!exists) {
      use.skills.push(skill);
      changed = true;
    }
  });

  return changed ? 'added skill' : 'already present';
}

function main() {
  const files = listFiles();

  if (files.length === 0) {
    throw new Error('No object data files found.');
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);

  const backupDir = path.join(ROOT, 'backups', `objects-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const touched = new Set();

  files.forEach((file) => {
    const relative = path.relative(ROOT, file);
    const original = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(original);
    const items = getItems(json, file);

    console.log(`\n${relative}`);

    let changed = false;

    PATCHES.forEach((patch) => {
      const result = applyPatch(items, patch);

      if (result === 'added use' || result === 'added skill') {
        changed = true;
        touched.add(relative);
      }

      if (result !== 'missing item') {
        console.log(
          `  ${patch.itemId} / ${patch.questionId}: ${result}`
        );
      }
    });

    if (changed) {
      const backupFile = path.join(backupDir, relative);
      fs.mkdirSync(path.dirname(backupFile), { recursive: true });
      fs.writeFileSync(backupFile, original, 'utf8');

      fs.writeFileSync(
        file,
        JSON.stringify(json, null, 2) + '\n',
        'utf8'
      );
    }
  });

  console.log(`\nChanged files: ${touched.size}`);
  touched.forEach((file) => console.log(`  ${file}`));
  console.log(`Backups: ${path.relative(ROOT, backupDir)}`);
}

main();