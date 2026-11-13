const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = process.cwd();
const changes = new Map();
const originals = new Map();
const target = 'assets/data/storageRoomDialogues.json';
const servicePath = 'storageRoomDialogueService.js';
function read(file) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (!originals.has(file)) originals.set(file, text);
  return text;
}
function put(file, text) {
  if (!originals.has(file)) originals.set(file,
    fs.existsSync(path.join(root, file)) ? read(file) : null);
  changes.set(file, text);
}
function replaceOnce(text, from, to, label) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}. No files changed.`);
  return text.replace(from, to);
}
function literal(text) {
  return JSON.parse(JSON.stringify(vm.runInNewContext(`(${text})`, Object.create(null), { timeout: 1000 })));
}
function extractArray(source, name) {
  const pattern = new RegExp(`const ${name}=(\\[[\\s\\S]*?\\n\\]);`);
  const found = source.match(pattern);
  if (!found) throw new Error(`Cannot find ${name}. No files changed.`);
  return { declaration: found[0], value: literal(found[1]) };
}
function checkModule(file, text) {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
    input: text, encoding: 'utf8'
  });
  if (result.status !== 0) throw new Error(`${file}: ${result.stderr || result.error}`);
}

try {
  if (fs.existsSync(path.join(root, target)) || fs.existsSync(path.join(root, servicePath))) {
    throw new Error('The dialogue file or service already exists. Migration stopped to protect your edits.');
  }
  let scene = read('scenes/AgencyStorageScene.js');
  const intro = extractArray(scene, 'INTRO_LINES');
  const replacement = extractArray(scene, 'REISSUE_LINES');
  const returning = extractArray(scene, 'RETURN_LINES');
  const data = {
    speaker: 'Alex Murphy',
    manual: { intro: intro.value, replacement: replacement.value, return: returning.value },
    messages: {}
  };
  for (const [entry, expression] of [
    [intro, 'DIALOGUES.manual.intro'],
    [replacement, 'DIALOGUES.manual.replacement'],
    [returning, 'DIALOGUES.manual.return']
  ]) {
    const name = entry.declaration.match(/^const (\w+)=/)[1];
    scene = replaceOnce(scene, entry.declaration, `const ${name}=${expression};`, name);
  }
  scene = "import { storageRoomDialogues as DIALOGUES } from '../storageRoomDialogueService.js';\n" + scene;
  scene = replaceOnce(scene, "speaker:'Alex Murphy'", 'speaker:DIALOGUES.speaker', 'Storage speaker');
  const pockets = `'"Your pockets are full. Come back with room for a book. Replacements are free; pocket dimensions are not my department."'`;
  if (!scene.includes(pockets)) throw new Error('Cannot find the full-pockets dialogue. No files changed.');
  data.messages.pocketsFull = literal(pockets);
  scene = replaceOnce(scene, pockets, 'DIALOGUES.messages.pocketsFull', 'Full-pockets dialogue');
  put('scenes/AgencyStorageScene.js', scene);

  const sections = [
    ['thirdMission', 'assets/data/thirdMissionStory.json', 'thirdMissionStoryService.js', 'thirdMissionConfig', ['alexLines']],
    ['fourthMission', 'assets/data/fourthMissionStory.json', 'fourthMissionStoryService.js', 'fourthMissionConfig', ['conversation', 'reviewConversation']],
    ['chapterTwo', 'assets/data/chapterTwoOpening.json', 'chapterTwoOpeningService.js', 'chapterTwoOpeningConfig', ['conversation']],
    ['recovery', 'assets/data/alexRecoveryInquiry.json', 'alexRecoveryInquiryService.js', 'alexRecoveryData', ['opening', 'confession']],
    ['escape', 'assets/data/escapeTimeline.json', 'escapeTimelineService.js', 'escapeTimelineData', ['clarification']],
    ['microfilm', 'assets/data/johnMicrofilm.json', 'johnMicrofilmService.js', 'microfilmData', ['intro']]
  ];
  for (const [section, jsonFile, moduleFile, exportName, fields] of sections) {
    const sourceData = JSON.parse(read(jsonFile));
    data[section] = {};
    for (const field of fields) {
      if (!(field in sourceData)) throw new Error(`${jsonFile}: missing ${field}. No files changed.`);
      data[section][field] = sourceData[field];
    }
    let source = read(moduleFile);
    const pattern = new RegExp(`export const ${exportName}\\s*=\\s*await loadJson\\(([^;]+)\\);`, 'g');
    const matches = [...source.matchAll(pattern)];
    if (matches.length !== 1) throw new Error(`${moduleFile}: unexpected config loader. No files changed.`);
    source = source.replace(pattern,
      `export const ${exportName} = { ...(await loadJson($1)), ...storageRoomDialogues.${section} };`);
    source = "import { storageRoomDialogues } from './storageRoomDialogueService.js';\n" + source;
    put(moduleFile, source);
  }

  let microfilm = read('scenes/MicrofilmScene.js');
  const reelText = `"The retained reel is available. Take it to Drebin's archive reader. It is recorded with the case, not stored in an inventory slot."`;
  data.microfilm.received = literal(reelText);
  microfilm = replaceOnce(microfilm, reelText, 'DIALOGUES.microfilm.received', 'Microfilm repeat dialogue');
  microfilm = "import { storageRoomDialogues as DIALOGUES } from '../storageRoomDialogueService.js';\n" + microfilm;
  put('scenes/MicrofilmScene.js', microfilm);

  let reaction = read('systems/WorldNpcReactionModel.js');
  const reactionPattern = /  alex_murphy:(\{[\s\S]*?\n  \}),\n  archivist_drebin:/;
  const found = reaction.match(reactionPattern);
  if (!found) throw new Error('Cannot find Alex reaction lines. No files changed.');
  data.reactions = literal(found[1]);
  reaction = replaceOnce(reaction, found[0], '  alex_murphy:{},\n  archivist_drebin:', 'Reaction lines');
  reaction = replaceOnce(reaction,
    'getWorldNpcReaction(state,npcId,{caseId=null}={})',
    'getWorldNpcReaction(state,npcId,{caseId=null,alexDialogues=null}={})', 'Reaction arguments');
  reaction = replaceOnce(reaction,
    'const lines=LINES[npcId][event.kind];',
    "const lines=(npcId==='alex_murphy'?alexDialogues?.reactions:LINES[npcId])?.[event.kind];",
    'Reaction selection');
  const prefix = "`About the ${event.artifact||'artefact'} case in ${event.cityName||'the city'}.`";
  data.reactionIntro = 'About the {artifact} case in {city}.';
  reaction = replaceOnce(reaction, prefix,
    "(npcId==='alex_murphy'?alexDialogues.reactionIntro.replace(/\\{artifact\\}|\\{city\\}/g,key=>key==='{artifact}'?(event.artifact||'artefact'):(event.cityName||'the city')):" + prefix + ')',
    'Reaction introduction');
  put('systems/WorldNpcReactionModel.js', reaction);

  let hooks = read('ui/WorldNpcReactionHooks.js');
  hooks = "import { storageRoomDialogues } from '../storageRoomDialogueService.js';\n" + hooks;
  hooks = replaceOnce(hooks,
    'getWorldNpcReaction(state,npcId,options)',
    'getWorldNpcReaction(state,npcId,{...options,alexDialogues:storageRoomDialogues})', 'Reaction integration');
  put('ui/WorldNpcReactionHooks.js', hooks);

  put(target, JSON.stringify(data, null, 2) + '\n');
  put(servicePath, `import { loadJson } from './config/loadJson.js';

