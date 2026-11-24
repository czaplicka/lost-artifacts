import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { LOCAL_DEBUG_ALLOWED, FONT, COLOR, TAG_W, BOARD_W, FALLBACK_DESCRIPTIONS, SHOP_SIGNS, QUIPS, normalizeCityId, hashString, seededRandom } from './ShopSceneData.js';
import { HomeTownDialogue } from '../../ui/HomeTownDialogue.js';

export const shopSceneSpeech = {
  createRegisterZone() {
    const zone = this.add.zone(392, 615, 205, 200).setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      if (this.debugMode || this.hudPanelOpen || this.exiting) return;
      this.sayQuip(QUIPS.idle);
    });
    this.registerZone = zone;
  },
  sayQuip(list) {
    if (!list?.length || this.exiting || this._cleanupDone || !this.sys?.isActive()) return;
    if (this.hudPanelOpen || this.debugMode) { this.scheduleIdleQuip(); return; }
    let text, guard = 0;
    do { text = list[Math.floor(Math.random() * list.length)]; guard++; } while (list.length > 1 && text === this.lastQuip && guard < 6);
    this.lastQuip = text;
    this.showBubble(text);
    this.scheduleIdleQuip();
  },
  scheduleIdleQuip() {
    this.idleTimer?.remove(false);
    this.idleTimer = this.time.delayedCall(Phaser.Math.Between(14000, 22000), () => {
      if (this.exiting || this._cleanupDone) return;
      if (this.hudPanelOpen || this.debugMode) { this.scheduleIdleQuip(); return; }
      this.sayQuip(QUIPS.idle);
    });
  },
  showBubble(text) {
    this.destroyBubble();
    if (this.exiting || this._cleanupDone || !this.sys?.isActive()) return;
    const dialogue = new HomeTownDialogue(this, () => {
      if (this.shopDialogue === dialogue) this.destroyBubble();
    });
    this.shopDialogue = dialogue;
    dialogue.show({
      title: (SHOP_SIGNS[this.cityId] || SHOP_SIGNS.default).name,
      text, messages: [{ speaker: 'npc', text }], choices: [],
      nodeId: 'shop_register', showTrust: false, scoreTrust: false, depth: 200,
      onDraw: () => {
        if (this.shopDialogue !== dialogue) return;
        const panel = dialogue.panel;
        this.bubble = dialogue.root;
        // Automatyczna uwaga kasy nie jest rozmową blokującą sklep.
        // HomeTownView domyślnie tworzy modal: natychmiast oddajemy fokus HUD-owi.
        panel._releaseModal();
        panel.opts.modal = false;
        if (panel.blocker?.input) panel.blocker.input.enabled = false;
        panel._handleKey = () => {};
        panel.choiceTitle.setVisible(false);
        panel.byeBtn.text.setText('CLOSE');
      }
    });
    this.bubbleTimer = this.time.delayedCall(3600 + text.length * 25, () => this.hideBubble());
  },
  hideBubble(c = this.bubble) {
    if (!c?.active || c !== this.bubble || this.bubbleFadeTimer) return;
    const dialogue = this.shopDialogue;
    this.tweens.add({ targets: c, alpha: 0, duration: 180 });
    // Osobny timer domknie również panel przebudowany podczas resize.
    this.bubbleFadeTimer = this.time.delayedCall(180, () => {
      if (this.shopDialogue === dialogue) this.destroyBubble();
    });
  },
  destroyBubble() {
    this.bubbleTimer?.remove(false); this.bubbleTimer = null;
    this.bubbleFadeTimer?.remove(false); this.bubbleFadeTimer = null;
    if (this.bubble?.active) this.tweens.killTweensOf(this.bubble);
    const dialogue = this.shopDialogue;
    this.shopDialogue = null;
    this.bubble = null;
    dialogue?.destroy();
  }
};
