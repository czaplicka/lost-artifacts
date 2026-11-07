import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

import {
  knownWords,
  cloudCase,
  namingOptions,
  createCloud,
  nameCloud,
  addCloudWords,
  removeCloudWords,
  deleteCloud,
  linkClouds,
  unlinkClouds,
  unsortedWords,
  cloudTitle
} from './PlayerCloudModel.js';

import { useCloudKeyword } from './PlayerCloudContacts.js';
import { syncNotebookSearchCase } from './NotebookSearchContext.js';

import {
  notebookContact
} from './pi-computer/NotebookContactActions.js';

// CASE_NOTES_RESTYLE_V1
// Visual-only pass: leather-bound PI notebook, aged paper, thought-cloud
// cards, typewriter slips. All class names from the previous version are
// kept (pcn-*), logic and public API are unchanged.

const PIXEL = "PressStart2P,'Press Start 2P',monospace";

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence " +
  "type='fractalNoise' baseFrequency='.8' numOctaves='2' " +
  "stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .45 0 0 0 0 " +
  ".33 0 0 0 0 .12 0 0 0 .14 0'/%3E%3C/filter%3E%3Crect width='160' " +
  "height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

const CHECK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "viewBox='0 0 12 12'%3E%3Cpath d='M1.5 6.5 4.8 10 10.8 1.8' fill='none' " +
  "stroke='%239b2f22' stroke-width='2.2' stroke-linecap='round' " +
  "stroke-linejoin='round'/%3E%3C/svg%3E\")";

const ARROW =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "viewBox='0 0 10 6'%3E%3Cpath d='M0 0h10L5 6z' fill='%2327434f'/%3E" +
  "%3C/svg%3E\")";

