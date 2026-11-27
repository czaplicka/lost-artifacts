// DOM overlay for the precinct line-up cases. Mounted inside the scene's DOM
// root (like ColdCaseUI); the scene owns this object and destroys it on exit.

import { createSolver, PRECINCT_CELL_BIT as bit } from '../systems/precinct/PrecinctPuzzle.js';
import {
  openPrecinctCase,
  savePrecinctProgress,
  failPrecinctCase,
  completePrecinctCase,
  buyPrecinctHint,
  getPrecinctRank,
  PRECINCT_MAX_MISTAKES,
  PRECINCT_FREE_HINTS,
  PRECINCT_HINT_PRICE,
} from '../systems/precinct/PrecinctCaseService.js';

const STYLE = `
.pc-root{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;
  background:radial-gradient(ellipse at top,#26302a 0%,#121714 75%);color:#efe4c8;
  font-family:SpecialElite,'Courier New',monospace;pointer-events:auto;overflow:hidden}
.pc-root button{font:inherit;cursor:pointer}
.pc-head{display:flex;align-items:center;gap:.8em;padding:.5em .9em;background:#0d110f;border-bottom:2px solid #8a6d2c;flex-wrap:wrap}
.pc-title{font-size:1.05em;color:#ffe3a4;letter-spacing:.06em;flex:1 1 auto;min-width:10em}
.pc-stat{display:flex;align-items:center;gap:.35em;padding:.15em .6em;border:1px solid #4d5a50;border-radius:1em;background:#18201c;white-space:nowrap}
.pc-x{color:#555;font-weight:bold}.pc-x.on{color:#e0473c}
.pc-close{background:#2a332d;color:#efe4c8;border:1px solid #8a6d2c;border-radius:.3em;padding:.3em .8em}
.pc-brief{padding:.45em 1em;font-size:.85em;color:#cdbf9c;background:#161c18;border-bottom:1px solid #2c362f}
.pc-msg{min-height:1.4em;padding:.35em 1em;font-size:.85em;color:#ffe3a4;text-align:center}
.pc-msg.bad{color:#ff8a7f}
.pc-board{flex:1 1 auto;display:grid;gap:.5em;padding:.3em 1em .6em;margin:0 auto;width:100%;box-sizing:border-box;align-content:center;min-height:0;overflow:auto}
.pc-card{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
  border-radius:.55em;border:2px solid #3e4a42;background:#222a25;color:inherit;padding:.35em .3em;min-height:5.6em;text-align:center;overflow:hidden}
.pc-card.hidden:hover,.pc-card.hidden:focus-visible{border-color:#ffe3a4;outline:none;transform:translateY(-1px)}
.pc-card.blocked{background:repeating-linear-gradient(45deg,#1a1f1c 0 8px,#202622 8px 16px);border-style:dashed;cursor:default}
.pc-label{position:absolute;top:.2em;left:.35em;font-size:.65em;color:#9aa89c}
.pc-face{width:2.2em;height:2.2em;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:1em;color:#121714;font-weight:bold;margin-top:.5em;border:2px solid rgba(0,0,0,.35)}
.pc-name{font-size:.85em;margin-top:.2em;color:#fff3d6}
.pc-text{font-size:.68em;line-height:1.25;margin-top:.3em;color:#e8dcbc}
.pc-card.good{background:#1d2b23;border-color:#4f8a5f}
.pc-card.bad{background:#4a1d1a;border-color:#e0473c}
.pc-card.bad .pc-text{color:#ffd2cc}
.pc-card.cleared .pc-text{opacity:.45;text-decoration:line-through}
.pc-tag{position:absolute;top:.15em;right:.3em;font-size:.65em}
.pc-card.hinted{animation:pc-pulse 1s ease-in-out infinite}
.pc-card.shake{animation:pc-shake .35s}
@keyframes pc-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,227,164,.0)}50%{box-shadow:0 0 0 .35em rgba(255,227,164,.55)}}
@keyframes pc-shake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.pc-foot{display:flex;align-items:center;justify-content:center;gap:.8em;padding:.5em .8em .8em;background:#0d110f;border-top:2px solid #8a6d2c;flex-wrap:wrap}
.pc-mode{display:flex;border:2px solid #8a6d2c;border-radius:2em;overflow:hidden}
.pc-mode button{border:0;padding:.45em 1.1em;background:#1b221e;color:#cdbf9c}
.pc-mode button.on.good{background:#4f8a5f;color:#fff}
.pc-mode button.on.bad{background:#b8372e;color:#fff}
.pc-hint{background:#2a332d;color:#ffe3a4;border:1px solid #8a6d2c;border-radius:.3em;padding:.45em .9em}
.pc-help{font-size:.7em;color:#8f9c91;flex-basis:100%;text-align:center}
.pc-end{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,10,9,.78);z-index:2}
.pc-end-box{max-width:28em;width:calc(100% - 32px);background:#1a211d;border:2px solid #8a6d2c;border-radius:.6em;padding:1.1em 1.3em;text-align:center}
.pc-end-box h2{margin:.1em 0 .5em;color:#ffe3a4;font-size:1.25em;letter-spacing:.05em}
.pc-end-box p{margin:.35em 0;font-size:.9em}
.pc-end-box .pc-row{display:flex;gap:.6em;justify-content:center;margin-top:1em;flex-wrap:wrap}
.pc-end-box button{background:#2a332d;color:#efe4c8;border:1px solid #8a6d2c;border-radius:.3em;padding:.45em 1em}
.pc-end-box button.primary{background:#8a6d2c;color:#121714}
`;

