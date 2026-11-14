import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
// Evidence handover uses the existing Inventory entry in the bottom player menu.
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
    this.highlight = null;
    this.dropLabel = null;
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
    if (scene.assistantDialog) scene.assistantDialog.extension = this;
    EventBus.on('inventoryUpdated', this.handleInventoryChanged, this);
    EventBus.on('inventory:request-drag-target', this.handleRequest, this);
    EventBus.on('inventory:item-dropped', this.handleDrop, this);
    EventBus.on('inventory:drag-moved', this.handleMove, this);
    EventBus.on('inventory:drag-ended', this.handleDragEnd, this);
    scene.scale.on('resize', this.handleResize, this);
    scene.events.on('pause', this.handleInactive, this);
    scene.events.on('sleep', this.handleInactive, this);
    if (this.isAvailable()) {
      scene.labOnboarding = {
        ...scene.labOnboarding, assistantPresent: true,
        backgroundKey: 'crimelab_point_assistant'
      };
      if (scene.labView) {
        scene.labView.backgroundKeys.lab_intro = 'crimelab_point_assistant';
        scene.labView.showView(scene.currentView);
      }
      if (!scene.assistantHotspot) scene.createAssistantHotspot();
      this.createDropFeedback();
      void this.ensureInventoryHud();
    }
    this.refresh();
  }

  createDropFeedback() {
    const scene = this.scene;
    this.highlight = scene.add.rectangle(0, 0, 230, 410, 0x39ff14, 0.10)
      .setOrigin(0).setStrokeStyle(3, 0x39ff14, 0.9)
      .setScrollFactor(0).setDepth(65).setVisible(false);
    this.dropLabel = scene.add.text(0, 0, __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_3986d462fb7b06a2550e"), {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#b9ff8f',
      backgroundColor: '#07111b', padding: { x: 8, y: 5 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(66).setVisible(false);
    this.layout();
  }

  layout() {
    const scene = this.scene;
    if (!scene || this.destroyed) return;
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
    this.dropLabel?.setVisible(true).setText(over ? __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_35f2c27c9e9304882b79") : __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_3986d462fb7b06a2550e"));
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
      this.showResponse(response.message || __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_0c5047746ac0b05a26ed"));
      this.scene.hud?.refreshFromScene();
    } catch (error) {
      console.error('[TicketAnalysisPanel] Evidence analysis failed.', error);
      this.showResponse(__dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_743330d6bada1491601e"));
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
        id: 'lab_evidence_handover', defaultNodeId: __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_d898fd4e9b9ae1e0f3a1"), nodes: {
          __evidence_result: {
            speaker: __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_c8e3674bd53680fa2602"), text,
            choices: [{ text: __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_20e38c3b4104e4667d70"), action: __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_310ff200149b44a32f12") }]
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
      { text: __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_47a20bb6a10f7b957781"), action: 'explain_evidence_handover' },
      ...(result?.completed ? [{ text: __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_b6981849adb26511243b"), action: 'recall_escape_analysis' }] : []),
      ...choices
    ];
  }

  handleChoice(choice, dialog) {
    if (!['explain_evidence_handover', 'recall_escape_analysis', 'analyse_apartment_ticket'].includes(choice.action)) return false;
    const previousNode = dialog.currentNodeId;
    const result = getTicketAnalysis(this.scene.gameState);
    const text = choice.action === 'recall_escape_analysis' && result?.completed
      ? result.assistantText || (result.airportCode
        ? `${__dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_2fb1322f5ec14ca05b00")}${result.airportCode}${__dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_4d89da235d17af27e347")}`
        : result.clueText || __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_a5f81b08249bfa2a9d69"))
      : __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_7502628f73850203f726");
    dialog.dialogue.nodes.__evidence_help = {
      speaker: __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_c8e3674bd53680fa2602"), text, choices: [
        { text: __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_db162f05a084e8bd8cda"), next: previousNode },
        { text: __dialogueText("scenes/CSI/TicketAnalysisPanelBase.js", "t_00cba3949ff20084cc70"), action: 'close' }
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
    for (const object of [this.highlight, this.dropLabel]) {
      object?.removeAllListeners?.();
      object?.destroy();
    }
    this.hud = null;
    this.scene = null;
    this.token = null;
  }
}