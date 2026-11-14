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

// CASE_NOTES_RESTYLE_V2
// Readability pass inspired by the field-notebook in "Do Not Feed the Monkeys":
//  - one fluid type scale (--fs) so everything is readable on big monitors
//  - taller page + ENLARGE toggle
//  - ruled bank where every word sits exactly on a line
//  - wide hand-drawn ellipse clouds with words flowing inside them
//  - red-pencil arrows between linked clouds
//  - click anywhere on a cloud to select it
// Logic, state shape and public API are unchanged (pcn-* class names kept).

const PIXEL = "PressStart2P,'Press Start 2P',monospace";

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence " +
  "type='fractalNoise' baseFrequency='.8' numOctaves='2' " +
  "stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .45 0 0 0 0 " +
  ".33 0 0 0 0 .12 0 0 0 .10 0'/%3E%3C/filter%3E%3Crect width='160' " +
  "height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

const CHECK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "viewBox='0 0 12 12'%3E%3Cpath d='M1.5 6.5 4.8 10 10.8 1.8' fill='none' " +
  "stroke='%239b2f22' stroke-width='2.4' stroke-linecap='round' " +
  "stroke-linejoin='round'/%3E%3C/svg%3E\")";

const ARROW =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "viewBox='0 0 10 6'%3E%3Cpath d='M0 0h10L5 6z' fill='%231d3a4a'/%3E" +
  "%3C/svg%3E\")";

const SVG_NS = 'http://www.w3.org/2000/svg';

