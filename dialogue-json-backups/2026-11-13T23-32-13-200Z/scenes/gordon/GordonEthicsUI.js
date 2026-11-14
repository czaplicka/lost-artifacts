import { gordonEthicsData as DATA, getGordonEthics, getGordonSourceContext, chooseGordonSource, chooseGordonPrivacy } from '../../gordonEthicsService.js';
import { readGordonEthics, availableGordonSourceChoices, planGordonSource, planGordonPrivacy } from '../../gordonEthicsModel.js';
import { prepareGordonPaperAudio, playGordonPaperAudio } from './GordonPaperAudio.js';

function localState(scene) { return scene.preview ? readGordonEthics(scene.previewEthics) : getGordonEthics(); }
function context(scene) {
  if (!scene.preview) return getGordonSourceContext();
  const route = scene.previewMargeRoute ?? 'restricted_copy';
  return { route, sourceProtectionPromised: route !== 'official_record', restrictedCopy: route === 'restricted_copy',
    document: route === 'restricted_copy' ? { restricted: true, title: 'PREVIEW administrative extract', text: 'Preview only. No story changes.' } : null };
}
function label(scene, parent, x, y, text, size = 27, width = 1360, color = '#f1e6cf') {
  const object = scene.add.text(x, y, text, { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`, color,
    align: 'center', wordWrap: { width }, lineSpacing: 7 }).setOrigin(0.5);
  parent.add(object); return object;
}
function button(scene, parent, x, y, text, callback, width = 1350, height = 92) {
  const rect = scene.add.rectangle(x, y, width, height, 0x294331).setStrokeStyle(2, 0xd0a663).setInteractive({ useHandCursor: true });
  parent.add(rect); label(scene, parent, x, y, text, 25, width - 44, '#ffe2ae');
  rect.on('pointerover', () => rect.setFillStyle(0x3d5b42)); rect.on('pointerout', () => rect.setFillStyle(0x294331));
  rect.on('pointerdown', (p, x, y, event) => {
    event?.stopPropagation(); if (!scene.closing && scene.modal === parent) callback();
  }); return rect;
}
function panel(scene, title) {
  prepareGordonPaperAudio(scene, true);
  const root = scene.add.container(0, 0); scene.modal = root; scene.root.add(root); scene.root.bringToTop(root);
  const shield = scene.add.rectangle(960, 540, 1920, 1080, 0, 0.55).setInteractive();
  shield.on('pointerdown', (p, x, y, e) => e?.stopPropagation()); root.add(shield);
  root.add(scene.add.rectangle(960, 540, 1540, 940, 0x10231a, 0.99).setStrokeStyle(3, 0xd0a663));
  label(scene, root, 960, 165, title, 31, 1390, '#ffcf84'); scene.tooltip?.setVisible(false); return root;
}
export function closeGordonEthicsPanel(scene) { const root = scene.modal; scene.modal = null; root?.destroy(true); }
function pagesFor(text) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (line && (line + ' ' + word).length > 78) { lines.push(line); line = word; }
      else line += (line ? ' ' : '') + word;
    } lines.push(line);
  }
  const pages = [];
  for (let i = 0; i < lines.length; i += 8) pages.push(lines.slice(i, i + 8).join('\n'));
  return pages.length ? pages : [''];
}
function receipt(scene, title, text) {
  const root = panel(scene, title), pages = pagesFor(text); let page = 0;
  const body = label(scene, root, 960, 450, pages[0], 27, 1360);
  const counter = label(scene, root, 960, 720, `1 / ${pages.length}`, 22);
  playGordonPaperAudio(scene, 'paper');
  const redraw = () => { body.setText(pages[page]); counter.setText(`${page + 1} / ${pages.length}`); };
  if (pages.length > 1) {
    button(scene, root, 730, 720, '<', () => {
      page = (page - 1 + pages.length) % pages.length; redraw(); playGordonPaperAudio(scene, 'page');
    }, 150, 60);
    button(scene, root, 1190, 720, '>', () => {
      page = (page + 1) % pages.length; redraw(); playGordonPaperAudio(scene, 'page');
    }, 150, 60);
  }
  button(scene, root, 960, 875, 'BACK', () => closeGordonEthicsPanel(scene), 500, 70);
}
function saveNotice(result) { return result.saved === false ? '\n\n' + DATA.messages.savedFailed : ''; }
export function openGordonSourcePanel(scene, onComplete = null) {
  if (scene.closing || scene.modal || scene.dialogue || scene.hotspotDebug?.enabled) return;
  const interview = scene.state();
  if (!interview.unlocked) { scene.showStatus(DATA.messages.locked); return; }
  const state = localState(scene);
  if (state.source) {
    const s = state.source; receipt(scene, 'SOURCE RECORD', [s.choice.label, ...s.choice.reply, s.choice.reflection].join('\n\n')); return;
  }
  if (interview.completed || interview.dismissalPending) { scene.showStatus(DATA.messages.legacy); return; }
  const source = context(scene), choices = availableGordonSourceChoices(DATA, source), root = panel(scene, DATA.source.title);
  label(scene, root, 960, 280, DATA.source.intro, 28, 1350);
  label(scene, root, 960, 350, 'Clicking an option records it. NOT NOW leaves it undecided.', 21, 1340, '#cbbd92');
  choices.forEach((choice, i) => button(scene, root, 960, 430 + i * 112, choice.label, () => {
    let result;
    try { result = scene.preview ? planGordonSource(DATA, scene.previewEthics, source, choice.id) : chooseGordonSource(choice.id); }
    catch (error) {
      console.error('[Gordon source] Choice failed:', error); scene.showStatus('Could not record the source decision. Try again.'); return;
    }
    if (!result.ok) { scene.showStatus(DATA.messages.locked); return; }
    if (scene.preview) scene.previewEthics = result.state; else scene.savedOk = result.saved;
    closeGordonEthicsPanel(scene); const s = result.state.source;
    const lines = [{ speaker: 'DETECTIVE', text: s.choice.label },
      ...s.choice.reply.map(text => ({ speaker: 'Commissioner Gordon', text })),
      { speaker: 'DETECTIVE / PRIVATE NOTE', text: s.choice.reflection + saveNotice(result) }];
    scene.openDialogue(lines, 'CONTINUE MEETING', () => onComplete?.());
  }));
  button(scene, root, 960, 930, 'NOT NOW', () => {
    closeGordonEthicsPanel(scene); scene.showStatus(DATA.messages.notNow);
  }, 500, 62);
}
export function openGordonPrivacyPanel(scene) {
  if (scene.closing || scene.modal || scene.dialogue || !scene.allowed || scene.hotspotDebug?.enabled) return;
  const existing = localState(scene).privacy;
  if (existing) {
    receipt(scene, 'PERSONAL CORRESPONDENCE / YOUR DECISION', existing.choice.result +
      (existing.letter ? '\n\nPRIVATE LETTER\n' + existing.letter : '') + '\n\nThis is not investigative evidence.'); return;
  }
  const root = panel(scene, DATA.privacy.title);
  label(scene, root, 960, 285, DATA.privacy.intro, 28, 1350);
  label(scene, root, 960, 365, 'Choosing records your action immediately. Reading cannot be undone.', 21, 1350, '#cbbd92');
  DATA.privacy.choices.forEach((choice, i) => button(scene, root, 960, 470 + i * 125, choice.label, () => {
    let result;
    try { result = scene.preview ? planGordonPrivacy(DATA, scene.previewEthics, choice.id) : chooseGordonPrivacy(choice.id); }
    catch (error) {
      console.error('[Gordon privacy] Choice failed:', error); scene.showStatus('Could not record the search decision. Try again.'); return;
    }
    if (!result.ok) { scene.showStatus(DATA.messages.locked); return; }
    if (scene.preview) scene.previewEthics = result.state;
    closeGordonEthicsPanel(scene); const p = result.state.privacy;
    receipt(scene, 'PERSONAL CORRESPONDENCE / YOUR DECISION', p.choice.result +
      (p.letter ? '\n\nPRIVATE LETTER\n' + p.letter : '') + saveNotice(result));
  }));
  button(scene, root, 960, 910, 'NOT NOW', () => {
    closeGordonEthicsPanel(scene); scene.showStatus(DATA.messages.notNow);
  }, 500, 62);
}
export function installGordonEthicsInterview(Class) {
  const originalInit = Class.prototype.init, originalTopics = Class.prototype.openTopics, originalCreate = Class.prototype.create;
  Class.prototype.init = function(data = {}) {
    originalInit.call(this, data); this.previewEthics = readGordonEthics(null); this.previewMargeRoute = data.previewMargeRoute ?? 'restricted_copy';
  };
  Class.prototype.openTopics = function() {
    if (this.blocked() || this.hotspotDebug?.enabled) return;
    const state = this.state();
    if (state.unlocked && !state.completed && !state.pendingTopic && !state.dismissalPending && !localState(this).source) {
      openGordonSourcePanel(this, () => originalTopics.call(this)); return;
    } originalTopics.call(this);
  };
  Class.prototype.create = function() {
    originalCreate.call(this);
    prepareGordonPaperAudio(this, true);
    this.mode?.setText(this.preview ? 'SOURCE RECORD / PREVIEW' : 'SOURCE RECORD').setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { if (!this.blocked()) openGordonSourcePanel(this); });
  };
}
