// Compatibility filename. Evidence handover to the lab assistant.
import { EventBus } from '../../EventBus.js';
import { inventoryManager } from '../../managers/InventoryManager.js';
import { analyseEscapeEvidence, getTicketAnalysis, getTicketCaseKey } from '../../managers/TicketAnalysisService.js';
import { hasVisitedApartment } from '../../managers/ApartmentVisitRegistry.js';

export class TicketAnalysisPanel {
  constructor(scene) {
    this.scene = scene;
    this.destroyed = false;
    this.token = {};
    this.caseKey = getTicketCaseKey(scene.gameState);
    this.hud = null;
    this.inventoryButton = null;
    this.highlight = null;
    this.dropLabel = null;
    this.openingInventory = false;
    this.handlingDrop = false;
    this.handleInventoryChanged = () => this.refresh();
    this.handleRequest = request => this.requestDragTarget(request);
    this.handleDrop = drop => this.receiveDrop(drop);
    this.handleMove = drag => this.updateDragHighlight(drag);
    this.handleDragEnd = drag => {
      if (this.matches(drag)) this.hideHighlight();
    };
    this.handleResize = () => this.layout();
    this.handleInactive = () => this.hideHighlight();
  }

  get isOpen() {
    const dialog = this.scene?.assistantDialog;
    return Boolean(dialog?.isOpen() && String(dialog.currentNodeId || '').startsWith('__evidence_'));
  }

  isAvailable() {
    return Boolean(!this.destroyed && this.scene &&
      getTicketCaseKey(this.scene.gameState) === this.caseKey &&
      hasVisitedApartment(this.scene.gameState));
  }

  canReceive() {
    const scene = this.scene;
    return Boolean(this.isAvailable() && scene.sys.isActive() &&
      scene.currentView === 'lab_intro' && !scene.uiLocked && !scene.isExitingLab &&
      !scene.assistantDialog?.isOpen() && !this.handlingDrop);
  }

  create() {
    if (this.destroyed) return;
    const scene = this.scene;
    scene.assistantDialog.extension = this;
    EventBus.on('inventoryUpdated', this.handleInventoryChanged, this);
    EventBus.on('inventory:request-drag-target', this.handleRequest, this);
    EventBus.on('inventory:item-dropped', this.handleDrop, this);
    EventBus.on('inventory:drag-moved', this.handleMove, this);
    EventBus.on('inventory:drag-ended', this.handleDragEnd, this);
    scene.scale.on('resize', this.handleResize, this);
    scene.events.on('pause', this.handleInactive, this);
    scene.events.on('sleep', this.handleInactive, this);
    if (this.isAvailable()) {
      // Copy the configuration: never mutate the shared onboarding preset.
      scene.labOnboarding = {
        ...scene.labOnboarding, assistantPresent: true,
        backgroundKey: 'crimelab_point_assistant'
      };
      if (scene.labView) {
        scene.labView.backgroundKeys.lab_intro = 'crimelab_point_assistant';
        scene.labView.showView(scene.currentView);
      }
      if (!scene.assistantHotspot) scene.createAssistantHotspot();
      this.createControls();
      void this.ensureInventoryHud();
    }
    this.refresh();
  }

