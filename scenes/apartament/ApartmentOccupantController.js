import { gameState } from '../../GameData.js';
import { inventoryManager } from '../../managers/InventoryManager.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getEvidenceCaseKey, evidenceMatchesCase, readApartmentEvidence } from '../../managers/ApartmentEvidenceModel.js';
import { generateApartmentOccupant, createOccupantProgress, confrontApartmentOccupant } from './ApartmentOccupantData.js';

export class ApartmentOccupantController {
  constructor(scene) {
    this.scene = scene; this.root = null; this.button = null;
    this.statementIndex = 0; this.itemIndex = 0; this.notice = '';
    this.caseKey = getEvidenceCaseKey(gameState);
    this.occupant = generateApartmentOccupant({ caseKey: this.caseKey,
      missionId: scene.missionId, suspectId: scene.suspectId, effect: scene.apartmentEffect });
  }
  installEvidence() {
    if (!this.occupant) return;
    const config = this.scene.apartmentConfig;
    const evidence = this.occupant.evidence;
    if (config.objects.some(o => o.unlocks?.some(i => i.id === evidence.id))) return;
    const host = config.objects.find(o => o.state !== 'locked' && !o.unlocks?.some(i => i.isArtifact));
    if (!host) throw new Error('[ApartmentOccupant] No accessible evidence host.');
    host.unlocks = [...(host.unlocks || []), evidence];
    const old = this.scene.getObjectProgress(host.id);
    if (old && !this.scene.hasItemAlready(evidence.id)) {
      this.scene.onObjectStateChanged(host.id, { ...old, contentsCollected: false,
        collectedIds: (old.collectedIds || []).filter(id => id !== evidence.id) });
    }
  }
  isCurrent() { return this.caseKey === getEvidenceCaseKey(gameState); }
  readProgress() {
    const saved = this.scene.getProgress().occupantInterview;
    return saved?.caseKey === this.caseKey && saved?.occupantId === this.occupant.id
      ? saved : createOccupantProgress(this.occupant);
  }
  mount() {
    if (!this.occupant) return;
    const s = this.scene;
    this.button = s.add.text(s.scale.width - 12, 118, `[ TALK: ${this.occupant.role.toUpperCase()} ]`, {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffe0a0', backgroundColor: '#30251e',
      padding: { x: 10, y: 10 }
    }).setOrigin(1, 0).setDepth(150).setInteractive({ useHandCursor: true });
    this.button.on('pointerdown', () => this.open());
    this.onResize = () => {
      this.button?.setPosition(s.scale.width - 12, 118);
      if (this.root) this.render();
    };
    s.scale.on('resize', this.onResize);
  }
  items() {
    return inventoryManager.getAllItems().filter(item =>
      item.metadata?.apartment && evidenceMatchesCase(item, gameState, { allowLegacy: false })
    ).map(item => readApartmentEvidence(item));
  }
  open() {
    const s = this.scene;
    if (!this.isCurrent() || s.isTransitioning || s.leaveDialog || !this.occupant) return;
    inventoryManager.close();
    const hud = s.getPlayerHudScene();
    hud?.closeAllUIPanels();
    this.host = hud?.sys?.isActive() ? hud : s;
    if (this.host === hud) { hud.scene.setVisible(true); hud.scene.bringToTop(); }
    this.notice = ''; this.render();
  }
  render() {
    this.close();
    if (!this.isCurrent()) return;
    const s = this.host, { width, height } = s.scale;
    const w = Math.max(160, Math.min(720, width - 20));
    const h = Math.max(180, Math.min(650, height - 20));
    const root = s.add.container(width / 2, height / 2).setDepth(65000).setScrollFactor(0);
    this.root = root; this.scene.leaveDialog = root;
    root.add(s.add.rectangle(0, 0, width, height, 0x000000, 0.86).setInteractive());
    root.add(s.add.rectangle(0, 0, w, h, 0x241b16).setStrokeStyle(2, 0xcba564).setInteractive());
    const text = (value, x, y, tw, th, size = 19, color = '#f3e4cc') => {
      const t = s.add.text(x, y, value, { fontFamily: 'SpecialElite', fontSize: `${size}px`, color,
        wordWrap: { width: tw }, align: 'left' });
      while (t.height > th && parseInt(t.style.fontSize, 10) > 10) t.setFontSize(parseInt(t.style.fontSize, 10) - 1);
      root.add(t); return t;
    };
    const btn = (label, x, y, cb) => {
      const t = text(label, x, y, w - 32, 32, 17, '#ffe0a0');
      t.setInteractive({ useHandCursor: true }); t.on('pointerdown', cb); return t;
    };
    const left = -w / 2 + 16, top = -h / 2;
    const p = this.readProgress();
    text(`${this.occupant.role.toUpperCase()} — INTERVIEW`, left, top + 12, w - 32, 30, 22, '#ffd17d');
    btn('[ Close ]', w / 2 - 90, top + 42, () => this.close());
    text(this.occupant.introduction, left, top + 72, w - 32, h * 0.12);
    if (p.solved) {
      text(this.occupant.confrontation.confession, left, top + h * 0.30, w - 32, h * 0.27);
      text(`NEW LEAD — NOT YET VERIFIED\n${p.lead.text}`, left, top + h * 0.62, w - 32, h * 0.30, 19, '#d9edb2');
      return;
    }
    const statements = this.occupant.statements;
    this.statementIndex = (this.statementIndex + statements.length) % statements.length;
    text(`STATEMENT ${this.statementIndex + 1}/${statements.length}`, left, top + h * 0.25, w - 32, 22, 15, '#ffd17d');
    text(statements[this.statementIndex].text, left, top + h * 0.30, w - 32, h * 0.15);
    btn('[ Previous ]', left, top + h * 0.46, () => { this.statementIndex--; this.notice = ''; this.render(); });
    btn('[ Next ]', 20, top + h * 0.46, () => { this.statementIndex++; this.notice = ''; this.render(); });
    const items = this.items();
    this.itemIndex = items.length ? (this.itemIndex + items.length) % items.length : 0;
    const item = items[this.itemIndex];
    text(item ? `ITEM ${this.itemIndex + 1}/${items.length}: ${item.label || item.name}` : 'No apartment evidence in your inventory. Keep searching.', left, top + h * 0.54, w - 32, h * 0.07, 17, '#ffd17d');
    text(item?.description || '', left, top + h * 0.62, w - 32, h * 0.12, 16);
    btn('[ Previous item ]', left, top + h * 0.75, () => { this.itemIndex--; this.render(); });
    btn('[ Next item ]', 20, top + h * 0.75, () => { this.itemIndex++; this.render(); });
    btn('[ PRESENT EVIDENCE ]', left, top + h * 0.82, () => this.present(statements[this.statementIndex].id, item?.id));
    text(this.notice, left, top + h * 0.90, w - 32, h * 0.08, 15);
  }
  present(statementId, inventoryId) {
    if (!this.isCurrent()) { this.close(); return; }
    const real = inventoryId ? inventoryManager.getItem(inventoryId) : null;
    if (!real || !real.metadata?.apartment || !evidenceMatchesCase(real, gameState, { allowLegacy: false })) {
      this.notice = 'Choose an item you currently have.'; this.render(); return;
    }
    const result = confrontApartmentOccupant(this.occupant, this.readProgress(), statementId, readApartmentEvidence(real));
    if (result.progress) this.scene.updateProgress({ occupantInterview: result.progress });
    if (result.ok && !result.repeated) {
      const lead = this.occupant.lead;
      gameState.addClue({ id: lead.id, type: 'apartment', category: 'apartment', key: lead.id,
        value: 'Occupant testimony: artefact lead', text: lead.text,
        missionId: this.scene.missionId, cityId: this.scene.cityId,
        source: 'apartment_occupant', status: 'unverified', isEscapeClue: false });
      requestAutosave();
    }
    this.notice = result.message; this.render();
  }
  close() {
    if (this.root && this.scene.leaveDialog === this.root) this.scene.leaveDialog = null;
    this.root?.destroy(true); this.root = null;
  }
  destroy() {
    this.close(); this.button?.destroy(); this.button = null;
    if (this.onResize) this.scene.scale.off('resize', this.onResize);
  }
}
export default ApartmentOccupantController;
