import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gordonEthicsData as DATA, getGordonEthics, getGordonSourceContext, chooseGordonSource, chooseGordonPrivacy } from '../../gordonEthicsService.js';
import { readGordonEthics, availableGordonSourceChoices, planGordonSource, planGordonPrivacy } from '../../gordonEthicsModel.js';
import { prepareGordonPaperAudio, playGordonPaperAudio } from './GordonPaperAudio.js';

function localState(scene) { return scene.preview ? readGordonEthics(scene.previewEthics) : getGordonEthics(); }
function context(scene) {
  if (!scene.preview) return getGordonSourceContext();
  const route = scene.previewMargeRoute ?? 'restricted_copy';
  return { route, sourceProtectionPromised: route !== 'official_record', restrictedCopy: route === 'restricted_copy',
    document: route === 'restricted_copy' ? { restricted: true, title: __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_991b795bc49841bd5d68"), text: __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_d455961d6b2f8fa1ec75") } : null };
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
  const redraw = () => { body.setText(pages[page]); counter.setText(`${page + 1}${__dialogueText("scenes/gordon/GordonEthicsUI.js", "t_005e1574a2b5c8163046")}${pages.length}`); };
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
    const s = state.source; receipt(scene, __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_eb6f75884a55579dbf25"), [s.choice.label, ...s.choice.reply, s.choice.reflection].join('\n\n')); return;
  }
  if (interview.completed || interview.dismissalPending) { scene.showStatus(DATA.messages.legacy); return; }
  const source = context(scene), choices = availableGordonSourceChoices(DATA, source), root = panel(scene, DATA.source.title);
  label(scene, root, 960, 280, DATA.source.intro, 28, 1350);
  label(scene, root, 960, 350, __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_c9b593d94beb68090665"), 21, 1340, '#cbbd92');
  choices.forEach((choice, i) => button(scene, root, 960, 430 + i * 112, choice.label, () => {
    let result;
    try { result = scene.preview ? planGordonSource(DATA, scene.previewEthics, source, choice.id) : chooseGordonSource(choice.id); }
    catch (error) {
      console.error('[Gordon source] Choice failed:', error); scene.showStatus(__dialogueText("scenes/gordon/GordonEthicsUI.js", "t_befb866a99f920987815")); return;
    }
    if (!result.ok) { scene.showStatus(DATA.messages.locked); return; }
    if (scene.preview) scene.previewEthics = result.state; else scene.savedOk = result.saved;
    closeGordonEthicsPanel(scene); const s = result.state.source;
    const lines = [{ speaker: __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_1e954e77ee4e5253c6c5"), text: s.choice.label },
      ...s.choice.reply.map(text => ({ speaker: __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_8c717832df1a5e6c33f8"), text })),
      { speaker: __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_eeea37862595ac0cdf53"), text: s.choice.reflection + saveNotice(result) }];
    scene.openDialogue(lines, __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_626c89d2150c081e3c27"), () => onComplete?.());
  }));
  button(scene, root, 960, 930, __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_095c9dd474d6ca229bb1"), () => {
    closeGordonEthicsPanel(scene); scene.showStatus(DATA.messages.notNow);
  }, 500, 62);
}
export function openGordonPrivacyPanel(scene) {
  if (scene.closing || scene.modal || scene.dialogue || !scene.allowed || scene.hotspotDebug?.enabled) return;
  const existing = localState(scene).privacy;
  if (existing) {
    receipt(scene, __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_8f3ff12d177657b2a276"), existing.choice.result +
      (existing.letter ? __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_3fd6cb1ab0a26004bb96") + existing.letter : '') + __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_886042da86f3a484ac30")); return;
  }
  const root = panel(scene, DATA.privacy.title);
  label(scene, root, 960, 285, DATA.privacy.intro, 28, 1350);
  label(scene, root, 960, 365, __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_85903afe72fee8f22bfb"), 21, 1350, '#cbbd92');
  DATA.privacy.choices.forEach((choice, i) => button(scene, root, 960, 470 + i * 125, choice.label, () => {
    let result;
    try { result = scene.preview ? planGordonPrivacy(DATA, scene.previewEthics, choice.id) : chooseGordonPrivacy(choice.id); }
    catch (error) {
      console.error('[Gordon privacy] Choice failed:', error); scene.showStatus(__dialogueText("scenes/gordon/GordonEthicsUI.js", "t_2c162b800dd6bab649ea")); return;
    }
    if (!result.ok) { scene.showStatus(DATA.messages.locked); return; }
    if (scene.preview) scene.previewEthics = result.state;
    closeGordonEthicsPanel(scene); const p = result.state.privacy;
    receipt(scene, __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_8f3ff12d177657b2a276"), p.choice.result +
      (p.letter ? __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_3fd6cb1ab0a26004bb96") + p.letter : '') + saveNotice(result));
  }));
  button(scene, root, 960, 910, __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_095c9dd474d6ca229bb1"), () => {
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
    this.mode?.setText(this.preview ? __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_6d815ee6e8e48d5802e4") : __dialogueText("scenes/gordon/GordonEthicsUI.js", "t_eb6f75884a55579dbf25")).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { if (!this.blocked()) openGordonSourcePanel(this); });
  };
}