  createControls() {
    const scene = this.scene;
    this.highlight = scene.add.rectangle(0, 0, 230, 410, 0x39ff14, 0.10)
      .setOrigin(0).setStrokeStyle(3, 0x39ff14, 0.9)
      .setScrollFactor(0).setDepth(65).setVisible(false);
    this.dropLabel = scene.add.text(0, 0, 'Give evidence', {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#b9ff8f',
      backgroundColor: '#07111b', padding: { x: 8, y: 5 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(66).setVisible(false);
    this.inventoryButton = scene.add.text(0, 0, '[ EVIDENCE / INVENTORY ]', {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#fff4c7',
      backgroundColor: '#102632', padding: { x: 12, y: 9 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(225)
      .setInteractive({ useHandCursor: true });
    this.inventoryButton.on('pointerdown', () => { void this.openInventory(); });
    this.inventoryButton.on('pointerover', () => this.inventoryButton?.setColor('#39ff14'));
    this.inventoryButton.on('pointerout', () => this.inventoryButton?.setColor('#fff4c7'));
    this.layout();
  }

  layout() {
    const scene = this.scene;
    if (!scene || this.destroyed) return;
    this.inventoryButton?.setPosition(scene.scale.width / 2, scene.scale.height - 18);
    const bounds = scene.assistantHotspot?.getBounds();
    if (bounds) {
      this.highlight?.setPosition(bounds.x, bounds.y).setSize(bounds.width, bounds.height);
      this.dropLabel?.setPosition(bounds.centerX, Math.max(30, bounds.y - 10));
    }
  }

  async ensureInventoryHud() {
    const scene = this.scene;
    try {
      const hud = await scene.restorePlayerHud();
      if (this.destroyed || this.scene !== scene || !scene.sys.isActive()) return null;
      this.hud = hud;
      hud?.setCurrentGameplayScene('CrimeLabScene');
      if (hud) await hud.ensurePanel('inventoryUI');
      if (this.destroyed || !scene.sys.isActive()) return null;
      if (scene.assistantDialog?.isOpen()) scene.scene.bringToTop();
      return hud;
    } catch (error) {
      console.error('[TicketAnalysisPanel] Inventory HUD unavailable.', error);
      return null;
    }
  }

  async openInventory() {
    if (!this.canReceive() || this.openingInventory) return;
    this.openingInventory = true;
    try {
      const hud = this.hud || await this.ensureInventoryHud();
      if (!this.canReceive() || !hud) return;
      const inventory = await hud.ensurePanel('inventoryUI');
      if (!this.canReceive() || !inventory) return;
      hud.setCurrentGameplayScene('CrimeLabScene');
      hud.closeAllUIPanels();
      hud.scene.bringToTop();
      inventory.open();
    } finally {
      this.openingInventory = false;
    }
  }

  requestDragTarget(request) {
    if (!request || request.targetSceneKey || !this.canReceive()) return;
    if (!inventoryManager.getItem(request.itemId)) return;
    request.targetSceneKey = this.scene.sys.settings.key;
    request.targetToken = this.token;
  }

  matches(data) {
    return Boolean(data && !this.destroyed && data.targetToken === this.token &&
      data.targetSceneKey === this.scene?.sys.settings.key);
  }

  isOverAssistant(data) {
    if (!Number.isFinite(data?.xRatio) || !Number.isFinite(data?.yRatio)) return false;
    const bounds = this.scene.assistantHotspot?.getBounds();
    if (!bounds) return false;
    return bounds.contains(data.xRatio * this.scene.scale.width, data.yRatio * this.scene.scale.height);
  }

  updateDragHighlight(data) {
    if (!this.matches(data) || !this.canReceive()) return;
    this.layout();
    const over = this.isOverAssistant(data);
    this.highlight?.setVisible(true).setFillStyle(0x39ff14, over ? 0.25 : 0.08);
    this.dropLabel?.setVisible(true).setText(over ? 'Release to examine' : 'Give evidence');
  }

  hideHighlight() {
    this.highlight?.setVisible(false);
    this.dropLabel?.setVisible(false);
  }

  receiveDrop(drop) {
    if (!this.matches(drop) || !this.canReceive() || !this.isOverAssistant(drop)) return;
    if (!inventoryManager.getItem(drop.itemId)) return;
    drop.accepted = true;
    this.hideHighlight();
    this.handlingDrop = true;
    try {
      const response = analyseEscapeEvidence(this.scene.cache.json.get('locations'), {
        state: this.scene.gameState, itemId: drop.itemId
      });
      this.showResponse(response.message || 'The analysis could not be completed.');
      this.scene.hud?.refreshFromScene();
    } catch (error) {
      console.error('[TicketAnalysisPanel] Evidence analysis failed.', error);
      this.showResponse('The analysis could not be completed. Your evidence has not been removed.');
    } finally {
      this.handlingDrop = false;
      this.refresh();
    }
  }

  showResponse(text) {
    const scene = this.scene;
    inventoryManager.close();
    const opened = scene.assistantDialog.open({
      dialogue: {
        id: 'lab_evidence_handover', defaultNodeId: '__evidence_result', nodes: {
          __evidence_result: {
            speaker: 'LAB ASSISTANT', text,
            choices: [{ text: 'Thanks. I will take it from here.', action: 'close' }]
          }
        }
      },
      onClose: () => {
        if (this.destroyed || scene.isExitingLab) return;
        scene.applyLock(false);
        this.hud?.scene.bringToTop();
      }
    });
    if (opened) {
      scene.applyLock(true);
      scene.scene.bringToTop();
    }
  }

  augmentChoices(dialog, choices) {
    if (!this.isAvailable()) return choices;
    const root = dialog.dialogue?.defaultNodeId;
    if (String(dialog.currentNodeId).startsWith('__evidence_')) return choices;
    if (dialog.currentNodeId !== root && dialog.currentNodeId !== 'greeting') return choices;
    const result = getTicketAnalysis(this.scene.gameState);
    return [
      { text: 'How do I give you evidence?', action: 'explain_evidence_handover' },
      ...(result?.completed ? [{ text: 'Remind me what you found.', action: 'recall_escape_analysis' }] : []),
      ...choices
    ];
  }

  handleChoice(choice, dialog) {
    if (!['explain_evidence_handover', 'recall_escape_analysis', 'analyse_apartment_ticket'].includes(choice.action)) return false;
    const previousNode = dialog.currentNodeId;
    const result = getTicketAnalysis(this.scene.gameState);
    const text = choice.action === 'recall_escape_analysis' && result?.completed
      ? result.assistantText || (result.airportCode
        ? `The destination code is ${result.airportCode}. It is in your notebook.`
        : result.clueText || 'The finding is in your notebook.')
      : 'Close this conversation, open EVIDENCE / INVENTORY, and drag the object onto me.\n\nOne object at a time. This is a laboratory, not a clearance sale.';
    dialog.dialogue.nodes.__evidence_help = {
      speaker: 'LAB ASSISTANT', text, choices: [
        { text: 'Back to my questions.', next: previousNode },
        { text: 'Let me get the evidence.', action: 'close' }
      ]
    };
    dialog.currentNodeId = '__evidence_help';
    dialog.choicePage = 0;
    dialog.renderCurrentNode();
    return true;
  }

  refresh() {
    if (this.destroyed || !this.scene) return;
    if (this.scene.assistantDialog) this.scene.assistantDialog.extension = this;
    const visible = this.isAvailable() && this.scene.currentView === 'lab_intro';
    this.inventoryButton?.setVisible(visible);
    if (this.inventoryButton?.input) this.inventoryButton.input.enabled = visible && this.canReceive();
    if (!this.canReceive()) this.hideHighlight();
  }

  destroy() {
    if (this.destroyed) return;
    this.hideHighlight();
    this.destroyed = true;
    EventBus.off('inventoryUpdated', this.handleInventoryChanged, this);
    EventBus.off('inventory:request-drag-target', this.handleRequest, this);
    EventBus.off('inventory:item-dropped', this.handleDrop, this);
    EventBus.off('inventory:drag-moved', this.handleMove, this);
    EventBus.off('inventory:drag-ended', this.handleDragEnd, this);
    this.scene?.scale.off('resize', this.handleResize, this);
    this.scene?.events.off('pause', this.handleInactive, this);
    this.scene?.events.off('sleep', this.handleInactive, this);
    if (this.scene?.assistantDialog?.extension === this) this.scene.assistantDialog.extension = null;
    for (const object of [this.inventoryButton, this.highlight, this.dropLabel]) {
      object?.removeAllListeners?.();
      object?.destroy();
    }
    this.hud = null;
    this.scene = null;
    this.token = null;
  }
}