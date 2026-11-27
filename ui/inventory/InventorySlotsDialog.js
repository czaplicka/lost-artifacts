import { dialogueText as __dialogueText, formatDialogueText } from '../../dialogues/DialogueText.js';
import { EventBus } from '../../EventBus.js';
import { getSlotsOverview, buyWithMedals, startEuroPurchase, refreshPaidSlots } from '../../managers/InventorySlotsService.js';
import { EURO_SLOT_PACKS } from '../../config/inventorySlots.js';

const W = 820, H = 580;

// Slot shop window. Works in any scene (inventory window and Agency Store).
export class InventorySlotsDialog {
  constructor(scene, { onClose = null } = {}) {
    this.scene = scene; this.onClose = onClose;
    this.destroyed = false; this.busy = false;
    this.buttons = {}; this.texts = {}; this.euroTexts = [];
    this.blocker = null; this.root = null;
    this.handleUpdated = () => this.refresh();
  }
  label(x, y, value, size, color, pixel = false, originX = 0) {
    const text = this.scene.add.text(x, y, value, {
      fontFamily: pixel ? 'PressStart2P' : 'SpecialElite', fontSize: `${size}px`, color,
      wordWrap: { width: 740 }
    }).setOrigin(originX, 0.5);
    this.root.add(text);
    return text;
  }
  button(key, x, y, w, h, label, onClick) {
    const bg = this.scene.add.rectangle(x, y, w, h, 0x353541).setStrokeStyle(2, 0x6a6070).setInteractive({ useHandCursor: true });
    const text = this.label(x, y, label, 13, '#96909b', true, 0.5);
    bg.on('pointerdown', (pointer, lx, ly, event) => event?.stopPropagation());
    bg.on('pointerup', (pointer, lx, ly, event) => {
      event?.stopPropagation();
      if (pointer?.event?.button > 0) return;
      const entry = this.buttons[key];
      if (!entry?.enabled || this.busy || this.destroyed) return;
      onClick();
    });
    this.root.add(bg); this.root.bringToTop(text);
    this.buttons[key] = { bg, text, enabled: false };
  }
  setButton(key, enabled, label) {
    const entry = this.buttons[key]; if (!entry) return;
    entry.enabled = enabled; entry.text.setText(label).setColor(enabled ? '#7cfc8a' : '#96909b');
    entry.bg.setFillStyle(enabled ? 0x315534 : 0x353541).setStrokeStyle(2, enabled ? 0x7cfc8a : 0x6a6070);
    if (entry.bg.input) entry.bg.input.cursor = enabled ? 'pointer' : 'default';
  }
  open() {
    const scene = this.scene, { width, height } = scene.scale;
    const stop = (pointer, x, y, event) => event?.stopPropagation();
    this.blocker = scene.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0)
      .setDepth(4999).setScrollFactor(0).setInteractive();
    this.blocker.on('pointerdown', stop); this.blocker.on('pointerup', stop);
    const scale = Math.min(1, (width - 24) / W, (height - 24) / H);
    this.root = scene.add.container(width / 2, height / 2).setDepth(5000).setScrollFactor(0).setScale(scale);
    const panel = scene.add.rectangle(0, 0, W, H, 0x15111c, 1).setStrokeStyle(3, 0xd4af37).setInteractive();
    panel.on('pointerdown', stop); panel.on('pointerup', stop);
    this.root.add(panel);
    const left = -W / 2 + 36;
    this.label(left, -250, __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_fb563776a892d1e9bf7a"), 22, '#d4af37', true);
    this.texts.capacity = this.label(left, -200, '', 20, '#e6d5a8');
    this.texts.medals = this.label(left, -168, '', 18, '#e6d5a8');
    this.label(left, -120, __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_c2225dfc6e3b6e2cab84"), 13, '#d4af37', true);
    this.texts.medalOffer = this.label(left, -80, '', 20, '#e6d5a8');
    this.button('medal', 270, -80, 170, 44, __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_d9af1a8284a08c971023"), () => {
      const result = buyWithMedals(); this.setMessage(result.message, result.ok); this.refresh();
    });
    this.texts.medalHint = this.label(left, -44, '', 15, '#bcaeaa');
    this.label(left, 8, __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_c9025d273a8d365477d9"), 13, '#d4af37', true);
    EURO_SLOT_PACKS.forEach((pack, index) => {
      const y = 52 + index * 56;
      this.euroTexts.push(this.label(left, y, '', 20, '#e6d5a8'));
      this.button(`euro-${pack.id}`, 270, y, 170, 44, __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_d9af1a8284a08c971023"), async () => {
        this.busy = true;
        try {
          const result = await startEuroPurchase(pack.id);
          if (!this.destroyed) this.setMessage(result.message, result.ok);
        } catch (error) {
          console.error('[InventorySlots] Euro purchase failed:', error);
          if (!this.destroyed) this.setMessage(__dialogueText("ui/inventory/InventorySlotsDialog.js", "t_693c3c0f7aa6ab6388a1"), false);
        } finally {
          this.busy = false;
          if (!this.destroyed) { await refreshPaidSlots(); this.refresh(); }
        }
      });
    });
    this.texts.paid = this.label(left, 166, '', 15, '#bcaeaa');
    this.texts.message = this.label(left, 206, '', 18, '#e6d5a8');
    this.button('close', 0, 256, 220, 44, __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_f13a1ed0cf3c4197ec8f"), () => this.destroy());
    EventBus.on('inventoryUpdated', this.handleUpdated);
    this.refresh();
    refreshPaidSlots().then(() => this.refresh());
  }
  setMessage(message, ok) {
    if (this.destroyed || !this.texts.message?.active) return;
    this.texts.message.setText(message || '').setColor(ok ? '#7cfc8a' : '#ff9c9c');
  }
  refresh() {
    if (this.destroyed || !this.root?.active) return;
    const overview = getSlotsOverview();
    this.texts.capacity.setText(formatDialogueText(__dialogueText("ui/inventory/InventorySlotsDialog.js", "t_6cf55bfccc94379d0d0a"), { current: overview.capacity.current, max: overview.capacity.max }));
    this.texts.medals.setText(formatDialogueText(__dialogueText("ui/inventory/InventorySlotsDialog.js", "t_6e66b25a0cfbacf53894"), { count: overview.medals }));
    const offer = overview.medalOffer;
    if (offer) {
      this.texts.medalOffer.setText(formatDialogueText(__dialogueText("ui/inventory/InventorySlotsDialog.js", "t_a9d44e5d38ea9f317c3a"), { slots: offer.slots, medals: offer.medals }));
      this.texts.medalHint.setText(offer.affordable ? '' : __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_f2bbe3800837b3327e0e"));
      this.setButton('medal', offer.affordable, __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_d9af1a8284a08c971023"));
    } else {
      this.texts.medalOffer.setText(__dialogueText("ui/inventory/InventorySlotsDialog.js", "t_a11f63d8c30c343396c2"));
      this.texts.medalHint.setText('');
      this.setButton('medal', false, __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_2d9c014a222db12a1897"));
    }
    overview.euroPacks.forEach((pack, index) => {
      this.euroTexts[index]?.setText((pack.slots === 1 ? formatDialogueText(__dialogueText("ui/inventory/InventorySlotsDialog.js", "t_ceaff41adeec07cec918"), { slots: pack.slots, price: pack.priceEur }) : formatDialogueText(__dialogueText("ui/inventory/InventorySlotsDialog.js", "t_4a7766b7ebc7a5135497"), { slots: pack.slots, price: pack.priceEur })));
      const label = pack.state === 'available' ? __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_d9af1a8284a08c971023") : pack.state === 'max' ? __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_2d9c014a222db12a1897") : __dialogueText("ui/inventory/InventorySlotsDialog.js", "t_89e764ff25c80883ad0a");
      this.setButton(`euro-${pack.id}`, pack.state === 'available', label);
    });
    this.texts.paid.setText(formatDialogueText(__dialogueText("ui/inventory/InventorySlotsDialog.js", "t_5520ed979a5f80923f69"), { owned: overview.paidSlots, max: overview.euroMax }));
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    EventBus.off('inventoryUpdated', this.handleUpdated);
    this.root?.destroy(true); this.blocker?.destroy();
    this.root = null; this.blocker = null; this.buttons = {}; this.texts = {}; this.euroTexts = [];
    const callback = this.onClose; this.onClose = null; callback?.();
  }
}
