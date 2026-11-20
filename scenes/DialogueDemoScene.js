import { BaseScene } from './BaseScene.js';
import { DialoguePanel } from '../ui/DialoguePanel.js';
import { DialogueManager } from '../managers/DialogueManager.js';
import {
  DIALOGUE_EVIDENCE_IDS,
  registerAllDialogues
} from '../config/DialogueNPCs.js';

export class DialogueDemoScene extends BaseScene {
  constructor() {
    super('DialogueDemoScene');
  }

  create() {
    super.create();
    const W = this.scale.width;
    const H = this.scale.height;
    const s = H / 720;

    this.add.rectangle(0, 0, W, H, 0x0d0a06)
      .setOrigin(0).setDepth(-100);

    this.money = 60;
    this.items = [
      { id: DIALOGUE_EVIDENCE_IDS.BLACK_HAIR, label: 'Black hair (evidence bag)' },
      { id: DIALOGUE_EVIDENCE_IDS.MUSEUM_TICKET, label: 'Torn lecture ticket' },
      { id: DIALOGUE_EVIDENCE_IDS.COIN, label: 'Antique coin' }
    ];
    this.logLines = [];

    this.hud = this.add.text(20 * s, 16 * s, '', {
      fontFamily: 'PressStart2P', fontSize: `${10 * s}px`, color: '#d4af37'
    });
    this.logText = this.add.text(W - 20 * s, 16 * s, '', {
      fontFamily: 'SpecialElite', fontSize: `${13 * s}px`,
      color: '#8fb3c9', align: 'right'
    }).setOrigin(1, 0);

    this.demoManager = new DialogueManager();
    this.demoManager.configure({
      getEvidenceItems: () => this.items,
      getMoney: () => this.money,
      changeMoney: delta => {
        if (this.money + delta < 0) return { ok: false };
        this.money += delta;
        this._refreshHud();
        return { ok: true };
      },
      changeEnergy: delta => this._log(`energy ${delta > 0 ? '+' : ''}${delta}`),
      giveItem: id => {
        if (!this.items.some(item => item.id === id)) {
          this.items.push({ id, label: id });
        }
      },
      getItemLabel: id => id
    });
    this.demoManager.setVars({ player: 'Detective' });
    registerAllDialogues(this.demoManager);

    this.dialogue = new DialoguePanel(this, {
      manager: this.demoManager,
      showTrustNumber: true
    });

    [
      ['holly', 'TALK: HOLLY (dream)'],
      ['csi_dex', 'TALK: DEX (CSI lab)'],
      ['curator_pemberton', 'TALK: DR. PEMBERTON (alibi)']
    ].forEach(([id, label], index) => {
      this._makeButton(40 * s, (90 + index * 56) * s, label, id, s);
    });

    this.add.text(40 * s, 290 * s,
      'Try POLITE vs PUSHY on Pemberton. Repeated questions give no extra tone bonus.\nFlip to EVIDENCE to test the catalog IDs. Holly reads the current main-story stage.', {
        fontFamily: 'SpecialElite', fontSize: `${15 * s}px`,
        color: '#9c8f6b', lineSpacing: 6 * s
      });

    this._demoOff = this.demoManager.on('*', (data, name) => {
      if (name.startsWith('dialogue:') &&
          !['dialogue:close', 'dialogue:walkout'].includes(name)) return;
      this._log(`${name} ${data?.topicId || ''}`.trim());
    });

    this.events.once('shutdown', this._disposeDemo, this);
    this.events.once('destroy', this._disposeDemo, this);
    this._refreshHud();
  }

  _disposeDemo() {
    this._demoOff?.();
    this._demoOff = null;
    this.dialogue?.destroy();
    this.dialogue = null;
    this.demoManager = null;
    this.events.off('shutdown', this._disposeDemo, this);
    this.events.off('destroy', this._disposeDemo, this);
  }

  _makeButton(x, y, label, npcId, s) {
    const w = 420 * s;
    const h = 40 * s;
    const bg = this.add.rectangle(x, y, w, h, 0x2a2012)
      .setOrigin(0).setStrokeStyle(2, 0x7d6620)
      .setInteractive({ useHandCursor: true });

    this.add.text(x + w / 2, y + h / 2, label, {
      fontFamily: 'PressStart2P', fontSize: `${10 * s}px`, color: '#d4af37'
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x3d2f14));
    bg.on('pointerout', () => bg.setFillStyle(0x2a2012));
    bg.on('pointerdown', () => {
      if (!this.dialogue || this.dialogue.isOpen) return;
      this.dialogue.talk(npcId, {
        onClose: summary => {
          this._log(`closed: ${summary.npcId} (${summary.endedBy}), trust ${summary.trust} / ${summary.level}`);
          this._refreshHud();
        }
      });
    });
  }

  _refreshHud() {
    this.hud?.setText(`MONEY $${this.money}`);
  }

  _log(message) {
    this.logLines.push(message);
    if (this.logLines.length > 12) this.logLines.shift();
    this.logText?.setText(this.logLines.join('\n'));
  }
}