export const storageRoomDialogues = await loadJson(
  './assets/data/storageRoomDialogues.json', import.meta.url
);

const data = storageRoomDialogues;
function strings(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some(line => typeof line !== 'string')) {
    throw new Error('[Alex dialogues] Invalid text array: ' + label);
  }
}
for (const key of ['intro', 'replacement', 'return']) strings(data.manual?.[key], 'manual.' + key);
for (const [section, fields] of [
  ['thirdMission', ['alexLines']],
  ['fourthMission', ['conversation', 'reviewConversation']],
  ['chapterTwo', ['conversation']],
  ['escape', ['clarification']],
  ['microfilm', ['intro']]
]) for (const field of fields) strings(data[section]?.[field], section + '.' + field);
if (!data.reactions || typeof data.reactions !== 'object') throw new Error('[Alex dialogues] Missing reactions.');
for (const [key, lines] of Object.entries(data.reactions)) strings(lines, 'reactions.' + key);
for (const [label, value] of Object.entries({
  speaker: data.speaker, reactionIntro: data.reactionIntro,
  opening: data.recovery?.opening, received: data.microfilm?.received,
  pocketsFull: data.messages?.pocketsFull
})) if (typeof value !== 'string') throw new Error('[Alex dialogues] Invalid text: ' + label);
if (!Array.isArray(data.recovery?.confession) || data.recovery.confession.length === 0 ||
    data.recovery.confession.some(line => typeof line?.speaker !== 'string' || typeof line?.text !== 'string')) {
  throw new Error('[Alex dialogues] Invalid recovery conversation.');
}
`);

  for (const [file, content] of changes) {
    if (file.endsWith('.js')) checkModule(file, content);
    if (file.endsWith('.json')) JSON.parse(content);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(root, 'alex-dialogue-backups', stamp);
  fs.mkdirSync(backup, { recursive: true });
  const manifest = [];
  for (const [file] of changes) {
    const previous = originals.get(file);
    manifest.push({ path: file, existed: previous !== null });
    if (previous !== null) {
      const dest = path.join(backup, file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, previous);
    }
  }
  fs.writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const written = [];
  try {
    for (const [file, content] of changes) {
      const dest = path.join(root, file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      written.push(file);
      fs.writeFileSync(dest, content);
    }
  } catch (error) {
    for (const file of written.reverse()) {
      const previous = originals.get(file);
      if (previous === null) fs.rmSync(path.join(root, file), { force: true });
      else fs.writeFileSync(path.join(root, file), previous);
    }
    throw error;
  }
  console.log(`Updated ${changes.size} files. Edit ${target} to change Alex's dialogue.`);
  console.log(`Backup: ${path.relative(root, backup)}`);
  console.log('Original story JSON files are unchanged; their old dialogue fields are now overridden by the central file.');
  console.log('Syntax checked. Run npm test and test conversations in the browser before committing.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
