import { dialogueText } from '../dialogues/DialogueText.js';
const text = id => dialogueText('ui/OfficeSaveUI.js', id);
export const SLOT_KEYS = ['slot_1', 'slot_2', 'slot_3'];
export const W = 680;
export const H = 680;
const DEPTH = 20000;
const stop = event => event?.stopPropagation?.();

export const OfficeSavePanelView = {
  addText(parent, x, y, message, size = 18, color = '#463525', font = 'SpecialElite') {
    const object = this.scene.add.text(x, y, message, {
      fontFamily: font, fontSize: `${size}px`, color
    }).setScrollFactor(0);
    parent.add(object);
    return object;
  },

  createPanel() {
    const scene = this.scene;
    const {width, height} = scene.scale;
    this.backdrop = scene.add.rectangle(0, 0, width, height, 0x080a0b, 0.86)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH).setInteractive();
    this.backdrop.on('pointerdown', (_p, _x, _y, event) => {
      stop(event);
      if (!this.isSaving) this.close();
    });
    this.panel = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    const art = scene.add.graphics().setScrollFactor(0);
    art.fillStyle(0x000000, 0.4);
    art.fillRoundedRect(9, 12, W - 9, H - 12, 8);
    art.fillStyle(0x433023, 1);
    art.fillRoundedRect(0, 0, W - 10, H - 12, 8);
    art.lineStyle(2, 0x96734b, 1);
    art.strokeRoundedRect(0, 0, W - 10, H - 12, 8);
    art.fillStyle(0xc3a16c, 1);
    art.fillRoundedRect(20, 20, 225, 40, 5);
    art.fillStyle(0xe7d7b5, 1);
    art.fillRect(20, 52, W - 50, H - 85);
    art.lineStyle(1, 0xbca782, 0.3);
    for (let y = 161; y < H - 50; y += 23) art.lineBetween(33, y, W - 43, y);
    this.panel.add(art);
    const panelHit = scene.add.rectangle(0, 0, W - 10, H - 12, 0x000000, 0)
      .setOrigin(0).setScrollFactor(0).setInteractive();
    panelHit.on('pointerdown', (_p, _x, _y, event) => stop(event));
    this.panel.add(panelHit);
    this.addText(this.panel, 36, 31, text('t_f50fb63cedd84f2ff058'), 10, '#38291d', 'PressStart2P');
    this.addText(this.panel, 42, 74, text('t_5886af6b1e25b6296797'), 26, '#30271f');
    this.addText(this.panel, 43, 111,
      this.locationType === 'hotel' ? text('t_81e6297b639a7c7e146d') : text('t_365d9843a5b2e7b69a37'), 17, '#79654c');
    this.addText(this.panel, 43, 154, text('t_eb0cb23e2a53fa2429aa'), 10, '#71604b', 'PressStart2P');
    this.closeButton = this.addText(this.panel, W - 76, 77, text('t_8e2c8e52dc76bf5ed51a'), 15, '#843b32')
      .setInteractive({useHandCursor: true});
    this.closeButton.on('pointerdown', (_p, _x, _y, event) => {
      stop(event);
      if (!this.isSaving) this.close();
    });
    this.closeButton.on('pointerover', () => {
      if (!this.isSaving) this.closeButton?.setColor('#bc4d38');
    });
    this.closeButton.on('pointerout', () => this.closeButton?.setColor('#843b32'));
    this.statusText = this.addText(this.panel, 43, H - 64, '', 16, '#75634d');
    this.statusText.setWordWrapWidth(W - 96);
    this.layout();
  },

  _destroySlotButtons() {
    for (const slot of this.slotButtons) slot.card?.destroy(true);
    this.slotButtons = [];
  },

  createSlotButtons(slots = []) {
    if (this.destroyed || !this.isOpen || !this.panel?.active) return;
    this._slots = Array.isArray(slots) ? slots : [];
    this._destroySlotButtons();
    const width = W - 94;
    const height = 126;
    SLOT_KEYS.forEach((slotKey, index) => {
      const slot = this._slots.find(entry => entry.slotKey === slotKey);
      const meta = this.getPreferredMeta(slot);
      const hasSave = Boolean(meta);
      const card = this.scene.add.container(42, 184 + index * 140).setScrollFactor(0);
      this.panel.add(card);
      const art = this.scene.add.graphics().setScrollFactor(0);
      card.add(art);
      const draw = (hover = false) => {
        art.clear();
        art.fillStyle(0x3a2919, hover ? 0.22 : 0.12);
        art.fillRect(3, 5, width, height);
        art.fillStyle(hasSave ? (hover ? 0xfff5d8 : 0xf5e9cc) : (hover ? 0xeee2c5 : 0xd9ceb5), 1);
        art.fillRect(0, 0, width, height);
        art.lineStyle(1, hover ? 0x947047 : (hasSave ? 0xb49a70 : 0xb8a98d), 1);
        art.strokeRect(0, 0, width, height);
        art.fillStyle(hasSave ? 0x87533d : 0xa99c82, 1);
        art.fillRect(0, 0, 5, height);
        art.lineStyle(1, 0xbaa483, 0.55);
        art.lineBetween(17, 66, width - 17, 66);
      };
      draw();
      this.addText(card, 18, 12, `${text('t_211a0a700409e2ce5044')}${index + 1}`, 9, '#806c50', 'PressStart2P');
      const name = this.addText(card, 18, 33,
        hasSave ? this.getDetectiveName(meta) : text('t_6b4cf9ab2c7423af4006'), 24, hasSave ? '#30281f' : '#8f816c');
      for (let size = 24; size >= 14; size--) {
        name.setFontSize(size);
        if (name.width <= width - 36) break;
      }
      if (name.width > width - 36) name.setScale((width - 36) / name.width);
      const description = this.addText(card, 18, 75, this.getDescription(meta), hasSave ? 14 : 16, hasSave ? '#68583f' : '#8f816c');
      if (description.width > width - 36) description.setScale((width - 36) / description.width);
      const action = this.addText(card, width - 18, 13, hasSave ? 'REPLACE >' : 'SAVE >', 10, '#8e4d37').setOrigin(1, 0);
      const hit = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0)
        .setOrigin(0).setScrollFactor(0).setInteractive({useHandCursor: true});
      card.add(hit);
      hit.on('pointerover', () => {
        if (this.isSaving) return;
        draw(true);
        action.setColor('#b1492d');
      });
      hit.on('pointerout', () => {draw(false); action.setColor('#8e4d37');});
      hit.on('pointerdown', (pointer, _x, _y, event) => {
        stop(event);
        if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
        if (this.destroyed || !this.isOpen || this.isSaving) return;
        void this.saveToSlot(slotKey);
      });
      this.slotButtons.push({slotKey, card, hit});
    });
    this.setSlotButtonsEnabled(!this.isSaving);
  }
};