const FACE_COLORS = ['#e6b980', '#9fc5e8', '#b6d7a8', '#f4cccc', '#d5a6bd', '#ffe599', '#a2c4c9', '#f9cb9c'];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function faceColor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FACE_COLORS[h % FACE_COLORS.length];
}

export class PrecinctCaseBoardUI {
  /**
   * @param {Phaser.Scene & {root: HTMLElement}} scene
   * @param {(result: object|null) => void} onClose  result of a solved case, or null
   */
  constructor(scene, onClose) {
    this.scene = scene;
    this.onClose = onClose;
    this.destroyed = false;
    this.mode = 'good';
    this.hintIndex = null;
    this.result = null;
    this.previousFocus = document.activeElement;

    this.style = el('style', '', STYLE);
    document.head.append(this.style);

    this.root = el('section', 'pc-root');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Precinct case board');
    this.root.tabIndex = -1;
    this.keyHandler = event => this.onKey(event);
    this.root.addEventListener('keydown', this.keyHandler);
    this.root.addEventListener('pointerdown', event => event.stopPropagation());
    this.root.addEventListener('contextmenu', event => event.preventDefault());

    this.hiddenNodes = [...scene.root.children].map(node => ({ node, inert: node.inert, visibility: node.style.visibility }));
    this.hiddenNodes.forEach(({ node }) => { node.inert = true; node.style.visibility = 'hidden'; });
    this.wasInputEnabled = scene.input.enabled;
    scene.input.enabled = false;
    scene.root.append(this.root);

    this.loadCase();
  }

  loadCase() {
    const data = openPrecinctCase();
    Object.assign(this, data);
    this.solver = createSolver(this.puzzle);
    this.hintIndex = null;
    this.message = '';
    this.messageBad = false;
    this.endScreen = null;
    this.render();
    this.root.focus();
  }

  get openCells() {
    return this.puzzle.cells.filter(c => !c.blocked);
  }

  get criminalsFound() {
    return [...this.known.values()].filter(Boolean).length;
  }

  isCleared(cell) {
    const refs = cell.clue?.refs ?? 0;
    if (!refs) return false;
    return this.openCells.every(c => !(refs & bit(c.index)) || this.known.has(c.index) || c.index === cell.index);
  }

  // ---------------------------------------------------------------- render