const CSS = `
.pcn{
  /* fluid type scale: 15px on phones -> 19px on big screens */
  --fs:clamp(15px,.75vw + 8.5px,19px);
  --lh:calc(var(--fs)*2);
  --paper:#efe5bd;--paper-hi:#f8f0d0;--paper-lo:#d8c995;
  --ink:#1d3a4a;--ink-soft:#4a6673;--red:#9b2f22;
  --gold:#d4af37;--gold-dk:#8a6a16;--brass:#a89560;
  --leather:#2b1a0e;--leather-hi:#4a2f1b;--rule:rgba(60,100,120,.28);
  position:fixed;z-index:11000;left:8px;right:8px;bottom:0;
  font-family:SpecialElite,'Special Elite',monospace;color:var(--ink);
  font-size:var(--fs);line-height:1.3;
  pointer-events:none
}
.pcn *{box-sizing:border-box}
.pcn [hidden]{display:none!important}
.pcn button,.pcn select,.pcn input{font:inherit;touch-action:manipulation}

/* ---------- base button (low specificity so every variant can override) */
:where(.pcn) button{
  border:1px solid #8f8050;border-bottom-width:3px;border-radius:3px;
  background:linear-gradient(#f9f0cf,#e5d8a2);color:var(--ink);
  padding:.35em .8em .3em;min-height:2.3em;cursor:pointer;font-size:.78em;
  letter-spacing:.05em;text-transform:uppercase;
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
  min-width:15em;min-height:2.6em;padding:.8em 1.6em .7em;
  border:2px solid var(--gold-dk);border-bottom:0;
  border-radius:9px 9px 0 0;
  background:linear-gradient(#5a3a22,var(--leather));
  color:var(--gold);font-family:${PIXEL};font-size:calc(var(--fs)*.6);
  line-height:1.4;letter-spacing:.06em;text-shadow:0 1px 0 #000;
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
  height:min(62vh,660px);min-height:290px;padding:.8em 1em .6em 46px;
  border:2px solid #9c8a57;border-bottom:0;border-radius:3px 6px 0 0;
  background-color:var(--paper);
  background-image:
    radial-gradient(circle at 97% 92%,transparent 0 20px,
      rgba(120,80,30,.10) 21px 24px,transparent 25px),
    ${NOISE},
    radial-gradient(ellipse at 100% 0,rgba(150,105,40,.16),transparent 55%),
    radial-gradient(ellipse at 0 100%,rgba(150,105,40,.14),transparent 50%);
  box-shadow:0 -6px 22px rgba(0,0,0,.45),inset 0 0 40px rgba(120,85,30,.16);
  animation:pcn-rise .22s ease-out
}
.pcn.pcn-big .pcn-paper{height:min(90vh,1000px)}
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
.pcn .pcn-top{
  display:flex;align-items:center;flex-wrap:wrap;gap:.6em;margin-bottom:.6em
}
.pcn .pcn-title{
  font-family:${PIXEL};font-size:calc(var(--fs)*.62);letter-spacing:.05em;
  color:#6b4f12;text-shadow:0 1px 0 rgba(255,248,215,.8);white-space:nowrap
}
.pcn .pcn-title::before{content:'\\25C6  ';color:var(--gold-dk)}
.pcn .pcn-grow{flex:1 1 0;min-width:0}
.pcn .pcn-stamp{
  font-size:.72em;letter-spacing:.08em;color:var(--red);white-space:nowrap;
  border:2px solid var(--red);border-radius:3px;padding:.2em .6em .1em;
  transform:rotate(-2.5deg);opacity:.9;
  box-shadow:inset 0 0 0 1px rgba(155,47,34,.35)
}
.pcn select{
  appearance:none;-webkit-appearance:none;max-width:16em;min-height:2.3em;
  padding:.4em 2em .35em .7em;font-size:.88em;cursor:pointer;color:var(--ink);
  background:#f9f0cc ${ARROW} right .7em center/.7em no-repeat;
  border:1px solid #8f8050;border-bottom-width:3px;border-radius:3px
}
.pcn select:focus-visible{outline:2px solid var(--red);outline-offset:1px}
.pcn .pcn-tabs{display:inline-flex}
.pcn .pcn-tabs button{border-radius:0;font-size:.78em}
.pcn .pcn-tabs button:first-child{border-radius:3px 0 0 3px}
.pcn .pcn-tabs button:last-child{border-radius:0 3px 3px 0;border-left-width:0}
.pcn button.pcn-selected,
.pcn button.pcn-selected:hover:not(:disabled){
  background:linear-gradient(#35566a,#25414f);color:var(--gold);
  border-color:#162a34;box-shadow:inset 0 2px 4px rgba(0,0,0,.35);transform:none
}
.pcn .pcn-size{font-size:.7em}

/* ---------- working area */
.pcn .pcn-work{
  display:grid;grid-template-columns:minmax(210px,27%) 1fr;gap:1em;
  min-height:0;flex:1
}
.pcn .pcn-bank,.pcn .pcn-board,.pcn .pcn-names{
  scrollbar-width:thin;scrollbar-color:#8f8050 transparent
}
.pcn ::-webkit-scrollbar{width:10px;height:10px}
.pcn ::-webkit-scrollbar-track{background:transparent}
.pcn ::-webkit-scrollbar-thumb{
  background:#8f8050;border-radius:5px;border:2px solid var(--paper)
}

/* bank = ruled page, every word sits exactly on a line */
.pcn .pcn-bank{
  min-height:0;overflow:auto;padding:0 .7em 0 .1em;
  border-right:3px double var(--brass);
  background-image:repeating-linear-gradient(to bottom,transparent 0
    calc(var(--lh) - 1px),var(--rule) calc(var(--lh) - 1px) var(--lh));
  background-attachment:local
}
.pcn .pcn-bank-head{
  display:flex;align-items:center;gap:.6em;height:var(--lh)
}
.pcn .pcn-bank h3{
  display:flex;align-items:center;gap:.6em;margin:0;
  font-family:${PIXEL};font-size:calc(var(--fs)*.58);font-weight:normal;
  color:#6b4f12;line-height:var(--lh)
}
.pcn .pcn-count{
  font-family:SpecialElite,'Special Elite',monospace;font-size:var(--fs);
  line-height:1.3;padding:0 .5em;border-radius:1em;
  background:var(--ink);color:var(--gold)
}
.pcn .pcn-bank-head button{
  margin-left:auto;min-height:0;height:calc(var(--lh) - 6px);
  padding:0 .6em;font-size:.68em
}
.pcn .pcn-words{display:flex;flex-direction:column;gap:0}

.pcn .pcn-word{
  display:flex;align-items:flex-start;gap:.5em;min-height:var(--lh);
  padding:0 .3em;font-size:1em;line-height:var(--lh);border-radius:2px
}
.pcn .pcn-word > span{flex:1;min-width:0;overflow-wrap:anywhere}
.pcn label.pcn-word{cursor:pointer}
.pcn label.pcn-word:hover{background:rgba(212,175,55,.2)}
.pcn .pcn-word:has(input:checked){background:rgba(212,175,55,.34)}

/* custom checkbox: tick it with red pencil */
.pcn .pcn-word input{
  appearance:none;-webkit-appearance:none;width:1.05em;height:1.05em;
  margin:calc((var(--lh) - 1.05em)/2) 0 0;flex-shrink:0;cursor:pointer;
  border:2px solid var(--ink);border-radius:2px;
  background:#fdf7dc center/80% no-repeat
}
.pcn .pcn-word input:checked{background-image:${CHECK}}
.pcn .pcn-word input:focus-visible{outline:2px solid var(--red);outline-offset:2px}

/* buttons inside word rows (use-words mode, e-mails) */
.pcn .pcn-word button{
  display:inline-flex;align-items:baseline;gap:.4em;flex:1;min-width:0;
  min-height:0;padding:0 .25em;border:0;border-radius:2px;
  background:transparent;box-shadow:none;transform:none;text-align:left;
  text-transform:none;letter-spacing:0;font-size:1em;line-height:inherit;
  overflow-wrap:anywhere
}
.pcn .pcn-word button:hover:not(:disabled){
  background:rgba(212,175,55,.26);transform:none
}
.pcn .pcn-word button:active:not(:disabled){transform:none}
/* "use words" mode: marker-pen highlighted leads */
.pcn .pcn-lead button{
  background:linear-gradient(transparent 55%,rgba(212,175,55,.5) 55%)
}
.pcn .pcn-lead button:hover:not(:disabled){background:rgba(212,175,55,.65)}
.pcn .pcn-word .pcn-email{
  color:#12406e;text-decoration:underline;text-underline-offset:3px
}
.pcn .pcn-word .pcn-email::before{
  content:'\\2709';flex:none;text-decoration:none
}
.pcn .pcn-word .pcn-email:hover,.pcn .pcn-word .pcn-email:focus-visible{
  color:#8a3d26
}

.pcn .pcn-empty{
  margin:.4em .3em;font-size:.9em;line-height:1.4;font-style:italic;
  color:var(--ink-soft)
}

/* ---------- clouds */
.pcn .pcn-board{min-height:0;min-width:0;overflow:auto}
.pcn .pcn-clouds{
  position:relative;display:grid;align-items:start;
  grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr));
  gap:2.6em 2.4em;padding:1.4em .9em 2.6em
}
.pcn .pcn-clouds > .pcn-empty{grid-column:1/-1}

/* red-pencil arrows between linked clouds (drawn behind the cards) */
.pcn .pcn-strings{
  position:absolute;left:0;top:0;width:100%;height:100%;z-index:0;
  pointer-events:none;overflow:visible
}

.pcn .pcn-cloud{
  --lh:calc(var(--fs)*1.8);
  position:relative;z-index:1;display:flex;flex-direction:column;
  justify-content:center;min-height:9em;padding:1.3em 14% 1.8em;
  border:2.5px solid var(--ink);
  border-radius:50% 47% 52% 50% / 46% 52% 50% 54%;
  background:radial-gradient(ellipse at 35% 25%,
    rgba(255,252,234,.97),rgba(248,238,202,.95) 78%);
  box-shadow:0 3px 0 rgba(70,55,20,.18),0 10px 16px rgba(60,40,10,.14);
  transition:transform .15s,box-shadow .15s
}
.pcn .pcn-cloud:nth-child(odd){transform:rotate(-.5deg)}
.pcn .pcn-cloud:nth-child(even){transform:rotate(.4deg)}
.pcn .pcn-cloud:hover{transform:rotate(0) translateY(-2px)}
.pcn .pcn-cloud.pcn-pick{cursor:pointer}
.pcn .pcn-cloud.pcn-active{
  border-color:var(--red);
  background:radial-gradient(ellipse at 35% 25%,#fffdea,#faf0c4 78%);
  box-shadow:0 0 0 4px rgba(212,175,55,.6),0 12px 20px rgba(60,40,10,.25)
}
.pcn .pcn-cloud.pcn-active::before{
  content:'SELECTED';position:absolute;top:-.9em;left:50%;
  transform:translateX(-50%) rotate(-2deg);padding:.15em .7em .05em;
  font-size:.6em;letter-spacing:.14em;white-space:nowrap;
  background:var(--red);color:#fff4d0;border-radius:2px;
  box-shadow:0 1px 2px rgba(0,0,0,.3)
}
.pcn .pcn-cloud-title{
  display:block;width:100%;min-height:0;padding:.1em .3em .3em;
  border:0;border-bottom:1.5px dotted var(--ink-soft);border-radius:0;
  background:transparent;box-shadow:none;transform:none;color:var(--ink);
  font-size:1.15em;line-height:1.25;text-align:center;
  text-transform:none;letter-spacing:0;text-shadow:.4px 0 0 currentColor;
  overflow-wrap:anywhere
}
.pcn .pcn-cloud-title:hover:not(:disabled){
  background:rgba(212,175,55,.22);transform:none
}
.pcn .pcn-cloud.pcn-active .pcn-cloud-title{color:var(--red)}
.pcn .pcn-cloud-words{
  display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;
  gap:0 1.1em;margin-top:.4em
}
.pcn .pcn-cloud .pcn-word{
  flex:0 1 auto;display:inline-flex;max-width:100%;font-size:1em
}
.pcn .pcn-cloud .pcn-word > span{flex:0 1 auto}
.pcn .pcn-cloud .pcn-word button{flex:0 1 auto}
.pcn .pcn-cloud .pcn-empty{margin:.5em 0 0;text-align:center;font-size:.85em}
/* linked-cloud caption */
.pcn .pcn-cloud small{
  display:block;margin-top:.5em;padding-top:.3em;font-size:.78em;
  line-height:1.3;text-align:center;color:var(--red);
  border-top:1px dashed rgba(155,47,34,.5)
}

/* ---------- tools strip */
.pcn .pcn-tools{
  display:flex;flex-wrap:wrap;align-items:center;gap:.45em;margin-top:.5em;
  padding:.6em 0 0;border-top:3px double var(--brass);font-size:.9em
}
.pcn .pcn-tools button{min-height:2.3em;padding:.3em .7em .25em;font-size:.76em}
.pcn .pcn-tools select{min-height:2.3em;max-width:11em;font-size:.82em}
.pcn .pcn-tools .pcn-label{
  font-size:.78em;letter-spacing:.08em;color:var(--ink-soft);margin-left:.6em
}
.pcn .pcn-tools button.pcn-primary{
  background:linear-gradient(#ecce63,#c9a02c);border-color:#7a5d12;
  color:var(--leather)
}
.pcn .pcn-tools button.pcn-primary:hover:not(:disabled){
  background:linear-gradient(#f5da7c,#d6ac36)
}
.pcn .pcn-tools button.pcn-danger{color:var(--red);border-color:#8a3a2c}
.pcn .pcn-tools .pcn-sel{
  margin-left:auto;font-size:.82em;opacity:.85;white-space:nowrap
}

.pcn .pcn-status{
  min-height:1.4em;margin-top:.4em;font-size:.82em;line-height:1.35;
  font-style:italic;color:var(--ink-soft)
}
.pcn .pcn-status::before{content:'\\25B8  ';color:var(--red);font-style:normal}

/* ---------- name-cloud dialog: a taped slip of paper */
.pcn .pcn-dialog{
  position:absolute;left:50%;top:50%;z-index:3;
  width:min(560px,calc(100% - 40px));padding:1.6em 1.4em 1.2em;
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
  margin:0 0 .7em;font-family:${PIXEL};font-size:calc(var(--fs)*.62);
  line-height:1.5;font-weight:normal;color:#6b4f12
}
.pcn .pcn-dialog p{margin:0;font-size:.9em}
.pcn .pcn-names{
  display:flex;flex-wrap:wrap;gap:.5em;margin:1em 0;max-height:10em;overflow:auto
}
.pcn .pcn-dialog > button{margin-right:.4em}

@media(max-width:650px){
  .pcn .pcn-paper{height:66vh;min-height:300px;padding:.5em .5em .4em 34px}
  .pcn.pcn-big .pcn-paper{height:92vh}
  .pcn .pcn-paper::before{width:22px;background-size:22px 40px,auto}
  .pcn .pcn-work{
    grid-template-columns:1fr;grid-template-rows:minmax(80px,34%) 1fr;gap:.4em
  }
  .pcn .pcn-bank{border-right:0;border-bottom:3px double var(--brass)}
  .pcn .pcn-clouds{grid-template-columns:1fr;gap:2.2em 1em}
  .pcn .pcn-top select{max-width:11em}
  .pcn .pcn-title,.pcn .pcn-stamp{display:none}
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

  let big = state.playerCloudViewV1?.big === true;

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

  // Keeps the red arrows between linked clouds in sync with the layout.
  let stringObserver = null;

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

  function setBig(value) {
    big = Boolean(value);

    state.playerCloudViewV1 = {
      ...(state.playerCloudViewV1 || {}),
      big
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
      return el('div', undefined, 'pcn-word').appendChild(
        el('span', word.label)
      ).parentNode;
    }

    const row = el('div', undefined, 'pcn-word');
    row.append(emailButton(word, definition));

    return row;
  }

  // Red-pencil arrows between linked clouds, drawn behind the cards.
  function drawStrings(grid, progress) {
    grid.querySelector('.pcn-strings')?.remove();

    if (!progress.links.length) return;

    const cards = new Map(
      [...grid.querySelectorAll('.pcn-cloud')].map(
        node => [node.dataset.cloud, node]
      )
    );

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'pcn-strings');
    svg.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');

    marker.setAttribute('id', 'pcn-arrow');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '7');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('orient', 'auto-start-reverse');

    const tip = document.createElementNS(SVG_NS, 'path');
    tip.setAttribute('d', 'M0 0L10 5L0 10z');
    tip.setAttribute('fill', '#9b2f22');

    marker.append(tip);
    defs.append(marker);
    svg.append(defs);

    let drawn = 0;

    for (const link of progress.links) {
      const a = cards.get(link.from);
      const b = cards.get(link.to);

      if (!a || !b) continue;

      const ax = a.offsetLeft + a.offsetWidth / 2;
      const ay = a.offsetTop + a.offsetHeight / 2;
      const bx = b.offsetLeft + b.offsetWidth / 2;
      const by = b.offsetTop + b.offsetHeight / 2;

      const dx = bx - ax;
      const dy = by - ay;
      const length = Math.hypot(dx, dy);

      if (!length) continue;

      const ux = dx / length;
      const uy = dy / length;

      // distance from an ellipse's centre to its edge along (ux, uy)
      const reach = card => {
        const rx = Math.max(1, card.offsetWidth / 2);
        const ry = Math.max(1, card.offsetHeight / 2);

        return 1 / Math.sqrt((ux / rx) ** 2 + (uy / ry) ** 2);
      };

      const gap = 7;
      const start = reach(a) + gap;
      const end = length - reach(b) - gap;

      if (end - start < 14) continue;

      const x1 = ax + ux * start;
      const y1 = ay + uy * start;
      const x2 = ax + ux * end;
      const y2 = ay + uy * end;

      const bend = (end - start) * 0.14;
      const cx = (x1 + x2) / 2 - uy * bend;
      const cy = (y1 + y2) / 2 + ux * bend;

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#9b2f22');
      path.setAttribute('stroke-width', '2.6');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-dasharray', '7 5');
      path.setAttribute('marker-start', 'url(#pcn-arrow)');
      path.setAttribute('marker-end', 'url(#pcn-arrow)');

      svg.append(path);
      drawn += 1;
    }

    if (drawn) grid.prepend(svg);
  }

  function watchStrings(grid, progress) {
    stringObserver?.disconnect();
    stringObserver = null;

    try {
      drawStrings(grid, progress);
    } catch (error) {
      console.warn('[PlayerCloudNotebook] arrows skipped:', error);
      return;
    }

    if (typeof ResizeObserver === 'undefined') return;

    stringObserver = new ResizeObserver(() => {
      if (dead || !grid.isConnected) return;

      try {
        drawStrings(grid, progress);
      } catch (error) {
        console.warn('[PlayerCloudNotebook] arrows skipped:', error);
      }
    });

    stringObserver.observe(grid);
  }

  function draw() {
    if (dead) return;

    root.hidden = !live();
    if (!live()) return;

    const definition = syncSelection();
    const available = cases();

    root.classList.toggle('pcn-big', big);

    handle.textContent = collapsed
      ? '▲ CASE NOTES'
      : '▼ HIDE NOTES';

    handle.setAttribute('aria-expanded', String(!collapsed));
    paper.hidden = collapsed;

    if (collapsed) {
      stringObserver?.disconnect();
      stringObserver = null;
      return;
    }

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

    organise.title = 'Group your clues into clouds';

    const useButton = button('USE WORDS', () => {
      mode = 'use';
      dialogId = null;
      draw();
    });

    useButton.title = 'Click a clue to search, call or write';

    (mode === 'organise' ? organise : useButton)
      .classList.add('pcn-selected');

    const tabs = el('span', undefined, 'pcn-tabs');
    tabs.append(organise, useButton);
    top.append(tabs);

    const sizeButton = button(
      big ? 'SHRINK' : 'ENLARGE',
      () => setBig(!big)
    );

    sizeButton.classList.add('pcn-size');
    sizeButton.title = big
      ? 'Make the notebook smaller'
      : 'Make the notebook bigger';

    top.append(sizeButton);
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

    const bankHead = el('div', undefined, 'pcn-bank-head');

    bankHead.append(
      bankHeading,
      button(all ? 'SHOW UNSORTED' : 'SHOW ALL', () => {
        all = !all;
        bankSelection.clear();
        draw();
      })
    );

    bank.append(bankHead);

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
        'pcn-cloud' +
        (cloud.id === activeId ? ' pcn-active' : '') +
        (mode === 'organise' && cloud.id !== activeId ? ' pcn-pick' : '')
      );

      card.dataset.cloud = cloud.id;

      // Clicking anywhere on a cloud selects it (organise mode).
      if (mode === 'organise') {
        card.addEventListener('click', () => {
          if (!live() || activeId === cloud.id) return;

          activeId = cloud.id;
          memberSelection.clear();
          draw();
        });
      }

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
      const wordsBox = el('div', undefined, 'pcn-cloud-words');

      for (const word of members) {
        if (mode === 'organise' && cloud.id !== activeId) {
          wordsBox.append(inactiveWordRow(word, definition));
        } else {
          wordsBox.append(wordRow(word, memberSelection, definition));
        }
      }

      if (members.length) card.append(wordsBox);

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
          'Tick some words on the left and press CREATE CLOUD. ' +
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
          el('span', 'LINK WITH:', 'pcn-label'),
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
          'Click a highlighted word to search, dial a discovered ' +
          'number or use an email address.'
        )
      );
    }

    const status = el(
      'div',
      message || (
        mode === 'organise'
          ? 'Click a cloud to work on it. Names are hypotheses — ' +
            'the notebook never says who is right.'
          : 'Names are hypotheses. The notebook does not mark them ' +
            'right or wrong.'
      ),
      'pcn-status'
    );

    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    paper.append(tools, status);

    // Arrows need the final layout, so they are drawn once the page exists.
    watchStrings(grid, progress);

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

    stringObserver?.disconnect();
    stringObserver = null;

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