const CSS = `
.pcn{
  --paper:#eadfb4;--paper-hi:#f6eccb;--paper-lo:#d8c995;
  --ink:#27434f;--ink-soft:#52707b;--red:#9b2f22;
  --gold:#d4af37;--gold-dk:#8a6a16;--brass:#a89560;
  --leather:#2b1a0e;--leather-hi:#4a2f1b;--rule:rgba(72,112,130,.24);
  position:fixed;z-index:11000;left:8px;right:8px;bottom:0;
  font-family:SpecialElite,'Special Elite',monospace;color:var(--ink);
  pointer-events:none
}
.pcn *{box-sizing:border-box}
.pcn [hidden]{display:none!important}
.pcn button,.pcn select,.pcn input{font:inherit;touch-action:manipulation}

/* ---------- base button (low specificity so every variant can override) */
:where(.pcn) button{
  border:1px solid #8f8050;border-bottom-width:3px;border-radius:3px;
  background:linear-gradient(#f9f0cf,#e5d8a2);color:var(--ink);
  padding:5px 10px 4px;min-height:34px;cursor:pointer;font-size:12px;
  letter-spacing:.04em;text-transform:uppercase;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.65);
  transition:transform .08s,background .12s
}
:where(.pcn) button:hover:not(:disabled){
  background:linear-gradient(#fffbe4,#efe3b0);transform:translateY(-1px)
}
:where(.pcn) button:active:not(:disabled){
  transform:translateY(1px);border-bottom-width:1px
}
.pcn button:focus-visible{outline:2px solid var(--red);outline-offset:1px}
.pcn button:disabled{opacity:.4;cursor:default}

/* ---------- handle: leather tab sticking out of the notebook */
.pcn .pcn-handle{
  display:block;position:relative;margin:auto;pointer-events:auto;
  min-width:230px;min-height:34px;padding:9px 18px 8px;
  border:2px solid var(--gold-dk);border-bottom:0;
  border-radius:9px 9px 0 0;
  background:linear-gradient(#5a3a22,var(--leather));
  color:var(--gold);font-family:${PIXEL};font-size:9px;line-height:1.4;
  letter-spacing:.06em;text-shadow:0 1px 0 #000;
  box-shadow:inset 0 1px 0 rgba(255,220,140,.25),0 -3px 10px rgba(0,0,0,.35)
}
.pcn .pcn-handle:hover,.pcn .pcn-handle:focus-visible{
  background:linear-gradient(#6b4529,#34200f);color:#ffe08a;transform:none;
  outline:2px solid var(--gold);outline-offset:-4px
}
.pcn .pcn-handle:active{transform:none;border-bottom:0}

/* ---------- paper */
.pcn .pcn-paper{
  position:relative;pointer-events:auto;display:flex;flex-direction:column;
  height:min(46vh,440px);min-height:250px;padding:10px 14px 8px 46px;
  border:2px solid #9c8a57;border-bottom:0;border-radius:3px 6px 0 0;
  background-color:var(--paper);
  background-image:
    radial-gradient(circle at 93% 16%,transparent 0 20px,
      rgba(120,80,30,.13) 21px 24px,transparent 25px),
    ${NOISE},
    radial-gradient(ellipse at 100% 0,rgba(150,105,40,.20),transparent 55%),
    radial-gradient(ellipse at 0 100%,rgba(150,105,40,.16),transparent 50%);
  box-shadow:0 -6px 22px rgba(0,0,0,.45),inset 0 0 40px rgba(120,85,30,.18);
  animation:pcn-rise .22s ease-out
}
@keyframes pcn-rise{
  from{transform:translateY(14px);opacity:0}
  to{transform:none;opacity:1}
}
/* leather spine with brass-ringed holes */
.pcn .pcn-paper::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:32px;
  pointer-events:none;border-right:1px solid #1d1209;
  background:
    radial-gradient(circle at 50% 50%,#0d0804 0 4px,#c9a44a 4.5px 6px,
      transparent 6.5px) 0 0/32px 40px repeat-y,
    linear-gradient(90deg,var(--leather),var(--leather-hi) 70%,#33200f)
}

/* ---------- header */
.pcn .pcn-top{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px}
.pcn .pcn-title{
  font-family:${PIXEL};font-size:10px;letter-spacing:.05em;color:#6b4f12;
  text-shadow:0 1px 0 rgba(255,248,215,.8);white-space:nowrap
}
.pcn .pcn-title::before{content:'\\25C6  ';color:var(--gold-dk)}
.pcn .pcn-grow{flex:1 1 0;min-width:0}
.pcn .pcn-stamp{
  font-size:11px;letter-spacing:.08em;color:var(--red);white-space:nowrap;
  border:2px solid var(--red);border-radius:3px;padding:2px 7px 1px;
  transform:rotate(-2.5deg);opacity:.85;
  box-shadow:inset 0 0 0 1px rgba(155,47,34,.35)
}
.pcn select{
  appearance:none;-webkit-appearance:none;max-width:250px;min-height:34px;
  padding:6px 28px 5px 10px;font-size:13px;cursor:pointer;color:var(--ink);
  background:#f7edc9 ${ARROW} right 9px center/10px no-repeat;
  border:1px solid #8f8050;border-bottom-width:3px;border-radius:3px
}
.pcn select:focus-visible{outline:2px solid var(--red);outline-offset:1px}
.pcn .pcn-tabs{display:inline-flex}
.pcn .pcn-tabs button{border-radius:0;font-size:11px}
.pcn .pcn-tabs button:first-child{border-radius:3px 0 0 3px}
.pcn .pcn-tabs button:last-child{border-radius:0 3px 3px 0;border-left-width:0}
.pcn button.pcn-selected,
.pcn button.pcn-selected:hover:not(:disabled){
  background:linear-gradient(#35566a,#25414f);color:var(--gold);
  border-color:#162a34;box-shadow:inset 0 2px 4px rgba(0,0,0,.35);transform:none
}

/* ---------- working area */
.pcn .pcn-work{
  display:grid;grid-template-columns:minmax(190px,26%) 1fr;gap:14px;
  min-height:0;flex:1
}
.pcn .pcn-bank,.pcn .pcn-board,.pcn .pcn-names{
  scrollbar-width:thin;scrollbar-color:#8f8050 transparent
}
.pcn ::-webkit-scrollbar{width:9px;height:9px}
.pcn ::-webkit-scrollbar-track{background:transparent}
.pcn ::-webkit-scrollbar-thumb{
  background:#8f8050;border-radius:5px;border:2px solid var(--paper)
}

/* bank = ruled page, words sit on the lines */
.pcn .pcn-bank{
  overflow:auto;padding:0 10px 0 2px;border-right:3px double var(--brass);
  background-image:repeating-linear-gradient(to bottom,transparent 0 27px,
    var(--rule) 27px 28px);
  background-attachment:local
}
.pcn .pcn-bank h3{
  display:flex;align-items:center;gap:8px;margin:0;line-height:28px;
  font-family:${PIXEL};font-size:9px;font-weight:normal;color:#6b4f12
}
.pcn .pcn-count{
  font-family:SpecialElite,'Special Elite',monospace;font-size:11px;
  line-height:16px;padding:0 7px;border-radius:9px;
  background:var(--ink);color:var(--gold)
}
.pcn .pcn-bank > button{min-height:28px;margin:0;padding:2px 8px 1px;font-size:11px}
.pcn .pcn-words{display:flex;flex-direction:column;gap:0}

.pcn .pcn-word{
  display:flex;align-items:center;gap:8px;min-height:28px;padding:0 4px;
  font-size:14px;line-height:1.15;border-radius:2px
}
.pcn label.pcn-word{cursor:pointer}
.pcn label.pcn-word:hover{background:rgba(212,175,55,.18)}
.pcn .pcn-word:has(input:checked){background:rgba(212,175,55,.28)}

/* custom checkbox: tick it with red pencil */
.pcn .pcn-word input{
  appearance:none;-webkit-appearance:none;width:16px;height:16px;margin:0;
  flex-shrink:0;cursor:pointer;border:2px solid var(--ink);border-radius:2px;
  background:#fbf4d6 center/12px no-repeat
}
.pcn .pcn-word input:checked{background-image:${CHECK}}
.pcn .pcn-word input:focus-visible{outline:2px solid var(--red);outline-offset:2px}

.pcn .pcn-word button{
  width:100%;min-height:26px;padding:2px 4px;border:0;border-radius:2px;
  background:transparent;box-shadow:none;transform:none;text-align:left;
  text-transform:none;letter-spacing:0;font-size:inherit;
  overflow-wrap:anywhere
}
.pcn .pcn-word button:hover:not(:disabled){background:rgba(212,175,55,.22);transform:none}
.pcn .pcn-word button:active:not(:disabled){transform:none}
/* "use words" mode: marker-pen highlighted leads */
.pcn .pcn-lead button{
  background:linear-gradient(transparent 58%,rgba(212,175,55,.42) 58%)
}
.pcn .pcn-lead button:hover:not(:disabled){background:rgba(212,175,55,.55)}
.pcn .pcn-word .pcn-email{
  color:#17406b;text-decoration:underline;text-underline-offset:3px
}
.pcn .pcn-word .pcn-email::before{content:'\\2709  ';text-decoration:none}
.pcn .pcn-word .pcn-email:hover,.pcn .pcn-word .pcn-email:focus-visible{color:#8a3d26}

.pcn .pcn-empty{margin:6px 4px;font-size:13px;font-style:italic;color:var(--ink-soft)}

/* ---------- clouds */
.pcn .pcn-board{overflow:auto;min-width:0}
.pcn .pcn-clouds{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:30px 16px;padding:8px 10px 34px
}
.pcn .pcn-clouds > .pcn-empty{grid-column:1/-1}
.pcn .pcn-cloud{
  position:relative;min-height:140px;padding:18px 26px 22px;
  border:2px dashed var(--ink-soft);
  border-radius:46% 54% 50% 50% / 34% 38% 62% 66%;
  background:radial-gradient(ellipse at 30% 20%,#f7efcf,#eee3b8 70%);
  box-shadow:0 3px 0 rgba(90,70,30,.18),0 8px 14px rgba(60,40,10,.15);
  transition:transform .15s,box-shadow .15s
}
.pcn .pcn-cloud:nth-child(odd){transform:rotate(-.6deg)}
.pcn .pcn-cloud:nth-child(even){transform:rotate(.5deg)}
.pcn .pcn-cloud:hover{transform:rotate(0) translateY(-2px)}
/* thought-bubble dots */
.pcn .pcn-cloud::before,.pcn .pcn-cloud::after{
  content:'';position:absolute;border-radius:50%;
  border:2px solid var(--ink-soft);background:#eee3b8
}
.pcn .pcn-cloud::before{width:13px;height:13px;left:16%;bottom:-13px}
.pcn .pcn-cloud::after{width:8px;height:8px;left:11%;bottom:-25px}
.pcn .pcn-cloud.pcn-active{
  border-style:solid;border-color:var(--red);
  background:radial-gradient(ellipse at 30% 20%,#fffbe0,#f6ebbf 70%);
  box-shadow:0 0 0 3px rgba(212,175,55,.55),0 10px 18px rgba(60,40,10,.25)
}
.pcn .pcn-cloud.pcn-active::before,.pcn .pcn-cloud.pcn-active::after{
  border-color:var(--red);background:#f6ebbf
}
.pcn .pcn-cloud-title{
  display:block;width:100%;min-height:28px;padding:2px 4px 6px;
  border:0;border-bottom:1px dotted var(--ink-soft);border-radius:0;
  background:transparent;box-shadow:none;transform:none;color:var(--ink);
  font-size:15px;line-height:1.2;text-align:center;
  text-transform:none;letter-spacing:0
}
.pcn .pcn-cloud-title:hover:not(:disabled){background:rgba(212,175,55,.2);transform:none}
.pcn .pcn-cloud .pcn-word{font-size:13px;min-height:26px}
.pcn .pcn-cloud .pcn-word button{font-size:13px}
.pcn .pcn-cloud .pcn-empty{margin:8px 0 0;text-align:center;font-size:12px}
/* red string to linked clouds */
.pcn .pcn-cloud small{
  display:block;margin-top:6px;padding-top:4px;font-size:12px;color:var(--red);
  border-top:1px dashed rgba(155,47,34,.5)
}

/* ---------- tools strip */
.pcn .pcn-tools{
  display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px;
  padding:8px 0 0;border-top:3px double var(--brass);font-size:13px
}
.pcn .pcn-tools button{min-height:30px;padding:3px 8px 2px;font-size:11px}
.pcn .pcn-tools select{min-height:30px;max-width:160px;font-size:12px}
.pcn .pcn-tools button.pcn-primary{
  background:linear-gradient(#ecce63,#c9a02c);border-color:#7a5d12;color:var(--leather)
}
.pcn .pcn-tools button.pcn-primary:hover:not(:disabled){
  background:linear-gradient(#f5da7c,#d6ac36)
}
.pcn .pcn-tools button.pcn-danger{color:var(--red);border-color:#8a3a2c}
.pcn .pcn-tools .pcn-sel{margin-left:auto;font-size:12px;opacity:.8;white-space:nowrap}

.pcn .pcn-status{
  min-height:18px;margin-top:6px;font-size:12px;font-style:italic;color:var(--ink-soft)
}
.pcn .pcn-status::before{content:'\\25B8  ';color:var(--red);font-style:normal}

/* ---------- name-cloud dialog: a taped slip of paper */
.pcn .pcn-dialog{
  position:absolute;left:50%;top:50%;z-index:3;
  width:min(520px,calc(100% - 40px));padding:24px 22px 18px;
  transform:translate(-50%,-50%) rotate(-.4deg);
  background:var(--paper-hi);border:2px solid var(--ink-soft);
  box-shadow:0 14px 30px rgba(0,0,0,.45)
}
.pcn .pcn-dialog::before{
  content:'';position:absolute;top:-11px;left:50%;width:96px;height:22px;
  margin-left:-48px;transform:rotate(-2deg);background:rgba(222,196,120,.78);
  box-shadow:0 1px 2px rgba(0,0,0,.2)
}
.pcn .pcn-dialog h3{
  margin:0 0 10px;font-family:${PIXEL};font-size:10px;line-height:1.5;
  font-weight:normal;color:#6b4f12
}
.pcn .pcn-dialog p{margin:0;font-size:13px}
.pcn .pcn-names{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0;max-height:150px;overflow:auto}
.pcn .pcn-dialog > button{margin-right:6px}

@media(max-width:650px){
  .pcn .pcn-paper{height:55vh;min-height:280px;padding:7px 8px 6px 34px}
  .pcn .pcn-paper::before{width:22px;background-size:22px 40px,auto}
  .pcn .pcn-work{grid-template-columns:minmax(120px,34%) 1fr;gap:6px}
  .pcn .pcn-clouds{grid-template-columns:1fr}
  .pcn .pcn-top select{max-width:170px}
  .pcn .pcn-title,.pcn .pcn-stamp{display:none}
  .pcn .pcn-tools button{font-size:10px;padding:3px 6px 2px}
  .pcn .pcn-tools .pcn-sel{margin-left:0;white-space:normal}
}
@media(prefers-reduced-motion:reduce){
  .pcn,.pcn *{animation:none!important;transition:none!important}
  .pcn .pcn-cloud:nth-child(odd),.pcn .pcn-cloud:nth-child(even),
  .pcn .pcn-cloud:hover{transform:none}
}
`;