  render() {
    if (this.destroyed) return;
    const rank = getPrecinctRank();
    const head = el('header', 'pc-head');
    head.append(
      el('div', 'pc-title', `CASE #${this.caseNumber} · ${rank.title.toUpperCase()}`),
      el('div', 'pc-stat', `Criminals ${this.criminalsFound}/${this.puzzle.criminals}`),
      el('div', 'pc-stat', `Cleared ${this.known.size}/${this.openCells.length}`),
    );
    const strikes = el('div', 'pc-stat');
    strikes.setAttribute('aria-label', `Mistakes ${this.mistakes} of ${PRECINCT_MAX_MISTAKES}`);
    for (let i = 0; i < PRECINCT_MAX_MISTAKES; i++) {
      strikes.append(el('span', `pc-x${i < this.mistakes ? ' on' : ''}`, '✕'));
    }
    const close = el('button', 'pc-close', 'Close file');
    close.type = 'button';
    close.addEventListener('click', () => this.destroy());
    head.append(strikes, close);

    const brief = el('div', 'pc-brief', this.briefing);
    const msg = el('div', `pc-msg${this.messageBad ? ' bad' : ''}`, this.message);
    msg.setAttribute('aria-live', 'polite');

    const board = el('div', 'pc-board');
    board.style.gridTemplateColumns = `repeat(${this.puzzle.cols}, minmax(0, 1fr))`;
    board.style.maxWidth = `${this.puzzle.cols * 10}em`;
    for (const cell of this.puzzle.cells) board.append(this.renderCell(cell));

    const foot = el('footer', 'pc-foot');
    const mode = el('div', 'pc-mode');
    mode.setAttribute('role', 'radiogroup');
    mode.setAttribute('aria-label', 'Verdict to stamp');
    for (const [id, label] of [['good', 'Innocent'], ['bad', 'Criminal']]) {
      const b = el('button', `${id}${this.mode === id ? ' on' : ''}`, label);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(this.mode === id));
      b.addEventListener('click', () => { this.mode = id; this.render(); });
      mode.append(b);
    }
    const free = Math.max(0, PRECINCT_FREE_HINTS - this.hintsUsed);
    const hint = el('button', 'pc-hint', free > 0 ? `Tip-off (${free} free)` : `Tip-off ($${PRECINCT_HINT_PRICE})`);
    hint.type = 'button';
    hint.addEventListener('click', () => this.useHint());
    foot.append(mode, hint, el('div', 'pc-help',
      'Pick a verdict, then tap a person. Right-click marks a criminal. Only accuse what the statements prove.'));

