// scenes/DialogueDemoScene.js
// Sandbox for the dialogue system. Shows the full wiring you need in a real scene:
//   1) configure() the hooks (money, evidence items, flags, energy)
//   2) register NPC data
//   3) new DialoguePanel(this)
//   4) panel.talk('npcId', { onClose })
//
// If your scenes are registered differently, drop the constructor and use your own key.

import { BaseScene } from './BaseScene.js';
import { DialoguePanel } from '../ui/DialoguePanel.js';
import { dialogueManager } from '../managers/DialogueManager.js';
import { registerAllDialogues } from '../config/DialogueNPCs.js';

export class DialogueDemoScene extends BaseScene {
  constructor() {
    super('DialogueDemoScene');
  }

  create() {
    super.create();

    const W = this.scale.width;
    const H = this.scale.height;
    const s = H / 720;

    this.add.rectangle(0, 0, W, H, 0x0d0a06).setOrigin(0).setDepth(-100);

    // ---- fake game state (replace with your real GameState / inventory) ----
    this.money = 60;
    this.items = [
      { id: 'black_hair', label: 'Black hair (evidence bag)' },
      { id: 'museum_ticket', label: 'Torn lecture ticket' },
      { id: 'coin', label: 'Suspicious coin' },
    ];

    // ---- 1) hooks ----
    dialogueManager.configure({
      getEvidenceItems: () => this.items,
      getMoney: () => this.money,
      changeMoney: (d) => { this.money = Math.max(0, this.money + d); this._refreshHud(); },
      changeEnergy: (d) => this._log(`energy ${d > 0 ? '+' : ''}${d}`),
      giveItem: (id) => { if (!this.items.find((i) => i.id === id)) this.items.push({ id, label: id }); },
      getItemLabel: (id) => id,
    });
    dialogueManager.setVars({ player: 'Detective' });

    // ---- 2) NPC data ----
    registerAllDialogues(dialogueManager);

    // ---- 3) panel ----
    this.dialogue = new DialoguePanel(this, { showTrustNumber: true });

    // ---- UI of the sandbox ----
    this.hud = this.add.text(20 * s, 16 * s, '', {
      fontFamily: '"Press Start 2P", monospace', fontSize: `${10 * s}px`, color: '#d4af37',
    });
    this.logText = this.add.text(W - 20 * s, 16 * s, '', {
      fontFamily: '"Special Elite", "Courier New", monospace', fontSize: `${13 * s}px`,
      color: '#8fb3c9', align: 'right',
    }).setOrigin(1, 0);
    this.logLines = [];

    const npcs = [
      ['holly', 'TALK: HOLLY (dream)'],
      ['csi_dex', 'TALK: DEX (CSI lab)'],
      ['curator_pemberton', 'TALK: DR. PEMBERTON (alibi)'],
    ];
    npcs.forEach(([id, label], i) => this._makeButton(40 * s, (90 + i * 56) * s, label, id, s));

    this.add.text(40 * s, 290 * s,
      'Tip: try POLITE vs PUSHY on Pemberton. Then ask "That is a beautiful vase."\nFlip to EVIDENCE and show him the hair.',
      {
        fontFamily: '"Special Elite", "Courier New", monospace', fontSize: `${15 * s}px`,
        color: '#9c8f6b', lineSpacing: 6 * s,
      });

    // ---- events from dialogues ----
    const off = dialogueManager.on('*', (name, data) => {
      if (name.startsWith('dialogue:') && name !== 'dialogue:close' && name !== 'dialogue:walkout') return;
      this._log(`${name} ${data && data.topicId ? data.topicId : ''}`.trim());
    });
    this.events.once('shutdown', off);

    this._refreshHud();
  }

  _makeButton(x, y, label, npcId, s) {
    const w = 420 * s;
    const h = 40 * s;
    const bg = this.add.rectangle(x, y, w, h, 0x2a2012).setOrigin(0)
      .setStrokeStyle(2, 0x7d6620).setInteractive({ useHandCursor: true });
    this.add.text(x + w / 2, y + h / 2, label, {
      fontFamily: '"Press Start 2P", monospace', fontSize: `${10 * s}px`, color: '#d4af37',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x3d2f14));
    bg.on('pointerout', () => bg.setFillStyle(0x2a2012));
    bg.on('pointerdown', () => {
      if (this.dialogue.isOpen) return;
      this.dialogue.talk(npcId, {
        onClose: (summary) => {
          this._log(`closed: ${summary.npcId} (${summary.endedBy}), trust ${summary.trust} / ${summary.level}`);
          this._refreshHud();
        },
      });
    });
  }

  _refreshHud() {
    this.hud.setText(`MONEY $${this.money}`);
  }

  _log(msg) {
    this.logLines.push(msg);
    if (this.logLines.length > 12) this.logLines.shift();
    this.logText.setText(this.logLines.join('\n'));
  }
}