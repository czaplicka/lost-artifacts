import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { advanceCrimeTutorial } from '../CrimeCityTutorial.js';
import { flushAutosave, requestAutosave } from '../gameStatePersistence.js';
import { getWitnessTestimony, markAlibiWitnessInterviewed, allWitnessesVisited } from '../alibi/AlibiEncounterSetup.js';
import { APPROACHES, CHALLENGES, COOPERATION_LABELS, getRapport, getInterviewView, applyApproach, askWitness, challengeWitness, followUpChallenge } from '../alibi/AlibiCooperation.js';

const C = {
  desk: 0x182428, shadow: 0x0c1518, cover: 0x394941, paper: 0xeadfc4,
  light: 0xf5ecd6, ink: '#302d27', muted: '#696353', gold: 0xbc9254,
  green: 0x526a51, red: 0x843e35, edge: 0xa99876, dark: 0x293b37
};
const PORTRAITS = ['npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'];
function clock(value) {
  if (!Number.isFinite(value)) return '--:--';
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export class AlibiScene extends BaseScene {
  constructor() { super({ key: 'AlibiScene' }); }
  init(data = {}) {
    this.caseKey = data.caseKey || null;
    this.encounterId = data.encounterId || null;
    this.suspectId = data.suspectId || null;
    this.npcId = data.npcId || null;
    this.cityId = data.cityId || null;
    this.returnScene = data.returnScene || 'CrimeCityScene';
    this.returnData = data.returnData || { cityId: this.cityId };
    this.root = null; this.view = null; this.entry = null;
    this.tab = 'questions'; this.replyPage = 0; this.historyIndex = -1;
    this.isLeaving = false; this.isSaving = false; this.error = ''; this.fileError = false;
    this.interviewHud = null;
    this.hudInputWasEnabled = null;
  }
  create() {
    super.create();
    this.stopSceneIfActive('NewsHud');
    this.bindInterviewHud();
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.setBackgroundColor(C.desk);
    this.trackInputEvent(this.scale, 'resize', this.handleResize, this);
    try {
      this.loadWitness();
      const history = this.view.state.transcript;
      this.entry = history.at(-1) || {
        detective: "I'm investigating the theft. I'd like to ask a few questions.",
        witness: this.view.personality.opening
      };
      this.render();
    } catch (error) {
      console.error('[AlibiScene] Cannot open interview.', error);
      this.fileError = true; this.renderError();
    }
  }

  bindInterviewHud() {
    this.releaseInterviewHud();
    this.interviewHud = this.getRegisteredScene('PlayerHudScene');
    const hud = this.interviewHud;
    if (hud?.input) this.hudInputWasEnabled = hud.input.enabled;
    hud?.events?.on('hud-ready', this.hideInterviewHud, this);
    this.events.off('wake', this.hideInterviewHud, this);
    this.events.on('wake', this.hideInterviewHud, this);
    this.events.off('shutdown', this.releaseInterviewHud, this);
    this.events.once('shutdown', this.releaseInterviewHud, this);
    this.events.off('destroy', this.releaseInterviewHud, this);
    this.events.once('destroy', this.releaseInterviewHud, this);
    this.hideInterviewHud();
  }

  hideInterviewHud() {
    if (this._cleanupDone || this.isLeaving) return;
    const hud = this.interviewHud;
    if (!hud || hud._cleanupDone) return;
    hud.closeAllUIPanels?.();
    hud.setCurrentGameplayScene?.('AlibiScene');
    hud.hideHud?.();
    // Also hide before asynchronous HUD initialization has finished.
    hud.scene?.setVisible(false);
    if (hud.input) hud.input.enabled = false;
  }

  releaseInterviewHud() {
    const hud = this.interviewHud;
    hud?.events?.off('hud-ready', this.hideInterviewHud, this);
    if (hud?.input && this.hudInputWasEnabled !== null) hud.input.enabled = this.hudInputWasEnabled;
    this.events?.off('wake', this.hideInterviewHud, this);
    this.events?.off('shutdown', this.releaseInterviewHud, this);
    this.events?.off('destroy', this.releaseInterviewHud, this);
    this.interviewHud = null;
    this.hudInputWasEnabled = null;
    // The destination scene controls visibility; never force the HUD over another minigame.
  }

  loadWitness() {
    if (!this.caseKey || !this.encounterId || !this.suspectId || !this.npcId) throw new Error('Missing interview navigation data.');
    this.encounter = gameState.crimeCityEncounterState?.[this.caseKey]?.find(item => item.id === this.encounterId);
    if (!this.encounter || this.encounter.suspectId !== this.suspectId || this.encounter.npcId !== this.npcId) throw new Error('Witness navigation mismatch.');
    this.testimony = getWitnessTestimony(this.caseKey, this.suspectId, this.npcId);
    if (!this.testimony || this.testimony.encounterId !== this.encounterId) throw new Error('Missing witness testimony.');
    this.view = getInterviewView(this.caseKey, this.encounterId);
  }
  handleResize() {
    if (this._cleanupDone || this.isLeaving) return;
    this.replyPage = 0;
    if (this.fileError) this.renderError(); else if (this.view) this.render();
  }
  layout() {
    const narrow = this.scale.width / Math.max(1, this.scale.height) < 1.15;
    const w = narrow ? 780 : 1440, h = narrow ? 1160 : 970;
    return narrow
      ? { narrow, w, h, side: { x: 28, y: 90, w: 724, h: 210 }, main: { x: 28, y: 320, w: 724, h: 374 }, tabsY: 714, actionsY: 778, actionsH: 228, footerY: 1028 }
      : { narrow, w, h, side: { x: 30, y: 100, w: 310, h: 694 }, main: { x: 366, y: 100, w: 1044, h: 416 }, tabsY: 540, actionsY: 608, actionsH: 220, footerY: 846 };
  }
  rect(x, y, w, h, fill, stroke = null, alpha = 1) {
    const object = this.add.rectangle(x + w / 2, y + h / 2, w, h, fill, alpha);
    if (stroke !== null) object.setStrokeStyle(2, stroke);
    this.root.add(object); return object;
  }
  text(x, y, content, width, options = {}) {
    const object = this.add.text(x, y, String(content ?? ''), {
      fontFamily: 'SpecialElite', fontSize: '23px', color: C.ink,
      wordWrap: { width, useAdvancedWrap: true }, lineSpacing: 4, ...options
    });
    this.root.add(object); return object;
  }
  fitText(object, height, minimum = 17) {
    while (object.height > height && parseInt(object.style.fontSize, 10) > minimum) object.setFontSize(parseInt(object.style.fontSize, 10) - 1);
    return object;
  }
  label(x, y, content, width, color = C.muted) {
    return this.text(x, y, content, width, { fontFamily: 'PressStart2P', fontSize: '11px', lineSpacing: 5, color });
  }
  button(x, y, width, label, callback, enabled = true, height = 54, selected = false) {
    const normal = !enabled ? 0xd2c8af : selected ? C.green : C.dark;
    this.rect(x + 3, y + 4, width, height, C.shadow, null, 0.22);
    const bg = this.rect(x, y, width, height, normal, selected ? C.gold : C.edge);
    const title = this.text(x + 14, y + height / 2, label, width - 28, {
      fontSize: '21px', color: enabled ? '#fff2d3' : '#746e60', align: 'center', lineSpacing: 1
    }).setOrigin(0, 0.5);
    title.setFixedSize(width - 28, 0); this.fitText(title, height - 14, 17);
    if (!enabled) return;
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(selected ? 0x627c60 : 0x42594e))
      .on('pointerout', () => bg.setFillStyle(normal))
      .on('pointerdown', () => { if (!this.isLeaving && !this.isSaving && !this._cleanupDone) callback(); });
  }
  createRoot() {
    this.root?.destroy(true); this.root = this.add.container(0, 0); this.L = this.layout();
    const { w, h } = this.L;
    this.rect(14, 20, w - 28, h - 34, C.shadow);
    this.rect(8, 8, w - 28, h - 32, C.cover, C.edge);
    this.rect(20, 70, w - 40, h - 92, C.paper);
    for (let y = 78; y < h - 30; y += 11) this.rect(22, y, w - 44, 1, 0x7f735a, null, 0.035);
    this.label(32, 29, 'MARK AGENCY / WITNESS INTERVIEW', w - 80, '#f1ddb2');
    const scale = Math.min(this.scale.width / w, this.scale.height / h);
    this.root.setScale(scale).setPosition((this.scale.width - w * scale) / 2, (this.scale.height - h * scale) / 2);
  }
  render() {
    this.view = getInterviewView(this.caseKey, this.encounterId);
    this.createRoot(); this.renderWitness(); this.renderReply(); this.renderTabs(); this.renderActions(); this.renderFooter();
  }
  renderWitness() {
    const { side: s, narrow } = this.L;
    this.rect(s.x + 4, s.y + 5, s.w, s.h, C.shadow, null, 0.13);
    this.rect(s.x, s.y, s.w, s.h, 0xdcd0b1, C.edge);
    const px = s.x + 18, py = s.y + 18;
    const pw = narrow ? 134 : s.w - 36, ph = narrow ? 170 : 228;
    this.rect(px, py, pw, ph, 0xf5ecd6, C.edge); this.rect(px + 8, py + 8, pw - 16, ph - 32, C.dark);
    const key = [this.encounter.portraitKey, this.testimony.portraitKey, ...PORTRAITS].find(value => typeof value === 'string' && this.textures.exists(value));
    if (key) {
      const image = this.add.image(px + pw / 2, py + (ph - 24) / 2, key);
      image.setScale(Math.min((pw - 28) / image.width, (ph - 46) / image.height)); this.root.add(image);
    } else this.label(px + 16, py + 50, 'NO PHOTO', pw - 32, '#eee0bd');
    this.label(px + 10, py + ph - 20, 'WITNESS FILE', pw - 20);
    const tx = narrow ? px + pw + 22 : px, ty = narrow ? py : py + ph + 26;
    const tw = narrow ? s.w - pw - 62 : pw;
    this.label(tx, ty, 'CONTACT FOR', tw);
    this.fitText(this.text(tx, ty + 23, this.testimony.suspectName || 'Unknown suspect', tw, { fontSize: '27px' }), narrow ? 38 : 72, 19);
    const roleY = ty + (narrow ? 66 : 94);
    this.fitText(this.text(tx, roleY, this.testimony.role || 'Witness', tw, { fontSize: '20px', color: C.muted }), 32, 17);
    const cy = narrow ? roleY + 37 : roleY + 56, window = this.testimony.crimeWindow;
    this.text(tx, cy, window ? `THEFT  ${clock(window.startMinute)} - ${clock(window.endMinute)}` : 'THEFT TIME UNAVAILABLE', tw, { fontSize: '19px', color: '#843e35' });
    if (narrow) return;
    this.rect(px, cy + 44, pw, 2, C.edge); this.label(px, cy + 65, 'COOPERATION', pw);
    this.text(px, cy + 91, COOPERATION_LABELS[this.view.state.level] || 'Cautious', pw, { fontSize: '25px' });
    for (let i = 0; i < 4; i++) this.rect(px + i * ((pw + 8) / 4), cy + 128, (pw - 24) / 4, 12, i <= this.view.state.level ? C.green : 0xbeb395);
    this.fitText(this.text(px, cy + 157, 'Willing to talk does not mean telling the truth.', pw, { fontSize: '19px', color: C.muted }), 76, 18);
  }
  renderReply() {
    const { main: m, narrow } = this.L;
    const entry = this.entry || { detective: '', witness: this.view.personality.opening };
    this.rect(m.x + 4, m.y + 5, m.w, m.h, C.shadow, null, 0.12); this.rect(m.x, m.y, m.w, m.h, C.light, C.edge);
    this.rect(m.x, m.y, 6, m.h, this.view.state.pendingChallenge ? C.red : C.green);
    this.label(m.x + 24, m.y + 18, this.historyIndex >= 0 ? 'INTERVIEW / ARCHIVE' : this.view.state.pendingChallenge ? 'INTERVIEW / FOLLOW-UP' : 'INTERVIEW / LIVE', m.w - 48);
    const source = [entry.detective ? `DETECTIVE\n${entry.detective}` : '', `WITNESS\n${entry.witness || ''}`, entry.note ? `NOTE\n${entry.note}` : ''].filter(Boolean).join('\n\n');
    const fontSize = narrow ? 23 : 25;
    const body = this.text(m.x + 24, m.y + 51, '', m.w - 48, { fontSize: `${fontSize}px`, lineSpacing: 6 });
    const pages = this.paginate(body, source, m.h - 120);
    this.replyPage = Math.max(0, Math.min(this.replyPage, pages.length - 1)); body.setText(pages[this.replyPage]);
    this.rect(m.x + 24, m.y + m.h - 60, m.w - 48, 1, C.edge);
    this.button(m.x + 24, m.y + m.h - 47, 110, '< Back', () => { this.replyPage--; this.render(); }, this.replyPage > 0, 34);
    this.text(m.x + 150, m.y + m.h - 41, `${this.replyPage + 1} / ${pages.length}`, m.w - 300, { fontSize: '18px', align: 'center', color: C.muted });
    this.button(m.x + m.w - 134, m.y + m.h - 47, 110, 'Next >', () => { this.replyPage++; this.render(); }, this.replyPage < pages.length - 1, 34);
  }
  paginate(object, content, maxHeight) {
    const pages = []; let current = '';
    for (const line of object.getWrappedText(content)) {
      const candidate = current ? `${current}\n${line}` : line; object.setText(candidate);
      if (object.height > maxHeight && current) { pages.push(current); current = line; } else current = candidate;
    }
    pages.push(current || 'No statement recorded.'); return pages;
  }
  renderTabs() {
    const { main: m, tabsY } = this.L;
    const tabs = [['questions', 'Questions'], ['approaches', 'Approach'], ['challenge', 'Challenge'], ['notes', 'Notes']];
    const gap = 10, width = (m.w - gap * 3) / 4;
    tabs.forEach(([id, title], i) => this.button(m.x + i * (width + gap), tabsY, width, title, () => {
      this.tab = id; this.render();
    }, !this.view.state.pendingChallenge, 50, this.tab === id));
  }
  run(action) {
    if (this.isLeaving || this.isSaving) return;
    try {
      const result = action();
      if (result) { this.entry = result; this.replyPage = 0; this.historyIndex = -1; } this.error = '';
    } catch (error) { console.error('[AlibiScene] Action failed.', error); this.error = 'That action could not be completed.'; }
    this.render();
  }
  choice(index, title, callback, enabled = true, tag = '') {
    const { main: m, actionsY } = this.L, width = (m.w - 14) / 2;
    this.button(m.x + index % 2 * (width + 14), actionsY + Math.floor(index / 2) * 66, width, tag ? `${title}  / ${tag}` : title, callback, enabled, 56);
  }
  info(message) {
    const { main: m, actionsY } = this.L;
    this.fitText(this.text(m.x + 12, actionsY + 18, message, m.w - 24, { fontSize: '23px', lineSpacing: 7 }), 166, 20);
  }
  renderActions() {
    const state = this.view.state, call = (fn, id) => () => this.run(() => fn(this.caseKey, this.encounterId, id));
    if (state.pendingChallenge) {
      [['space', 'Give them room'], ['press', 'Ask directly'], ['pause', 'Pause this topic']].forEach(([id, title], i) => this.choice(i, title, call(followUpChallenge, id)));
      this.actionHint('Read the response. Choose how to continue — not who is guilty.'); return;
    }
    if (this.tab === 'questions') {
      const asked = state.asked;
      [
        ['statement', 'Ask about the alibi', true], ['person', 'What are they like?', true],
        ['personal', 'Personal impression', state.level >= 2 && asked.includes('person')],
        ['withheld', 'Anything left out?', state.level >= 3 && asked.includes('statement')],
        ['summary', 'Clarify the account', state.level >= 2 && asked.includes('statement') && Boolean(this.testimony.timelineCard?.label)]
      ].forEach(([id, title, enabled], i) => this.choice(i, title, call(askWitness, id), enabled, asked.includes(id) ? 'review' : enabled ? '' : 'locked'));
    } else if (this.tab === 'approaches') {
      APPROACHES.forEach((item, i) => {
        const used = state.usedApproaches.includes(item.id); this.choice(i, item.label, call(applyApproach, item.id), !used, used ? 'used' : '');
      });
      this.actionHint(getRapport() >= 5 ? this.view.personality.hint : 'Listen to the witness. An approach changes cooperation, not the evidence.');
    } else if (this.tab === 'challenge') {
      if (this.view.revisedStatement) return this.info('A revised account has been recorded.\nCompare both versions in Notes.');
      if (!this.view.canChallenge) return this.info('Hear this alibi and record the other witnesses for this suspect before confronting anyone.');
      CHALLENGES.forEach((item, i) => {
        const thread = state.confrontations?.[item.id];
        this.choice(i, item.label, call(challengeWitness, item.id), true, thread?.resolved ? 'review' : thread?.stage > 0 ? 'resume' : '');
      });
    } else this.renderNotes();
  }
  actionHint(message) {
    const { main: m, actionsY, actionsH } = this.L;
    this.fitText(this.text(m.x + 4, actionsY + 142, message, m.w - 8, { fontSize: '19px', color: C.muted }), actionsH - 146, 18);
  }
  renderNotes() {
    const history = this.view.state.transcript;
    this.choice(0, 'Original account', () => {
      this.historyIndex = -1; this.replyPage = 0;
      this.entry = { detective: 'Review the original statement.', witness: this.view.originalStatement, note: this.view.revisedStatement ? 'Original account — subsequently withdrawn.' : 'Original account, not independent verification.' }; this.render();
    });
    this.choice(1, 'Revised account', () => {
      this.historyIndex = -1; this.replyPage = 0;
      this.entry = { detective: 'Review the revised statement.', witness: this.view.revisedStatement, note: 'The original remains in the record.' }; this.render();
    }, Boolean(this.view.revisedStatement));
    const browse = direction => {
      this.historyIndex = this.historyIndex < 0 ? (direction < 0 ? history.length - 1 : 0) : (this.historyIndex + direction + history.length) % history.length;
      this.entry = history[this.historyIndex]; this.replyPage = 0; this.render();
    };
    this.choice(2, 'Previous reply', () => browse(-1), history.length > 0); this.choice(3, 'Next reply', () => browse(1), history.length > 0);
    this.actionHint(this.historyIndex >= 0 ? `Archive entry ${this.historyIndex + 1} of ${history.length}. Viewing history does not change the interview.` : `${history.length} exchanges in the interview record.`);
  }
  renderFooter() {
    const { w, footerY: y, narrow } = this.L, state = this.view.state;
    this.rect(30, y - 10, w - 60, 2, C.edge);
    const status = this.isSaving ? 'Saving interview...' : this.error || (state.pendingChallenge ? 'Follow-up in progress. You may leave and return.' : this.view.completed ? 'Interview recorded. Further questions are still available.' : 'Hear the alibi, then record this interview.');
    this.statusText = this.text(32, y + 2, status, w - 64, { fontSize: '19px', color: this.error ? '#843e35' : C.muted });
    this.fitText(this.statusText, narrow ? 43 : 30, 17);
    const gap = 14, width = (w - 64 - gap * 2) / 3, by = y + (narrow ? 53 : 40);
    this.button(32, by, width, 'Return to city', () => this.returnToCity(), true, 52);
    this.button(32 + width + gap, by, width, this.view.completed ? 'Recorded' : 'Record interview', () => this.finishInterview(), state.asked.includes('statement') && !this.view.completed && !state.pendingChallenge, 52, true);
    this.button(32 + (width + gap) * 2, by, width, 'Alibi board', () => this.openBoard(), allWitnessesVisited(this.caseKey, this.suspectId), 52);
  }
  async finishInterview() {
    if (this.isSaving || this.isLeaving || this.view.completed || this.view.state.pendingChallenge || !this.view.state.asked.includes('statement')) return;
    this.isSaving = true; this.render();
    try {
      if (!markAlibiWitnessInterviewed(this.caseKey, this.encounterId)) throw new Error('Interview could not be recorded.');
      advanceCrimeTutorial(gameState, 'talk_to_npcs'); requestAutosave(); flushAutosave(); this.loadWitness(); this.error = '';
    } catch (error) { console.error('[AlibiScene] Recording failed.', error); this.error = 'Could not record the interview. Please try again.'; }
    finally { this.isSaving = false; if (!this._cleanupDone) this.render(); }
  }
  renderError() {
    this.createRoot();
    this.text(48, 180, 'The witness file could not be opened.\nEven paperwork needs an alibi.', this.L.w - 96, { fontSize: '29px' });
    this.statusText = this.text(48, 360, '', this.L.w - 96); this.button(48, 440, 300, 'Return to city', () => this.returnToCity());
  }
  async openBoard() {
    if (!allWitnessesVisited(this.caseKey, this.suspectId)) return;
    await this.navigate('AlibiTimelineScene', { caseKey: this.caseKey, suspectId: this.suspectId, cityId: this.cityId, returnScene: this.returnScene, returnData: this.returnData });
  }
  async returnToCity() { await this.navigate(this.returnScene, this.returnData); }
  async navigate(sceneKey, data) {
    if (this.isLeaving || this.isSaving || this._cleanupDone) return;
    this.isLeaving = true;
    const hud = this.interviewHud;
    try {
      flushAutosave();
      const opened = await this.goto(sceneKey, data);
      if (opened) {
        this.releaseInterviewHud();
        // Do not overwrite a context already set by the destination scene.
        if (hud && !hud._cleanupDone && hud.currentGameplaySceneKey === 'AlibiScene') hud.setCurrentGameplayScene?.(sceneKey);
      } else if (!this._cleanupDone) {
        this.isLeaving = false; this.hideInterviewHud();
        this.statusText?.setText('The next scene could not be opened. Please try again.');
      }
    } catch (error) {
      console.error('[AlibiScene] Navigation failed.', error);
      if (!this._cleanupDone) {
        this.isLeaving = false; this.hideInterviewHud();
        this.statusText?.setText('The next scene could not be opened. Please try again.');
      }
    }
  }
}