    this.root.replaceChildren(head, brief, msg, board, foot);
    if (this.endScreen) this.root.append(this.endScreen);
  }

  renderCell(cell) {
    if (cell.blocked) {
      const empty = el('div', 'pc-card blocked');
      empty.setAttribute('aria-hidden', 'true');
      return empty;
    }
    const known = this.known.has(cell.index);
    const card = el(known ? 'div' : 'button', 'pc-card');
    card.dataset.index = String(cell.index);
    card.append(el('span', 'pc-label', cell.label));
    const face = el('div', 'pc-face', cell.name[0]);
    face.style.background = faceColor(cell.name);
    card.append(face, el('div', 'pc-name', cell.name));

    if (!known) {
      card.classList.add('hidden');
      card.type = 'button';
      card.setAttribute('aria-label', `${cell.label} ${cell.name}, not yet decided`);
      if (this.hintIndex === cell.index) card.classList.add('hinted');
      card.addEventListener('click', () => this.mark(cell, this.mode === 'bad'));
      card.addEventListener('contextmenu', event => { event.preventDefault(); this.mark(cell, true); });
      return card;
    }
    if (cell.criminal) {
      card.classList.add('bad');
      card.append(el('span', 'pc-tag', 'GUILTY'), el('div', 'pc-text', cell.offence));
    } else {
      card.classList.add('good');
      const cleared = this.isCleared(cell);
      if (cleared) card.classList.add('cleared');
      card.append(el('span', 'pc-tag', cleared ? '✓' : ''), el('div', 'pc-text', `“${cell.clue?.text ?? 'I keep to myself.'}”`));
    }
    return card;
  }

  // ---------------------------------------------------------------- actions

  setMessage(text, bad = false) {
    this.message = text;
    this.messageBad = bad;
  }

  mark(cell, accuseCriminal) {
    if (this.destroyed || this.endScreen || this.known.has(cell.index)) return;
    if (cell.criminal === accuseCriminal) {
      this.known.set(cell.index, cell.criminal);
      if (this.hintIndex === cell.index) this.hintIndex = null;
      this.setMessage(cell.criminal ? `${cell.name} is booked.` : `${cell.name} is free to go.`);
      this.persist();
      if (this.known.size === this.openCells.length) return this.finish();
      this.render();
      return;
    }
    this.mistakes += 1;
    this.persist();
    if (this.mistakes >= PRECINCT_MAX_MISTAKES) return this.fail();
    this.setMessage(`Wrong call on ${cell.name}. The sergeant frowns. (${this.mistakes}/${PRECINCT_MAX_MISTAKES})`, true);
    this.render();
    const node = this.root.querySelector(`[data-index="${cell.index}"]`);
    node?.classList.add('shake');
    node?.focus();
  }

  useHint() {
    if (this.destroyed || this.endScreen) return;
    if (this.hintIndex !== null && !this.known.has(this.hintIndex)) {
      this.setMessage('The tip-off still stands. Check the highlighted person.');
      this.render();
      return;
    }
    const forced = this.solver.forced(this.known);
    const hidden = this.openCells.filter(c => !this.known.has(c.index));
    const candidates = hidden.filter(c => (forced.good | forced.bad) & bit(c.index));
    if (!candidates.length) {
      this.setMessage('Nothing can be proven yet. That should not happen. Close and reopen the file.', true);
      this.render();
      return;
    }
    if (this.hintsUsed >= PRECINCT_FREE_HINTS) {
      const paid = buyPrecinctHint();
      if (!paid.ok) { this.setMessage(paid.message, true); this.render(); return; }
    }
    this.hintsUsed += 1;
    const target = candidates.find(c => !c.criminal) || candidates[0];
    this.hintIndex = target.index;
    this.setMessage(`Tip-off: the statements already settle ${target.name} (${target.label}).`);
    this.persist();
    this.render();
  }

  persist() {
    savePrecinctProgress({
      caseNumber: this.caseNumber,
      known: this.known,
      mistakes: this.mistakes,
      hintsUsed: this.hintsUsed,
    });
  }

  finish() {
    this.result = completePrecinctCase({ caseNumber: this.caseNumber, mistakes: this.mistakes });
    const r = this.result;
    const box = el('div', 'pc-end-box');
    box.append(el('h2', '', 'CASE CLOSED'));
    if (r) {
      box.append(el('p', '', r.perfect ? 'A clean sweep: not a single wrong call.' : 'Every crook is behind bars.'));
      if (r.paid) box.append(el('p', '', `Payment: $${r.paid}${r.perfect ? ' (includes the clean-sweep bonus)' : ''}`));
      if (r.trustDelta) box.append(el('p', '', `Sergeant's trust +${r.trustDelta}`));
      if (r.promotion) box.append(el('p', '', `Promotion! You are now ${r.promotion.title}.`));
      else if (r.rank.next) box.append(el('p', '', `${r.rank.next.at - r.rank.solved} more case(s) to ${r.rank.next.title}.`));
    }
    const row = el('div', 'pc-row');
    const next = el('button', 'primary', 'Next case');
    next.type = 'button';
    next.addEventListener('click', () => this.loadCase());
    const back = el('button', '', 'Report to the sergeant');
    back.type = 'button';
    back.addEventListener('click', () => this.destroy());
    row.append(next, back);
    box.append(row);
    this.showEnd(box);
  }

  fail() {
    failPrecinctCase(this.caseNumber);
    const box = el('div', 'pc-end-box');
    box.append(
      el('h2', '', 'CASE THROWN OUT'),
      el('p', '', 'Three wrong calls. The line-up walks and the sergeant sighs.'),
      el('p', '', 'A fresh line-up is waiting whenever you are ready.'),
    );
    const row = el('div', 'pc-row');
    const retry = el('button', 'primary', 'New line-up');
    retry.type = 'button';
    retry.addEventListener('click', () => this.loadCase());
    const back = el('button', '', 'Leave it for now');
    back.type = 'button';
    back.addEventListener('click', () => this.destroy());
    row.append(retry, back);
    box.append(row);
    this.showEnd(box);
  }

  showEnd(box) {
    const end = el('div', 'pc-end');
    end.append(box);
    this.endScreen = end;
    this.render();
    box.querySelector('button')?.focus();
  }

  onKey(event) {
    event.stopPropagation();
    if (event.code === 'Escape' || event.key === 'Escape') {
      event.preventDefault();
      if (!event.repeat) this.escape();
      return;
    }
    if (this.endScreen || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'i' || key === '1') { this.mode = 'good'; this.render(); }
    else if (key === 'c' || key === '2') { this.mode = 'bad'; this.render(); }
    else if (key === 'h') this.useHint();
  }

  escape() {
    this.destroy();
  }

  destroy(notify = true) {
    if (this.destroyed) return;
    this.destroyed = true;
    this.root.removeEventListener('keydown', this.keyHandler);
    this.root.remove();
    this.style.remove();
    this.hiddenNodes.forEach(({ node, inert, visibility }) => {
      if (node.isConnected) { node.inert = inert; node.style.visibility = visibility; }
    });
    if (this.scene.input) this.scene.input.enabled = this.wasInputEnabled;
    if (notify) this.onClose?.(this.result);
    if (this.previousFocus?.isConnected && !this.previousFocus.closest('[inert]')) this.previousFocus.focus?.();
  }
}
