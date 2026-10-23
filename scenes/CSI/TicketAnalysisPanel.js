import { EventBus } from '../../EventBus.js';
import { analyseCaseTicket, findCaseTicket, getTicketAnalysis } from '../../managers/TicketAnalysisService.js';

export class TicketAnalysisPanel {
  constructor(scene) {
    this.scene = scene;
    this.button = null;
    this.buttonBg = null;
    this.buttonLabel = null;
    this.modal = null;
    this.isOpen = false;
    this.previousLock = false;
    this.destroyed = false;
    this.handleInventoryChanged = () => this.refresh();
    this.handleResize = () => this.layout();
  }
  create() {
    const scene = this.scene;
    this.button = scene.add.container(0, 0).setDepth(300);
    this.buttonBg = scene.add.rectangle(0, 0, 300, 58, 0x173b40)
      .setStrokeStyle(2, 0x39ff14).setInteractive({ useHandCursor: true });
    this.buttonLabel = scene.add.text(0, 0, '', {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#fff4c7', align: 'center'
    }).setOrigin(0.5);
    this.button.add([this.buttonBg, this.buttonLabel]);
    this.buttonBg.on('pointerdown', () => this.analyse());
    EventBus.on('inventoryUpdated', this.handleInventoryChanged, this);
    scene.scale.on('resize', this.handleResize);
    this.layout(); this.refresh();
  }
  layout() {
    if (this.destroyed) return;
    this.button?.setPosition(this.scene.scale.width / 2, this.scene.scale.height - 120);
  }
  refresh() {
    if (this.destroyed || !this.button) return;
    const scene = this.scene;
    const visible = scene.currentView === 'lab_intro';
    this.button.setVisible(visible);
    const usable = visible && !scene.uiLocked && !scene.isExitingLab && !this.isOpen;
    if (this.buttonBg.input) this.buttonBg.input.enabled = usable;
    const done = getTicketAnalysis(scene.gameState)?.completed === true;
    const found = Boolean(findCaseTicket(scene.gameState));
    this.buttonLabel.setText(done ? 'Review ticket analysis' : found ? 'Analyse damaged ticket' : 'Ticket analysis — bring evidence');
    this.button.setAlpha(usable ? 1 : 0.55);
  }
  analyse() {
    const scene = this.scene;
    if (this.destroyed || this.isOpen || scene.uiLocked || scene.isExitingLab || !scene.sys.isActive()) return;
    const response = analyseCaseTicket(scene.cache.json.get('locations'), { state: scene.gameState });
    scene.hud?.refreshFromScene();
    this.showResult(response.ok
      ? `Recovered destination airport code:\n\n${response.result.airportCode}\n\nRecorded in your notebook.\nPursuit unlocked. Choose your journey when ready.`
      : response.message);
  }
  showResult(message) {
    const scene = this.scene;
    this.previousLock = scene.uiLocked;
    this.isOpen = true;
    scene.applyLock(true);
    const { width, height } = scene.scale;
    const w = Math.min(650, width - 30), h = Math.min(390, height - 30);
    this.modal = scene.add.container(width / 2, height / 2).setDepth(10000);
    this.modal.add(scene.add.rectangle(0, 0, width, height, 0x000000, 0.8).setInteractive());
    this.modal.add(scene.add.rectangle(0, 0, w, h, 0x071b25).setStrokeStyle(3, 0x39ff14).setInteractive());
    this.modal.add(scene.add.text(0, -h / 2 + 24, 'DOCUMENT ANALYSIS', {
      fontFamily: 'PressStart2P', fontSize: '14px', color: '#39ff14'
    }).setOrigin(0.5, 0));
    this.modal.add(scene.add.text(0, -15, message, {
      fontFamily: 'SpecialElite', fontSize: '22px', color: '#fff4c7',
      align: 'center', wordWrap: { width: w - 50 }
    }).setOrigin(0.5));
    const bg = scene.add.rectangle(0, h / 2 - 40, 230, 46, 0x173b40)
      .setStrokeStyle(2, 0x39ff14).setInteractive({ useHandCursor: true });
    this.modal.add([bg, scene.add.text(0, h / 2 - 40, 'Stay in the lab', {
      fontFamily: 'SpecialElite', fontSize: '21px', color: '#fff4c7'
    }).setOrigin(0.5)]);
    bg.on('pointerdown', () => this.close());
  }
  close() {
    this.modal?.destroy(true); this.modal = null; this.isOpen = false;
    if (!this.destroyed && !this.scene.isExitingLab && this.scene.labRunToken) this.scene.applyLock(this.previousLock);
    this.refresh();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    EventBus.off('inventoryUpdated', this.handleInventoryChanged, this);
    this.scene?.scale?.off('resize', this.handleResize);
    this.modal?.destroy(true); this.button?.destroy(true);
    this.modal = this.button = this.buttonBg = this.buttonLabel = null;
    this.isOpen = false; this.scene = null;
  }
}