function el(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}

function mark(node, cls) {
  node.classList.add(cls);
  return node;
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

export function notebookKeywordLocation(definition, keywordId) {
  const word = knownWords(gameState, definition).find(
    entry => entry.id === keywordId
  );

  if (!word) return null;

  const clouds = cloudCase(gameState, definition.id).clouds;
  const index = clouds.findIndex(
    cloud => cloud.words.includes(keywordId)
  );

  return {
    cloudId: index < 0 ? 'unsorted' : clouds[index].id,
    cloudPage: 0,
    wordPage: 0
  };
}

export function installPlayerCloudNotebook(ui) {
  if (ui.caseCloudNotebook) return ui.caseCloudNotebook;

  const state = ui.state || gameState;

  let dead = false;
  let collapsed =
    state.playerCloudViewV1?.collapsed !== false;

  let caseId =
    state.playerCloudViewV1?.selectedCaseId ||
    state.piKeywordSearch?.selectedCaseId ||
    null;

  let activeId = null;
  let mode = 'organise';
  let all = false;
  let dialogId = null;

  const bankSelection = new Set();
  const memberSelection = new Set();

  let message = '';
  let signature = '';
  let busy = false;

  // Remembers which case the scroll offsets below belong to.
  let scrollCaseId = null;

  const root = el('section', undefined, 'pcn');
  const style = el('style', CSS);

  document.head.append(style);
  document.body.append(root);

  const handle = el('button', 'CASE NOTES', 'pcn-handle');
  handle.type = 'button';

  const paper = el('section', undefined, 'pcn-paper');
  root.append(handle, paper);

  // OFFICE_NOTEBOOK_MANUAL_OPEN_V1
  function officeAvailable() {
    const scene = ui.scene;

    return Boolean(
      scene?.sys?.settings?.key === 'DetectiveOfficeScene' &&
      scene.sys.isActive() &&
      !scene.disposed &&
      !scene._cleanupDone &&
      !scene.navigating &&
      !scene.debugMode &&
      !scene.activeDevice &&
      !scene.computerChild &&
      !scene.childLoading
    );
  }

  const live = () =>
    !dead &&
    !ui.destroyed &&
    ui.scene?.sys?.isActive() &&
    !ui.suspended &&
    (ui.isOpen || officeAvailable());

  const definitions = () =>
    Array.isArray(ui.search?.data?.cases)
      ? ui.search.data.cases
      : [];

  const cases = () => definitions().filter(
    definition =>
      knownWords(state, definition).length ||
      cloudCase(state, definition.id).clouds.length
  );

  const selected = () => definitions().find(
    definition => definition.id === caseId
  );

  function syncSelection() {
    if (!definitions().length) return selected();

    const available = cases();

    if (!available.some(definition => definition.id === caseId)) {
      const preferred = state.piKeywordSearch?.selectedCaseId;

      caseId = (
        available.find(definition => definition.id === preferred) ||
        available[0]
      )?.id || null;

      activeId = null;
      dialogId = null;
      bankSelection.clear();
      memberSelection.clear();
    }

    if (caseId) {
      syncNotebookSearchCase(ui, caseId, state);
    }

    return selected();
  }

  function chooseCase(id, { render = true } = {}) {
    if (dead || !cases().some(definition => definition.id === id)) {
      return false;
    }

    if (caseId !== id) {
      caseId = id;
      activeId = null;
      dialogId = null;
      message = '';
      bankSelection.clear();
      memberSelection.clear();
      signature = '';
    }

    syncNotebookSearchCase(ui, id, state);

    if (render && live() && ui.app === 'search') {
      ui.render();
    } else {
      draw();
    }

    return true;
  }

  function changed() {
    requestAutosave();
    bankSelection.clear();
    memberSelection.clear();
    signature = '';
    draw();
  }

  function button(label, action, disabled = false) {
    const node = el('button', label);
    node.type = 'button';
    node.disabled = disabled;

    node.addEventListener('click', event => {
      event.stopPropagation();
      if (live() && !node.disabled) action();
    });

    return node;
  }

  function setCollapsed(value) {
    collapsed = Boolean(value);

    state.playerCloudViewV1 = {
      ...(state.playerCloudViewV1 || {}),
      collapsed
    };

    requestAutosave();
    draw();
  }

  handle.onclick = () => setCollapsed(!collapsed);

  // Keep browser mouse/touch compatibility events
  // inside the notebook as well as pointer events.
  for (const type of [
    'pointerdown',
    'pointerup',
    'pointermove',
    'pointercancel',
    'mousedown',
    'mouseup',
    'mousemove',
    'touchstart',
    'touchmove',
    'touchend',
    'touchcancel',
    'click',
    'dblclick',
    'contextmenu',
    'wheel',
    'keyup'
  ]) {
    root.addEventListener(
      type,
      event => event.stopPropagation(),
      { passive: true }
    );
  }

  root.addEventListener('keydown', event => {
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();

      if (dialogId) {
        dialogId = null;
        draw();
      } else {
        setCollapsed(true);
      }
    }
  });

  function getEmailContact(word) {
    const numberLength = Number(
      ui.scene.cache.json.get('piPhoneDirectory')?.numberLength
    ) || 3;

    const contact = notebookContact(word, numberLength);

    return contact?.kind === 'email' ? contact : null;
  }

  function emailButton(word, definition) {
    const contact = getEmailContact(word);

    const node = button(
      word.label || contact?.value || 'Email',
      () => use(word, definition)
    );

    node.classList.add('pcn-email');

    if (contact) {
      node.title = `Write to ${contact.value}`;
      node.setAttribute(
        'aria-label',
        `Write an email to ${contact.value}`
      );
    }

    return node;
  }

  function checkbox(word, selection, definition) {
    const email = getEmailContact(word);

    const row = el(
      email ? 'div' : 'label',
      undefined,
      'pcn-word'
    );

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selection.has(word.id);
    input.setAttribute('aria-label', `Select note: ${word.label}`);

    input.onchange = () => {
      if (input.checked) selection.add(word.id);
      else selection.delete(word.id);
      draw();
    };

    row.append(input);

    if (email) {
      row.append(emailButton(word, definition));
    } else {
      row.append(el('span', word.label));
    }

    return row;
  }

  function use(word, definition) {
    if (busy || !live() || ui.booting) return;

    const email = getEmailContact(word);

    if (
      email &&
      typeof ui.photoQuest?.contactMail?.openComposer !== 'function'
    ) {
      message =
        '“I have the address. Now I just need a working mailbox.”';
      draw();
      return;
    }

    busy = true;
    message = '';

    Promise.resolve()
      .then(() => useCloudKeyword(ui, definition, word))
      .catch(error => {
        console.error('[PlayerCloudNotebook]', error);

        message = email
          ? '“The message will have to wait. The mailbox is not cooperating.”'
          : 'This action could not be opened.';
      })
      .finally(() => {
        busy = false;
        draw();
      });
  }

  function wordRow(word, selection, definition) {
    if (mode === 'organise') {
      return checkbox(word, selection, definition);
    }

    const row = el('div', undefined, 'pcn-word pcn-lead');

    row.append(
      getEmailContact(word)
        ? emailButton(word, definition)
        : button(word.label, () => use(word, definition))
    );

    return row;
  }

  function inactiveWordRow(word, definition) {
    if (!getEmailContact(word)) {
      return el('div', word.label, 'pcn-word');
    }

    const row = el('div', undefined, 'pcn-word');
    row.append(emailButton(word, definition));

    return row;
  }

  function draw() {
    if (dead) return;

    root.hidden = !live();
    if (!live()) return;

    const definition = syncSelection();
    const available = cases();

    handle.textContent = collapsed
      ? '▲ CASE NOTES'
      : '▼ HIDE NOTES';

    handle.setAttribute('aria-expanded', String(!collapsed));
    paper.hidden = collapsed;

    if (collapsed) return;

    // Redrawing rebuilds the whole page; keep the reader's place
    // so ticking a word does not throw the list back to the top.
    const keepScroll = scrollCaseId === caseId;

    const bankTop = keepScroll
      ? paper.querySelector('.pcn-bank')?.scrollTop || 0
      : 0;

    const boardTop = keepScroll
      ? paper.querySelector('.pcn-board')?.scrollTop || 0
      : 0;

    scrollCaseId = caseId;

    paper.replaceChildren();

    const top = el('div', undefined, 'pcn-top');

    const heading = el(
      'span',
      'PRIVATE INVESTIGATIONS',
      'pcn-title'
    );

    top.append(heading, el('span', undefined, 'pcn-grow'));

    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Case');

    for (const entry of available) {
      const option = el('option', entry.title);
      option.value = entry.id;
      option.selected = entry.id === caseId;
      select.append(option);
    }

    select.onchange = () => chooseCase(select.value);
    top.append(select);

    const organise = button('ORGANISE', () => {
      mode = 'organise';
      draw();
    });

    const useButton = button('USE WORDS', () => {
      mode = 'use';
      dialogId = null;
      draw();
    });

    (mode === 'organise' ? organise : useButton)
      .classList.add('pcn-selected');

    const tabs = el('span', undefined, 'pcn-tabs');
    tabs.append(organise, useButton);
    top.append(tabs);
    paper.append(top);

    if (!definition) {
      paper.append(
        el(
          'p',
          'Collect a clue to start your notes. The paper is very patient.',
          'pcn-empty'
        )
      );
      return;
    }

    const progress = cloudCase(state, caseId);
    const words = knownWords(state, definition);
    const map = new Map(words.map(word => [word.id, word]));

    heading.after(
      el(
        'span',
        `${plural(words.length, 'CLUE', 'CLUES')} · ` +
        plural(progress.clouds.length, 'CLOUD', 'CLOUDS'),
        'pcn-stamp'
      )
    );

    if (!progress.clouds.some(cloud => cloud.id === activeId)) {
      activeId = null;
    }

    const work = el('div', undefined, 'pcn-work');
    const bank = el('aside', undefined, 'pcn-bank');
    const board = el('div', undefined, 'pcn-board');

    const bankWords = all
      ? words
      : unsortedWords(state, definition);

    const bankHeading = el('h3', all ? 'ALL WORDS' : 'UNSORTED');
    bankHeading.append(
      el('span', String(bankWords.length), 'pcn-count')
    );

    bank.append(
      bankHeading,
      button(all ? 'SHOW UNSORTED' : 'SHOW ALL', () => {
        all = !all;
        bankSelection.clear();
        draw();
      })
    );

    const list = el('div', undefined, 'pcn-words');

    for (const word of bankWords) {
      list.append(wordRow(word, bankSelection, definition));
    }

    if (!bankWords.length) {
      list.append(
        el(
          'p',
          all
            ? 'No words yet. Go interrogate somebody.'
            : 'Nothing unsorted. Suspiciously tidy.',
          'pcn-empty'
        )
      );
    }

    bank.append(list);

    const grid = el('div', undefined, 'pcn-clouds');

    for (const cloud of progress.clouds) {
      const card = el(
        'article',
        undefined,
        'pcn-cloud' + (cloud.id === activeId ? ' pcn-active' : '')
      );

      card.dataset.cloud = cloud.id;

      const title = button(
        cloudTitle(state, definition, cloud) +
        (cloud.titleKey ? ' ?' : ''),
        () => {
          activeId = cloud.id;
          memberSelection.clear();
          draw();
        }
      );

      title.className = 'pcn-cloud-title';
      card.append(title);

      const members = cloud.words.map(id => map.get(id)).filter(Boolean);

      for (const word of members) {
        if (mode === 'organise' && cloud.id !== activeId) {
          card.append(inactiveWordRow(word, definition));
        } else {
          card.append(wordRow(word, memberSelection, definition));
        }
      }

      if (!members.length) {
        card.append(
          el('p', 'Empty cloud. Forecast: no leads.', 'pcn-empty')
        );
      }

      const linked = progress.links
        .filter(link => link.from === cloud.id || link.to === cloud.id)
        .map(link => progress.clouds.find(
          entry => entry.id === (
            link.from === cloud.id ? link.to : link.from
          )
        ))
        .filter(Boolean);

      if (linked.length) {
        card.append(
          el(
            'small',
            '↔ ' + linked.map(
              entry => cloudTitle(state, definition, entry)
            ).join(', ')
          )
        );
      }

      grid.append(card);
    }

    if (!progress.clouds.length) {
      grid.append(
        el(
          'p',
          'Select words and create your first cloud. ' +
          'Nothing is grouped automatically.',
          'pcn-empty'
        )
      );
    }

    board.append(grid);
    work.append(bank, board);
    paper.append(work);

    const tools = el('div', undefined, 'pcn-tools');
    const active = progress.clouds.find(cloud => cloud.id === activeId);

    if (mode === 'organise') {
      tools.append(
        mark(
          button('CREATE CLOUD', () => {
            activeId = createCloud(state, definition, [...bankSelection]);
            changed();
          }),
          'pcn-primary'
        ),
        button(
          'ADD SELECTED',
          () => {
            addCloudWords(state, definition, activeId, [...bankSelection]);
            changed();
          },
          !active || !bankSelection.size
        ),
        button(
          'REMOVE FROM CLOUD',
          () => {
            removeCloudWords(state, caseId, activeId, [...memberSelection]);
            changed();
          },
          !active || !memberSelection.size
        ),
        button(
          'NAME CLOUD',
          () => {
            dialogId = activeId;
            draw();
          },
          !active
        ),
        mark(
          button(
            'DELETE CLOUD',
            () => {
              deleteCloud(state, caseId, activeId);
              activeId = null;
              dialogId = null;
              changed();
            },
            !active
          ),
          'pcn-danger'
        )
      );

      if (active && progress.clouds.length > 1) {
        const targets = document.createElement('select');
        targets.setAttribute('aria-label', 'Link another cloud');

        for (const cloud of progress.clouds.filter(
          entry => entry.id !== activeId
        )) {
          const option = el(
            'option',
            cloudTitle(state, definition, cloud)
          );

          option.value = cloud.id;
          targets.append(option);
        }

        tools.append(
          targets,
          button('LINK', () => {
            linkClouds(state, caseId, activeId, targets.value);
            changed();
          }),
          button('UNLINK', () => {
            unlinkClouds(state, caseId, activeId, targets.value);
            changed();
          })
        );
      }

      tools.append(
        el(
          'span',
          `${bankSelection.size} selected in bank · ` +
          `${memberSelection.size} in cloud`,
          'pcn-sel'
        )
      );
    } else {
      tools.append(
        el(
          'span',
          'Click a word to search, dial a discovered number ' +
          'or use an email address.'
        )
      );
    }

    const status = el(
      'div',
      message ||
      'Names are hypotheses. The notebook does not mark them right or wrong.',
      'pcn-status'
    );

    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    paper.append(tools, status);

    // Restore after the full layout exists so the offsets are not clamped.
    bank.scrollTop = bankTop;
    board.scrollTop = boardTop;

    if (dialogId) {
      const cloud = progress.clouds.find(entry => entry.id === dialogId);

      if (!cloud) {
        dialogId = null;
        return;
      }

      const dialog = el('section', undefined, 'pcn-dialog');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-label', 'Name cloud');

      dialog.append(
        el('h3', 'Choose a hypothesis'),
        el(
          'p',
          'Only names you have encountered are offered. ' +
          'You can change your mind.'
        )
      );

      const names = el('div', undefined, 'pcn-names');

      for (const option of namingOptions(state, definition)) {
        names.append(
          button(option.label, () => {
            nameCloud(state, definition, dialogId, option.id);
            dialogId = null;
            changed();
          })
        );
      }

      dialog.append(
        names,
        button('CLEAR NAME', () => {
          nameCloud(state, definition, dialogId, null);
          dialogId = null;
          changed();
        }),
        button('CANCEL', () => {
          dialogId = null;
          draw();
        })
      );

      paper.append(dialog);
    }
  }

  function revealKeyword(id, keywordId) {
    if (dead || ui.destroyed) return false;

    const definition = definitions().find(
      entry => entry.id === id
    );

    if (
      !definition ||
      !knownWords(state, definition).some(
        word => word.id === keywordId
      )
    ) {
      return false;
    }

    // A collected clue updates the existing notebook.
    // It does not open it, switch cases or clear selections.
    signature = '';
    draw();

    return true;
  }

  const originalRenderNotebook = ui.search.renderNotebook;
  ui.search.renderNotebook = () => {};
  ui.search.notesOpen = false;

  const originalWorkspace = ui.monitor.calculateWorkspace;

  ui.monitor.calculateWorkspace = () => {
    const { width, height } = ui.scene.scale;

    const scale = Math.max(
      .001,
      Math.min(
        Math.max(1, width - 16) / 1120,
        Math.max(1, height - 16) / 800
      )
    );

    return {
      scale,
      left: (width - 1120 * scale) / 2,
      top: (height - 800 * scale) / 2
    };
  };

  const host = ui.monitor;
  const originalRender = host.render;

  const wrapped = function (...args) {
    if (live()) syncSelection();

    const result = originalRender.apply(this, args);
    draw();

    return result;
  };

  host.render = wrapped;

  const originals = [];

  for (const key of ['close', 'suspend', 'resume']) {
    if (typeof ui[key] !== 'function') continue;

    const original = ui[key];

    const wrapper = function (...args) {
      const result = original.apply(this, args);
      draw();
      return result;
    };

    ui[key] = wrapper;
    originals.push([key, original, wrapper]);
  }

  let last = -Infinity;

  const tick = () => {
    if (!live()) {
      root.hidden = true;
      return;
    }

    if (
      !ui.booting &&
      !ui.search.data &&
      !ui.search.loading &&
      !ui.search.error
    ) {
      Promise.resolve(ui.search.load())
        .then(() => {
          if (live()) draw();
        })
        .catch(error => {
          console.error(
            '[PlayerCloudNotebook] Search load failed:',
            error
          );
        });
    }

    if (ui.scene.time.now - last < 250) return;

    last = ui.scene.time.now;

    const next = JSON.stringify([
      state.piKeywordSearch,
      state.playerCloudNotebookV1,
      state.playerCloudViewV1?.selectedCaseId,
      ui.app,
      ui.booting
    ]);

    if (next !== signature) {
      signature = next;
      draw();
    }
  };

  ui.scene.game.events.on('poststep', tick);

  const resize = () => draw();
  ui.scene.scale.on('resize', resize);

  const oldRetro = ui.search.retroButton;
  let retroWrapper = null;

  if (typeof oldRetro === 'function') {
    retroWrapper = function (
      x, y, width, height, label, callback, ...rest
    ) {
      return oldRetro.call(
        this,
        x,
        y,
        width,
        height,
        label,
        label === 'NOTES'
          ? () => setCollapsed(!collapsed)
          : callback,
        ...rest
      );
    };

    ui.search.retroButton = retroWrapper;
  }

  function destroy() {
    if (dead) return;

    dead = true;

    ui.scene.game.events.off('poststep', tick);
    ui.scene.scale.off('resize', resize);
    ui.scene.events.off('shutdown', destroy);
    ui.scene.events.off('destroy', destroy);

    root.remove();
    style.remove();

    if (host.render === wrapped) host.render = originalRender;

    for (const [key, original, wrapper] of originals) {
      if (ui[key] === wrapper) ui[key] = original;
    }

    if (
      retroWrapper &&
      ui.search.retroButton === retroWrapper
    ) {
      ui.search.retroButton = oldRetro;
    }

    ui.search.renderNotebook = originalRenderNotebook;
    ui.monitor.calculateWorkspace = originalWorkspace;
  }

  ui.scene.events.once('shutdown', destroy);
  ui.scene.events.once('destroy', destroy);

  const originalDestroy = ui.destroy;

  ui.destroy = function (...args) {
    destroy();
    return originalDestroy.apply(this, args);
  };

  const api = {
    scope: 'pi',
    selectCase: chooseCase,
    revealKeyword,
    hide: () => setCollapsed(true),
    show: () => setCollapsed(false),
    toggle: () => setCollapsed(!collapsed),

    get collapsed() {
      return collapsed;
    },

    get selectedCaseId() {
      return caseId;
    },

    destroy
  };

  ui.caseCloudNotebook = api;
  draw();

  return api;
}