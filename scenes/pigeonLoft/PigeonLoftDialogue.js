import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { W, H, ORDER, LOCAL, P, FONT, BEAM, BEAM_CENTER, WINDOW_FLY, LINES, pick, timeText, goldPlate } from './PigeonLoftData.js';
import { feedPigeon, sendPigeon, collectPigeonFind, buyPigeonPerch } from '../../managers/PigeonManager.js';
import { moneyManager, MONEY_SOURCE } from '../../managers/MoneyManager.js';
import { PigeonLoftDialogue } from '../../ui/PigeonLoftDialogue.js';

export const pigeonLoftDialogue = {
  ensureDialogue() {
    if (this.dialogue?.isOpen) return this.dialogue;
    this.dialogue = new PigeonLoftDialogue(this, {
      leaveLabel: __dialogueText("scenes/PigeonLoftScene.js", "t_b863269ea03e6e01e9fa"), onLeave: () => this.closeDialogue()
    });
    return this.dialogue;
  },
  closeDialogue() {
    this.naming?.reset();
    const had = Boolean(this.dialogue || this.dialogueCtx);
    this.dialogue?.destroy(); this.dialogue = null; this.dialogueCtx = null; this.lastText = '';
    if (had && this.layer?.active && !this._cleanupDone && this.state) this.renderLoft();   // zdejmij zaznaczenie z listy gołębi
  },
  birdOf(slot) {
    const bird = this.state?.slots?.find(s => s.slot === slot)?.bird || null;
    return bird ? this.naming.presentBird(bird) : null;
  },
  pigeonPortrait(bird) {
    const slot = bird.slot, pKey = `p${slot}`, bKey = `p${slot}b`;
    const keys = ['attic'];
    if (bird.status !== 'flying') keys.push(pKey);
    if (bird.status === 'ready') keys.push(bKey);
    const boxes = [this.alphaBounds(pKey), bird.status === 'ready' ? this.alphaBounds(bKey) : null].filter(Boolean);
    const frame = this.textures.exists('attic') ? this.textures.getFrame('attic') : null;
    const ratio = frame ? (frame.realWidth || frame.width) / (frame.realHeight || frame.height) : 16 / 9;
    if (!boxes.length) return { kind: 'crop', keys, cx: 0.2, cy: 0.55, sideFrac: 0.4 };
    const x0 = Math.min(...boxes.map(b => b.x - b.w / 2)), x1 = Math.max(...boxes.map(b => b.x + b.w / 2));
    const y0 = Math.min(...boxes.map(b => b.y - b.h / 2)), y1 = Math.max(...boxes.map(b => b.y + b.h / 2));
    return { kind: 'crop', keys, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, sideFrac: Math.max((x1 - x0) * ratio, y1 - y0) * 1.5 };
  },
  birdLine(bird) {
    if (bird.status === 'ready') return `${bird.name} ${pick(LINES.ready)}${bird.find?.name ? `${__dialogueText("scenes/PigeonLoftScene.js", "t_88a6eb8080eb682701e7")}${bird.find.name}${__dialogueText("scenes/PigeonLoftScene.js", "t_cdb4ee2aea69cc6a8333")}` : ''}`;
    if (bird.status === 'home') return `${bird.name} ${pick(bird.fed ? LINES.fed : LINES.hungry)}`;
    return `${bird.name}${__dialogueText("scenes/PigeonLoftScene.js", "t_b872072953bf35410339")}${timeText(bird)}${__dialogueText("scenes/PigeonLoftScene.js", "t_92efc10ae7843ab4c473")}`;
  },
  birdFooter(bird) {
    const flights = Number.isFinite(bird.flights) ? `${__dialogueText("scenes/PigeonLoftScene.js", "t_842abe315dae67b20a53")}${bird.flights}` : '';
    if (bird.status === 'ready') return { text: `${__dialogueText("scenes/PigeonLoftScene.js", "t_298cdc85167215435981")}${flights}`, color: P.GREEN };
    if (bird.status === 'flying') return { text: `${__dialogueText("scenes/PigeonLoftScene.js", "t_883842e9f0d7e019212f")}${timeText(bird)}`, color: P.TOPIC_USED };
    return bird.fed ? { text: `${__dialogueText("scenes/PigeonLoftScene.js", "t_52f67d7d4b2afd5c59cb")}${flights}`, color: P.AMBER } : { text: `${__dialogueText("scenes/PigeonLoftScene.js", "t_dd6cd64498690c8cec31")}${flights}`, color: P.RED };
  },
  openBirdDialogue(slot, { text = null } = {}) {
    if (this.leaving || this.debugMode || this._cleanupDone || !this.state || this.pigeonNameEditor) return;
    const options = this.naming.beforeOpen(slot, { text });
    if (!options) return;
    text = options.text;
    const bird = this.birdOf(slot);
    if (!bird) { this.feedback(__dialogueText("scenes/PigeonLoftScene.js", "t_65e3e37c5ae3821834e1")); return; }
    this.selectedSlot = slot; this.hideTip(); this.ensureDialogue();
    this.dialogueCtx = { type: 'bird', slot, sig: '' };
    this.applyBirdDialogue(true, text);
    this.renderLoft();   // podświetl wybranego w liście
  },
  applyBirdDialogue(full, text = null) {
    const d = this.dialogue, ctx = this.dialogueCtx, bird = ctx ? this.birdOf(ctx.slot) : null;
    if (!d?.isOpen || !bird) { if (ctx && !bird) this.closeDialogue(); return; }
    const sig = `${bird.id}|${bird.status}|${bird.name}`;
    if (full || ctx.sig !== sig) { d.setSpeaker({ name: bird.name, portrait: this.pigeonPortrait(bird) }); ctx.sig = sig; }
    const footer = this.birdFooter(bird);
    if (full || text !== null) {
      this.lastText = text ?? this.birdLine(bird);
      d.setText(this.lastText, { footer: footer.text, footerColor: footer.color });
    } else d.setFooter(footer.text, footer.color);
    d.setTopics(this.birdTopics(bird));
  },
  birdTopics(bird) {
    const namingTopics = this.naming.topics(bird);
    if (namingTopics) return namingTopics;
    const state = this.state, feed = state.feed, topics = [];
    if (bird.status === 'ready') topics.push({ id: 'collect', label: __dialogueText("scenes/PigeonLoftScene.js", "t_1152e35f44c834340206"), state: 'accent', onSelect: () => this.action(() => collectPigeonFind(bird.id)) });
    else if (bird.status === 'home' && bird.fed) topics.push({ id: 'send', label: __dialogueText("scenes/PigeonLoftScene.js", "t_3ea205b8f7139e9d6e87"), state: 'accent', onSelect: () => this.action(() => sendPigeon(bird.id)) });
    else if (bird.status === 'home') topics.push({ id: 'feed', label: `${__dialogueText("scenes/PigeonLoftScene.js", "t_afdbce8aed77f753db73")}${feed}${__dialogueText("scenes/PigeonLoftScene.js", "t_ba5ec51d07a4ac0e9516")}`, state: feed > 0 ? 'accent' : 'disabled', onSelect: () => this.feedBird(bird) });
    else topics.push({ id: 'away', label: `${__dialogueText("scenes/PigeonLoftScene.js", "t_707c6e6d04393295f58a")}${timeText(bird)}${__dialogueText("scenes/PigeonLoftScene.js", "t_ba5ec51d07a4ac0e9516")}`, state: 'disabled',
      onSelect: () => this.dialogueSay(`${bird.name}${__dialogueText("scenes/PigeonLoftScene.js", "t_770ed1a8cfefc058358d")}${timeText(bird)}${__dialogueText("scenes/PigeonLoftScene.js", "t_cdb4ee2aea69cc6a8333")}`) });
    topics.push({ id: 'rename', label: __dialogueText("scenes/PigeonLoftScene.js", "t_3064d79a295cefe4b384"), state: 'normal', onSelect: () => this.naming.startRename(bird) });
    if (state.birds.length > 1) {
      const list = state.birds, i = list.findIndex(b => b.id === bird.id);
      topics.push({ id: 'next', label: __dialogueText("scenes/PigeonLoftScene.js", "t_14ba2669a2208cdc4696"), state: 'normal', onSelect: () => this.openBirdDialogue(list[(i + 1) % list.length].slot) });
      topics.push({ id: 'prev', label: __dialogueText("scenes/PigeonLoftScene.js", "t_f7c7e1bb7608682b015a"), state: 'normal', onSelect: () => this.openBirdDialogue(list[(i - 1 + list.length) % list.length].slot) });
    }
    topics.push({ id: 'collection', label: __dialogueText("scenes/PigeonLoftScene.js", "t_7b790708ff1b171315a1"), state: 'normal', onSelect: () => this.openModal('collection') });
    return topics;
  },
  feedBird(bird) {
    if (this.state.feed < 1) { this.dialogueSay(__dialogueText("scenes/PigeonLoftScene.js", "t_6d61d87f32116dd77b49")); return; }
    this.action(() => feedPigeon(bird.slot));
  },
  openPerchDialogue({ text = null } = {}) {
    if (this.leaving || this.debugMode || this.pigeonNameEditor || !this.state || this.state.nextPerchPrice == null) return;
    this.hideTip(); this.ensureDialogue(); this.dialogueCtx = { type: 'perch' };
    const no = ORDER[this.state.perches], price = this.state.nextPerchPrice, d = this.dialogue;
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH), frame = this.textures.exists('attic') ? this.textures.getFrame('attic') : null;
    const ratio = frame ? (frame.realWidth || frame.width) / (frame.realHeight || frame.height) : 16 / 9;
    const box = this.alphaBounds(`cage${no}`);
    d.setSpeaker({ name: `${__dialogueText("scenes/PigeonLoftScene.js", "t_66ed1c62c4c4ff10d052")}${no}`, portrait: { kind: 'crop', keys: ['attic', `cage${no}`],
      cx: box?.x ?? 0.85, cy: box?.y ?? 0.75, sideFrac: box ? Math.max(box.w * ratio, box.h) * 1.4 : 0.4 } });
    d.setStamp(null);
    this.lastText = text ?? `${__dialogueText("scenes/PigeonLoftScene.js", "t_bf6e41f54d42f36c51a5")}${no}${__dialogueText("scenes/PigeonLoftScene.js", "t_daad7f30fde86f84f9dc")}${price}${__dialogueText("scenes/PigeonLoftScene.js", "t_0bf68dd703b8ed193f75")}`;
    d.setText(this.lastText, { footer: `${__dialogueText("scenes/PigeonLoftScene.js", "t_09fc96082d34c2dfc129")}${price}${__dialogueText("scenes/PigeonLoftScene.js", "t_53c4555390668997fa1d")}${cash}`, footerColor: cash >= price ? P.AMBER : P.RED });
    d.setTopics([
      { id: 'buy', label: `${__dialogueText("scenes/PigeonLoftScene.js", "t_0e67cf957f052a464935")}${price}${__dialogueText("scenes/PigeonLoftScene.js", "t_ba5ec51d07a4ac0e9516")}`, state: cash >= price ? 'accent' : 'disabled', onSelect: () => this.action(() => buyPigeonPerch()) },
      { id: 'later', label: __dialogueText("scenes/PigeonLoftScene.js", "t_2ac741e6203af759f29f"), state: 'normal', onSelect: () => this.closeDialogue() },
      { id: 'collection', label: __dialogueText("scenes/PigeonLoftScene.js", "t_7b790708ff1b171315a1"), state: 'normal', onSelect: () => this.openModal('collection') }
    ]);
  },
  dialogueSay(message) {
    const d = this.dialogue;
    if (!d?.isOpen) { this.showToast(message); return; }
    this.lastText = message;
    let footer = null;
    if (this.dialogueCtx?.type === 'bird') { const bird = this.birdOf(this.dialogueCtx.slot); if (bird) footer = this.birdFooter(bird); }
    d.setText(message, footer ? { footer: footer.text, footerColor: footer.color } : {});
  },
  refreshDialogueUi() {
    if (!this.dialogue?.isOpen || !this.dialogueCtx) return;
    if (this.dialogueCtx.type === 'bird') this.applyBirdDialogue(false);
  }
};
